begin;

-- Les champs Auth restent dans auth.users; le profil métier ne garde que les
-- informations nécessaires à l’espace PrismAI. Aucun mot de passe n’est stocké ici.
alter table public.profiles
  add column if not exists referral_code text;

-- Le bonus quotidien est une allocation distincte du portefeuille permanent.
-- Une ligne par utilisateur et par date locale permet l’expiration sans cumul.
create table if not exists public.daily_credit_quotas (
  user_id uuid not null references public.profiles(id) on delete cascade,
  quota_date date not null,
  granted_credits numeric(14,2) not null default 100 check (granted_credits >= 0),
  reserved_credits numeric(14,2) not null default 0 check (reserved_credits >= 0),
  consumed_credits numeric(14,2) not null default 0 check (consumed_credits >= 0),
  created_at timestamptz not null default now(),
  primary key (user_id, quota_date),
  constraint daily_credit_quotas_usage_lte_grant
    check (reserved_credits + consumed_credits <= granted_credits)
);

create index if not exists daily_credit_quotas_date_idx
  on public.daily_credit_quotas(quota_date, user_id);

alter table public.daily_credit_quotas enable row level security;
revoke all on table public.daily_credit_quotas from public, anon, authenticated;
grant all on table public.daily_credit_quotas to service_role;

-- Une réservation IA conserve la provenance de chaque part jusqu’à son règlement.
-- Les réservations déjà ouvertes par les migrations précédentes proviennent du
-- portefeuille; le backfill conserve donc le comportement historique.
alter table public.credit_operations
  add column if not exists daily_quota_date date,
  add column if not exists reserved_daily_amount numeric(14,2) not null default 0 check (reserved_daily_amount >= 0),
  add column if not exists reserved_wallet_amount numeric(14,2) not null default 0 check (reserved_wallet_amount >= 0);

alter table public.credit_operations
  drop constraint if exists credit_operations_daily_date_required;
alter table public.credit_operations
  add constraint credit_operations_daily_date_required
  check (reserved_daily_amount = 0 or daily_quota_date is not null);

update public.credit_operations
set reserved_wallet_amount = estimated_amount
where state in ('RESERVED', 'PROCESSING')
  and reserved_daily_amount = 0
  and reserved_wallet_amount = 0;

-- Remet en cohérence le compteur historique avec les réservations du portefeuille.
update public.credits c
set reserved_credits = coalesce((
  select sum(o.reserved_wallet_amount)
  from public.credit_operations o
  where o.user_id = c.user_id and o.state in ('RESERVED', 'PROCESSING')
), 0),
updated_at = now();

-- Ajoute un type de journal pour les allocations quotidiennes.
alter table public.credit_transactions
  drop constraint if exists credit_transactions_type_check;
alter table public.credit_transactions
  add constraint credit_transactions_type_check
  check (type in ('signup_bonus', 'payment', 'chat_usage', 'image_usage', 'adjustment', 'daily_refill'));

