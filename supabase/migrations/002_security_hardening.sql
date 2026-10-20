-- Ajoute les protections de sécurité sans réécrire la migration historique 001.
begin;

-- Stocke le rôle applicatif dans le profil, jamais dans une donnée contrôlée par le navigateur.
alter table public.profiles add column if not exists role text not null default 'user';
-- Restreint les rôles aux valeurs utilisées par le contrôle d’accès applicatif.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_role_check') then
    alter table public.profiles add constraint profiles_role_check check (role in ('user', 'premium', 'admin'));
  end if;
end;
$$;

-- Expose le rôle courant via une fonction SECURITY DEFINER qui évite la récursion RLS.
create or replace function public.current_user_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;
-- N’autorise l’appel du helper de rôle qu’aux utilisateurs authentifiés.
revoke all on function public.current_user_role() from public, anon;
grant execute on function public.current_user_role() to authenticated, service_role;

-- Empêche un utilisateur de modifier son propre rôle tout en conservant l’édition de son profil.
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id and role = public.current_user_role());
-- Autorise uniquement un administrateur à modifier les rôles applicatifs.
create policy profiles_admin_update on public.profiles
  for update using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- Bloque les anciens chemins de crédit appelables directement depuis un JWT utilisateur.
revoke all on function public.check_credits(uuid, numeric) from public, anon, authenticated;
revoke all on function public.deduct_credits(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.check_credits(uuid, numeric) to service_role;
grant execute on function public.deduct_credits(uuid, text, integer) to service_role;

-- Réserve de façon atomique et idempotente les crédits avant un appel fournisseur.
create or replace function public.reserve_credits(p_user_id uuid, p_idempotency_key text, p_estimated_amount numeric, p_run_id uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  existing_operation public.credit_operations;
  operation_id uuid;
  available numeric;
  requested_amount numeric := greatest(coalesce(p_estimated_amount, 0), 0);
begin
  if p_user_id is null or p_idempotency_key is null or length(trim(p_idempotency_key)) < 8 then
    raise exception 'INVALID_CREDIT_OPERATION' using errcode = 'P0001';
  end if;
  -- Une éventuelle exposition accidentelle aux utilisateurs reste limitée à leur propre compte.
  if auth.role() = 'authenticated' and auth.uid() is distinct from p_user_id then
    raise exception 'CREDIT_OWNER_MISMATCH' using errcode = 'P0001';
  end if;
  -- Le verrou sérialise les reprises concurrentes portant la même clé logique.
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
  -- Le verrou de ligne empêche deux réservations de dépenser le même solde disponible.
  select balance - reserved_credits into available
  from public.credits where user_id = p_user_id for update;
  if available is null or available < requested_amount then
    raise exception 'INSUFFICIENT_CREDITS' using errcode = 'P0001';
  end if;
  insert into public.credit_operations(user_id, run_id, idempotency_key, estimated_amount, state)
    values (p_user_id, p_run_id, p_idempotency_key, requested_amount, 'RESERVED')
    returning id into operation_id;
  update public.credits
    set reserved_credits = reserved_credits + requested_amount, updated_at = now()
    where user_id = p_user_id;
  return operation_id;
end;
$$;

-- Finalise une réservation au coût réel et rend automatiquement la différence disponible.
create or replace function public.complete_credits(p_operation_id uuid, p_final_amount numeric)
returns numeric language plpgsql security definer set search_path = public as $$
declare
  operation public.credit_operations;
  balance_after numeric;
  final_cost numeric := greatest(coalesce(p_final_amount, 0), 0);
begin
  select * into operation from public.credit_operations where id = p_operation_id for update;
  if operation.id is null then raise exception 'CREDIT_OPERATION_NOT_FOUND' using errcode = 'P0001'; end if;
  if operation.state = 'COMPLETED' then
    select balance into balance_after from public.credits where user_id = operation.user_id;
    return balance_after;
  end if;
  if operation.state not in ('RESERVED', 'PROCESSING') then
    raise exception 'CREDIT_OPERATION_NOT_PROCESSABLE' using errcode = 'P0001';
  end if;
  select balance into balance_after from public.credits where user_id = operation.user_id for update;
  if balance_after is null or balance_after < final_cost then
    raise exception 'INSUFFICIENT_CREDITS_FINAL' using errcode = 'P0001';
  end if;
  update public.credits
    set reserved_credits = reserved_credits - operation.estimated_amount,
        balance = balance - final_cost,
        consumed_credits = consumed_credits + final_cost,
        updated_at = now()
    where user_id = operation.user_id
    returning balance into balance_after;
  update public.credit_operations
    set final_amount = final_cost, state = 'COMPLETED', updated_at = now()
    where id = p_operation_id;
  insert into public.credit_transactions(user_id, amount, type, reference_id)
    values (operation.user_id, -final_cost, 'chat_usage', operation.id::text);
  return balance_after;
end;
$$;

-- Libère une réservation exactement une fois après un échec avant finalisation.
create or replace function public.refund_credits(p_operation_id uuid, p_reason text)
returns numeric language plpgsql security definer set search_path = public as $$
declare
  operation public.credit_operations;
  balance_after numeric;
begin
  select * into operation from public.credit_operations where id = p_operation_id for update;
  if operation.id is null then raise exception 'CREDIT_OPERATION_NOT_FOUND' using errcode = 'P0001'; end if;
  if operation.state = 'FAILED' then
    select balance into balance_after from public.credits where user_id = operation.user_id;
    return balance_after;
  end if;
  if operation.state = 'COMPLETED' then raise exception 'CREDIT_OPERATION_ALREADY_COMPLETED' using errcode = 'P0001'; end if;
  if operation.state not in ('RESERVED', 'PROCESSING') then raise exception 'CREDIT_OPERATION_NOT_REFUNDABLE' using errcode = 'P0001'; end if;
  update public.credits
    set reserved_credits = reserved_credits - operation.estimated_amount,
        refunded_credits = refunded_credits + operation.estimated_amount,
        updated_at = now()
    where user_id = operation.user_id
    returning balance into balance_after;
  update public.credit_operations set state = 'FAILED', updated_at = now() where id = p_operation_id;
  insert into public.credit_transactions(user_id, amount, type, reference_id)
    values (operation.user_id, 0, 'adjustment', left(coalesce(p_reason, 'provider_failure'), 200));
  return balance_after;
end;
$$;

-- Ces RPC sont internes au backend et ne doivent jamais être invoquées par le navigateur.
revoke all on function public.reserve_credits(uuid, text, numeric, uuid) from public, anon, authenticated;
revoke all on function public.complete_credits(uuid, numeric) from public, anon, authenticated;
revoke all on function public.refund_credits(uuid, text) from public, anon, authenticated;
grant execute on function public.reserve_credits(uuid, text, numeric, uuid) to service_role;
grant execute on function public.complete_credits(uuid, numeric) to service_role;
grant execute on function public.refund_credits(uuid, text) to service_role;

-- Table de rate limiting atomique pour les endpoints sensibles côté serveur.
create table if not exists public.rate_limit_windows (
  key text primary key,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now()
);
alter table public.rate_limit_windows enable row level security;

-- Incrémente une fenêtre sous verrou et retourne si la requête est autorisée.
create or replace function public.consume_rate_limit(p_key text, p_window_seconds integer, p_limit integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  current_window public.rate_limit_windows;
  allowed boolean;
begin
  if p_key is null or p_window_seconds <= 0 or p_limit <= 0 then return false; end if;
  insert into public.rate_limit_windows(key, window_started_at, request_count)
    values (p_key, now(), 0) on conflict (key) do nothing;
  select * into current_window from public.rate_limit_windows where key = p_key for update;
  if now() >= current_window.window_started_at + make_interval(secs => p_window_seconds) then
    update public.rate_limit_windows set window_started_at = now(), request_count = 1, updated_at = now() where key = p_key;
    return true;
  end if;
  allowed := current_window.request_count < p_limit;
  if allowed then
    update public.rate_limit_windows set request_count = request_count + 1, updated_at = now() where key = p_key;
  end if;
  return allowed;
end;
$$;
revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;

-- Renforce les index utiles aux contrôles d’appartenance et aux opérations de crédit.
create index if not exists credits_user_id_idx on public.credits(user_id);
create index if not exists credit_operations_user_state_idx on public.credit_operations(user_id, state, created_at desc);
create index if not exists payments_tx_id_idx on public.payments(tx_id);

commit;


-- Crédite Stripe, Campay ou CinetPay après validation du webhook et déduplique tx_id.
create or replace function public.credit_payment_v2(p_user_id uuid, p_tx_id text, p_amount integer, p_method text)
returns numeric language plpgsql security definer set search_path = public as $$
declare
  balance_after numeric;
begin
  if p_user_id is null or p_tx_id is null or length(trim(p_tx_id)) < 3 then raise exception 'INVALID_PAYMENT_REFERENCE' using errcode = 'P0001'; end if;
  if p_amount < 4900 then raise exception 'INVALID_PAYMENT_AMOUNT' using errcode = 'P0001'; end if;
  if p_method not in ('stripe', 'campay', 'cinetpay') then raise exception 'INVALID_PAYMENT_METHOD' using errcode = 'P0001'; end if;
  if exists(select 1 from public.payments where tx_id = p_tx_id) then
    select balance into balance_after from public.credits where user_id = p_user_id;
    return balance_after;
  end if;
  insert into public.profiles(id) values (p_user_id) on conflict do nothing;
  insert into public.credits(user_id, balance, total_used) values (p_user_id, 0, 0) on conflict do nothing;
  insert into public.payments(user_id, amount, method, status, tx_id) values (p_user_id, p_amount, p_method, 'successful', p_tx_id);
  update public.credits set balance = balance + 10000, updated_at = now() where user_id = p_user_id returning balance into balance_after;
  insert into public.credit_transactions(user_id, amount, type, reference_id) values (p_user_id, 10000, 'payment', p_tx_id);
  return balance_after;
end;
$$;
revoke all on function public.credit_payment_v2(uuid, text, integer, text) from public, anon, authenticated;
grant execute on function public.credit_payment_v2(uuid, text, integer, text) to service_role;