-- Le bonus d’inscription de 300 crédits est permanent et séparé des quotas quotidiens.
-- Le quota de 100 n’est créé qu’à partir du jour local suivant l’inscription.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, referral_code)
  values (
    new.id,
    new.email,
    nullif(btrim(coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name')), ''),
    nullif(btrim(new.raw_user_meta_data->>'referral_code'), '')
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(public.profiles.display_name, excluded.display_name),
        referral_code = coalesce(public.profiles.referral_code, excluded.referral_code),
        updated_at = now();

  insert into public.credits (user_id, balance, total_used)
  values (new.id, 300, 0)
  on conflict (user_id) do nothing;

  insert into public.credit_transactions (user_id, amount, type, reference_id)
  values (new.id, 300, 'signup_bonus', 'signup');

  return new;
end;
$$;

-- Matérialise une allocation uniquement si le compte existait avant minuit
-- Africa/Douala. Le conflit sur la clé primaire rend la création idempotente.
create or replace function public.ensure_daily_credit_quota(p_user_id uuid, p_quota_date date)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_user_id uuid;
begin
  if p_user_id is null or p_quota_date is null then
    return false;
  end if;

  insert into public.daily_credit_quotas (user_id, quota_date, granted_credits)
  select p.id, p_quota_date, 100
  from public.profiles p
  where p.id = p_user_id
    and p.created_at < (p_quota_date::timestamp at time zone 'Africa/Douala')
  on conflict (user_id, quota_date) do nothing
  returning user_id into inserted_user_id;

  if inserted_user_id is null then
    return false;
  end if;

  insert into public.credit_transactions (user_id, amount, type, reference_id)
  values (inserted_user_id, 100, 'daily_refill', p_quota_date::text);

  return true;
end;
$$;

-- La tâche planifiée crée les allocations à minuit. La même fonction est appelée
-- à la demande par les RPC de crédits pour rattraper un job manqué sans doublon.
create or replace function public.grant_daily_credit_quotas()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  current_local_date date := timezone('Africa/Douala', now())::date;
  local_day_start timestamptz;
  inserted_count integer;
begin
  local_day_start := current_local_date::timestamp at time zone 'Africa/Douala';

  with inserted as (
    insert into public.daily_credit_quotas (user_id, quota_date, granted_credits)
    select p.id, current_local_date, 100
    from public.profiles p
    where p.created_at < local_day_start
    on conflict (user_id, quota_date) do nothing
    returning user_id
  )
  insert into public.credit_transactions (user_id, amount, type, reference_id)
  select user_id, 100, 'daily_refill', current_local_date::text
  from inserted;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

-- Solde disponible = portefeuille permanent moins ses réservations, plus le
-- reliquat du quota du jour local. Les dates précédentes ne sont jamais reportées.
create or replace function public.available_credits(p_user_id uuid)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  current_local_date date := timezone('Africa/Douala', now())::date;
  wallet_available numeric;
  daily_available numeric;
begin
  perform public.ensure_daily_credit_quota(p_user_id, current_local_date);

  select greatest(c.balance - c.reserved_credits, 0)
  into wallet_available
  from public.credits c
  where c.user_id = p_user_id;

  select greatest(q.granted_credits - q.reserved_credits - q.consumed_credits, 0)
  into daily_available
  from public.daily_credit_quotas q
  where q.user_id = p_user_id and q.quota_date = current_local_date;

  return coalesce(wallet_available, 0) + coalesce(daily_available, 0);
end;
$$;

create or replace function public.check_credits(p_user_id uuid, p_estimated_cost numeric)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return coalesce(public.available_credits(p_user_id), 0) >= greatest(coalesce(p_estimated_cost, 0), 0);
end;
$$;

-- Réserve d’abord les crédits quotidiens (ils expirent), puis le portefeuille
-- permanent. Toutes les modifications sont sérialisées par verrou de ligne.
create or replace function public.reserve_credits(
  p_user_id uuid,
  p_idempotency_key text,
  p_estimated_amount numeric,
  p_run_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_operation public.credit_operations;
  operation_id uuid;
  current_local_date date := timezone('Africa/Douala', now())::date;
  requested_amount numeric := greatest(coalesce(p_estimated_amount, 0), 0);
  wallet_available numeric;
  daily_available numeric := 0;
  reserved_daily numeric := 0;
  reserved_wallet numeric := 0;
begin
  if p_user_id is null or p_idempotency_key is null or length(trim(p_idempotency_key)) < 8 then
    raise exception 'INVALID_CREDIT_OPERATION' using errcode = 'P0001';
  end if;
  if auth.role() = 'authenticated' and auth.uid() is distinct from p_user_id then
    raise exception 'CREDIT_OWNER_MISMATCH' using errcode = 'P0001';
  end if;

  select * into existing_operation
  from public.credit_operations
  where user_id = p_user_id and idempotency_key = p_idempotency_key
  for update;

  if existing_operation.id is not null then
    if existing_operation.estimated_amount <> requested_amount
       or existing_operation.run_id is distinct from p_run_id then
      raise exception 'IDEMPOTENCY_KEY_CONFLICT' using errcode = 'P0001';
    end if;
    return existing_operation.id;
  end if;

  perform public.ensure_daily_credit_quota(p_user_id, current_local_date);

  select c.balance - c.reserved_credits
  into wallet_available
  from public.credits c
  where c.user_id = p_user_id
  for update;

  if wallet_available is null then
    raise exception 'INSUFFICIENT_CREDITS' using errcode = 'P0001';
  end if;

  select q.granted_credits - q.reserved_credits - q.consumed_credits
  into daily_available
  from public.daily_credit_quotas q
  where q.user_id = p_user_id and q.quota_date = current_local_date
  for update;

  daily_available := greatest(coalesce(daily_available, 0), 0);
  if wallet_available + daily_available < requested_amount then
    raise exception 'INSUFFICIENT_CREDITS' using errcode = 'P0001';
  end if;

  reserved_daily := least(requested_amount, daily_available);
  reserved_wallet := requested_amount - reserved_daily;

  insert into public.credit_operations (
    user_id, run_id, idempotency_key, estimated_amount, state,
    daily_quota_date, reserved_daily_amount, reserved_wallet_amount
  )
  values (
    p_user_id, p_run_id, p_idempotency_key, requested_amount, 'RESERVED',
    case when reserved_daily > 0 then current_local_date else null end,
    reserved_daily, reserved_wallet
  )
  returning id into operation_id;

  if reserved_daily > 0 then
    update public.daily_credit_quotas
    set reserved_credits = reserved_credits + reserved_daily
    where user_id = p_user_id and quota_date = current_local_date;
  end if;

  if reserved_wallet > 0 then
    update public.credits
    set reserved_credits = reserved_credits + reserved_wallet,
        updated_at = now()
    where user_id = p_user_id;
  end if;

  return operation_id;
end;
$$;

-- Finalise la réservation. Un reliquat quotidien rendu après minuit reste dans
-- son ancienne date et expire; il n’est jamais ajouté à la nouvelle allocation.
create or replace function public.complete_credits(p_operation_id uuid, p_final_amount numeric)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  operation public.credit_operations;
  wallet_row public.credits;
  final_cost numeric := greatest(coalesce(p_final_amount, 0), 0);
  current_local_date date := timezone('Africa/Douala', now())::date;
  total_reserved numeric;
  extra_amount numeric;
  wallet_available numeric;
  daily_available numeric := 0;
  extra_daily numeric := 0;
  extra_wallet numeric := 0;
  used_daily_reserved numeric := 0;
  used_wallet_reserved numeric := 0;
  wallet_to_charge numeric := 0;
begin
  select * into operation
  from public.credit_operations
  where id = p_operation_id
  for update;

  if operation.id is null then
    raise exception 'CREDIT_OPERATION_NOT_FOUND' using errcode = 'P0001';
  end if;

  if operation.state = 'COMPLETED' then
    return public.available_credits(operation.user_id);
  end if;
  if operation.state not in ('RESERVED', 'PROCESSING') then
    raise exception 'CREDIT_OPERATION_NOT_PROCESSABLE' using errcode = 'P0001';
  end if;

  perform public.ensure_daily_credit_quota(operation.user_id, current_local_date);

  select * into wallet_row
  from public.credits
  where user_id = operation.user_id
  for update;

  if wallet_row.user_id is null
     or wallet_row.reserved_credits < operation.reserved_wallet_amount then
    raise exception 'CREDIT_RESERVATION_INCONSISTENT' using errcode = 'P0001';
  end if;

  if operation.reserved_daily_amount > 0 then
    perform 1
    from public.daily_credit_quotas q
    where q.user_id = operation.user_id and q.quota_date = operation.daily_quota_date
    for update;
    if not found then
      raise exception 'CREDIT_RESERVATION_INCONSISTENT' using errcode = 'P0001';
    end if;
  end if;

  total_reserved := operation.reserved_daily_amount + operation.reserved_wallet_amount;
  extra_amount := greatest(final_cost - total_reserved, 0);

  -- Un dépassement d’estimation peut utiliser le quota du jour de départ, mais
  -- jamais le quota du lendemain pour une génération lancée la veille.
  if extra_amount > 0 then
    if operation.daily_quota_date = current_local_date then
      select q.granted_credits - q.reserved_credits - q.consumed_credits
      into daily_available
      from public.daily_credit_quotas q
      where q.user_id = operation.user_id and q.quota_date = current_local_date
      for update;
      extra_daily := least(extra_amount, greatest(coalesce(daily_available, 0), 0));
    end if;

    extra_wallet := extra_amount - extra_daily;
    wallet_available := wallet_row.balance - wallet_row.reserved_credits;
    if wallet_available < extra_wallet then
      raise exception 'INSUFFICIENT_CREDITS_FINAL' using errcode = 'P0001';
    end if;
  end if;

  if final_cost <= total_reserved then
    used_daily_reserved := least(final_cost, operation.reserved_daily_amount);
    used_wallet_reserved := final_cost - used_daily_reserved;
  else
    used_daily_reserved := operation.reserved_daily_amount;
    used_wallet_reserved := operation.reserved_wallet_amount;
  end if;

  if operation.reserved_daily_amount > 0 then
    update public.daily_credit_quotas
    set reserved_credits = reserved_credits - operation.reserved_daily_amount,
        consumed_credits = consumed_credits + used_daily_reserved + extra_daily
    where user_id = operation.user_id and quota_date = operation.daily_quota_date;
  elsif extra_daily > 0 then
    update public.daily_credit_quotas
    set consumed_credits = consumed_credits + extra_daily
    where user_id = operation.user_id and quota_date = current_local_date;
  end if;

  wallet_to_charge := used_wallet_reserved + extra_wallet;
  update public.credits
  set reserved_credits = reserved_credits - operation.reserved_wallet_amount,
      balance = balance - wallet_to_charge,
      consumed_credits = consumed_credits + final_cost,
      updated_at = now()
  where user_id = operation.user_id;

  update public.credit_operations
  set final_amount = final_cost, state = 'COMPLETED', updated_at = now()
  where id = p_operation_id;

  insert into public.credit_transactions (user_id, amount, type, reference_id)
  values (operation.user_id, -final_cost, 'chat_usage', operation.id::text);

  return public.available_credits(operation.user_id);
end;
$$;

-- Libère les deux compartiments séparément après un échec fournisseur.
create or replace function public.refund_credits(p_operation_id uuid, p_reason text)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  operation public.credit_operations;
  wallet_reserved numeric;
begin
  select * into operation
  from public.credit_operations
  where id = p_operation_id
  for update;

  if operation.id is null then
    raise exception 'CREDIT_OPERATION_NOT_FOUND' using errcode = 'P0001';
  end if;
  if operation.state = 'FAILED' then
    return public.available_credits(operation.user_id);
  end if;
  if operation.state = 'COMPLETED' then
    raise exception 'CREDIT_OPERATION_ALREADY_COMPLETED' using errcode = 'P0001';
  end if;
  if operation.state not in ('RESERVED', 'PROCESSING') then
    raise exception 'CREDIT_OPERATION_NOT_REFUNDABLE' using errcode = 'P0001';
  end if;

  select reserved_credits into wallet_reserved
  from public.credits
  where user_id = operation.user_id
  for update;

  if wallet_reserved is null or wallet_reserved < operation.reserved_wallet_amount then
    raise exception 'CREDIT_RESERVATION_INCONSISTENT' using errcode = 'P0001';
  end if;

  if operation.reserved_daily_amount > 0 then
    perform 1
    from public.daily_credit_quotas q
    where q.user_id = operation.user_id and q.quota_date = operation.daily_quota_date
    for update;
    if not found then
      raise exception 'CREDIT_RESERVATION_INCONSISTENT' using errcode = 'P0001';
    end if;

    update public.daily_credit_quotas
    set reserved_credits = reserved_credits - operation.reserved_daily_amount
    where user_id = operation.user_id and quota_date = operation.daily_quota_date;
  end if;

  update public.credits
  set reserved_credits = reserved_credits - operation.reserved_wallet_amount,
      refunded_credits = refunded_credits + operation.estimated_amount,
      updated_at = now()
  where user_id = operation.user_id;

  update public.credit_operations
  set state = 'FAILED', updated_at = now()
  where id = p_operation_id;

  insert into public.credit_transactions (user_id, amount, type, reference_id)
  values (operation.user_id, 0, 'adjustment', left(coalesce(p_reason, 'provider_failure'), 200));

  return public.available_credits(operation.user_id);
end;
$$;

-- Maintient les anciens appels internes compatibles avec le quota du jour.
create or replace function public.deduct_credits(p_user_id uuid, p_model text, p_tokens integer)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  rate numeric;
  cost numeric;
  operation_id uuid;
begin
  rate := case
    when lower(coalesce(p_model, '')) like '%openrouter%' then 2
    when lower(coalesce(p_model, '')) like '%mistral%' then 1.5
    when lower(coalesce(p_model, '')) like '%image%' then 50
    else 1
  end;
  cost := case
    when lower(coalesce(p_model, '')) like '%image%' then 50
    else ceil(greatest(coalesce(p_tokens, 0), 0) / 1000.0) * rate
  end;

  operation_id := public.reserve_credits(p_user_id, 'legacy-deduct-' || gen_random_uuid()::text, cost, null);
  return public.complete_credits(operation_id, cost);
end;
$$;

-- Le retour des paiements existants expose aussi le quota quotidien disponible,
-- sans changer le montant qui est versé dans le portefeuille permanent.
create or replace function public.credit_payment_v2(
  p_user_id uuid,
  p_tx_id text,
  p_amount integer,
  p_method text
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null or p_tx_id is null or length(trim(p_tx_id)) < 3 then
    raise exception 'INVALID_PAYMENT_REFERENCE' using errcode = 'P0001';
  end if;
  if p_amount < 4900 then
    raise exception 'INVALID_PAYMENT_AMOUNT' using errcode = 'P0001';
  end if;
  if p_method not in ('stripe', 'campay', 'cinetpay') then
    raise exception 'INVALID_PAYMENT_METHOD' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.payments where tx_id = p_tx_id) then
    return public.available_credits(p_user_id);
  end if;

  insert into public.profiles (id) values (p_user_id) on conflict do nothing;
  insert into public.credits (user_id, balance, total_used) values (p_user_id, 0, 0) on conflict do nothing;
  insert into public.payments (user_id, amount, method, status, tx_id)
  values (p_user_id, p_amount, p_method, 'successful', p_tx_id);
  update public.credits
  set balance = balance + 10000, updated_at = now()
  where user_id = p_user_id;
  insert into public.credit_transactions (user_id, amount, type, reference_id)
  values (p_user_id, 10000, 'payment', p_tx_id);

  return public.available_credits(p_user_id);
end;
$$;

-- Ces fonctions et allocations ne sont pas directement lisibles ou modifiables
-- depuis un JWT navigateur. Le backend utilise exclusivement service_role.
revoke all on function public.ensure_daily_credit_quota(uuid, date) from public, anon, authenticated;
revoke all on function public.grant_daily_credit_quotas() from public, anon, authenticated;
revoke all on function public.available_credits(uuid) from public, anon, authenticated;
revoke all on function public.check_credits(uuid, numeric) from public, anon, authenticated;
revoke all on function public.deduct_credits(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.reserve_credits(uuid, text, numeric, uuid) from public, anon, authenticated;
revoke all on function public.complete_credits(uuid, numeric) from public, anon, authenticated;
revoke all on function public.refund_credits(uuid, text) from public, anon, authenticated;
revoke all on function public.credit_payment_v2(uuid, text, integer, text) from public, anon, authenticated;

grant execute on function public.ensure_daily_credit_quota(uuid, date) to service_role;
grant execute on function public.grant_daily_credit_quotas() to service_role;
grant execute on function public.available_credits(uuid) to service_role;
grant execute on function public.check_credits(uuid, numeric) to service_role;
grant execute on function public.deduct_credits(uuid, text, integer) to service_role;
grant execute on function public.reserve_credits(uuid, text, numeric, uuid) to service_role;
grant execute on function public.complete_credits(uuid, numeric) to service_role;
grant execute on function public.refund_credits(uuid, text) to service_role;
grant execute on function public.credit_payment_v2(uuid, text, integer, text) to service_role;

commit;
