create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.credits (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  balance numeric(14,2) not null default 0 check (balance >= 0),
  total_used numeric(14,2) not null default 0 check (total_used >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(14,2) not null,
  type text not null check (type in ('signup_bonus','payment','chat_usage','image_usage','adjustment')),
  model_used text,
  reference_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null check (amount > 0),
  method text not null default 'campay',
  status text not null check (status in ('pending','successful','failed')),
  tx_id text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'Nouvelle conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('system','user','assistant','tool')),
  content text not null,
  provider_used text,
  tokens integer not null default 0 check (tokens >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete cascade,
  object_key text not null unique,
  file_name text not null,
  content_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.provider_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  request_id text,
  status text not null,
  latency_ms integer,
  error_code text,
  created_at timestamptz not null default now()
);

create index if not exists credit_transactions_user_created_idx on public.credit_transactions(user_id, created_at desc);
create index if not exists conversations_user_updated_idx on public.conversations(user_id, updated_at desc);
create index if not exists messages_conversation_created_idx on public.messages(conversation_id, created_at);
create index if not exists payments_user_created_idx on public.payments(user_id, created_at desc);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email) on conflict (id) do nothing;
  insert into public.credits (user_id, balance, total_used) values (new.id, 10000, 0) on conflict (user_id) do nothing;
  insert into public.credit_transactions (user_id, amount, type) values (new.id, 10000, 'signup_bonus') on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.check_credits(p_user_id uuid, p_estimated_cost numeric)
returns boolean language sql security definer set search_path = public as $$
  select exists(select 1 from public.credits where user_id = p_user_id and balance >= greatest(p_estimated_cost, 0));
$$;

create or replace function public.deduct_credits(p_user_id uuid, p_model text, p_tokens integer)
returns numeric language plpgsql security definer set search_path = public as $$
declare
  rate numeric;
  cost numeric;
  current_balance numeric;
begin
  rate := case
    when lower(p_model) like '%openrouter%' then 2
    when lower(p_model) like '%mistral%' then 1.5
    when lower(p_model) like '%image%' then 50
    else 1
  end;
  cost := case when lower(p_model) like '%image%' then 50 else ceil(greatest(p_tokens, 0) / 1000.0) * rate end;
  select balance into current_balance from public.credits where user_id = p_user_id for update;
  if current_balance is null or current_balance < cost then
    raise exception 'INSUFFICIENT_CREDITS' using errcode = 'P0001';
  end if;
  update public.credits set balance = balance - cost, total_used = total_used + cost, updated_at = now() where user_id = p_user_id;
  insert into public.credit_transactions(user_id, amount, type, model_used) values (p_user_id, -cost, case when lower(p_model) like '%image%' then 'image_usage' else 'chat_usage' end, p_model);
  return current_balance - cost;
end;
$$;

create or replace function public.credit_payment(p_user_id uuid, p_tx_id text, p_amount integer)
returns numeric language plpgsql security definer set search_path = public as $$
declare
  balance_after numeric;
begin
  if p_amount < 4900 then raise exception 'INVALID_PAYMENT_AMOUNT' using errcode = 'P0001'; end if;
  if exists(select 1 from public.payments where tx_id = p_tx_id) then
    select balance into balance_after from public.credits where user_id = p_user_id;
    return balance_after;
  end if;
  insert into public.payments(user_id, amount, method, status, tx_id) values (p_user_id, p_amount, 'campay', 'successful', p_tx_id);
  insert into public.profiles(id) values (p_user_id) on conflict do nothing;
  insert into public.credits(user_id, balance, total_used) values (p_user_id, 0, 0) on conflict do nothing;
  update public.credits set balance = balance + 10000, updated_at = now() where user_id = p_user_id returning balance into balance_after;
  insert into public.credit_transactions(user_id, amount, type, reference_id) values (p_user_id, 10000, 'payment', p_tx_id);
  return balance_after;
end;
$$;

grant execute on function public.check_credits(uuid, numeric) to authenticated, service_role;
grant execute on function public.deduct_credits(uuid, text, integer) to authenticated, service_role;
grant execute on function public.credit_payment(uuid, text, integer) to service_role;

alter table public.profiles enable row level security;
alter table public.credits enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.payments enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.attachments enable row level security;
alter table public.provider_events enable row level security;

create policy profiles_select_own on public.profiles for select using (auth.uid() = id);
create policy profiles_update_own on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy credits_select_own on public.credits for select using (auth.uid() = user_id);
create policy transactions_select_own on public.credit_transactions for select using (auth.uid() = user_id);
create policy payments_select_own on public.payments for select using (auth.uid() = user_id);
create policy conversations_own on public.conversations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy messages_own on public.messages for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy attachments_own on public.attachments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Extension de l’unité 2 : tenancy, runs, ledger crédits et Evidence append-only.
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

alter table public.credits add column if not exists monthly_credits numeric(14,2) not null default 0;
alter table public.credits add column if not exists additional_credits numeric(14,2) not null default 0;
alter table public.credits add column if not exists reserved_credits numeric(14,2) not null default 0;
alter table public.credits add column if not exists consumed_credits numeric(14,2) not null default 0;
alter table public.credits add column if not exists refunded_credits numeric(14,2) not null default 0;

create table if not exists public.runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  idempotency_key text not null,
  capability text not null check (capability in ('TEXT','CODE','IMAGE','VIDEO','DOCUMENT','AGENT','SEARCH')),
  complexity text not null check (complexity in ('LOW','MEDIUM','HIGH')),
  state text not null default 'CREATED' check (state in ('CREATED','RESERVED','PROCESSING','COMPLETED','FAILED','CANCELLED')),
  provider text,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create table if not exists public.run_events (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs(id) on delete cascade,
  sequence integer not null check (sequence >= 0),
  event_type text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  unique (run_id, sequence)
);

create table if not exists public.credit_operations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  run_id uuid references public.runs(id) on delete set null,
  idempotency_key text not null,
  estimated_amount numeric(14,2) not null check (estimated_amount >= 0),
  final_amount numeric(14,2) not null default 0 check (final_amount >= 0),
  state text not null default 'CREATED' check (state in ('CREATED','RESERVED','PROCESSING','COMPLETED','FAILED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create table if not exists public.evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  run_id uuid references public.runs(id) on delete set null,
  claim text not null,
  status text not null check (status in ('OBSERVED','PROPOSED','UNVERIFIED')),
  source text not null,
  authority text not null,
  coverage text not null,
  limitations jsonb not null default '[]'::jsonb,
  parent_id uuid references public.evidence(id) on delete restrict,
  content_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists runs_user_created_idx on public.runs(user_id, created_at desc);
create index if not exists run_events_run_sequence_idx on public.run_events(run_id, sequence);
create index if not exists evidence_user_created_idx on public.evidence(user_id, created_at desc);

create or replace function public.reserve_credits(p_user_id uuid, p_idempotency_key text, p_estimated_amount numeric, p_run_id uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  operation_id uuid;
  available numeric;
begin
  select id into operation_id from public.credit_operations where user_id = p_user_id and idempotency_key = p_idempotency_key;
  if operation_id is not null then return operation_id; end if;
  select balance - reserved_credits into available from public.credits where user_id = p_user_id for update;
  if available is null or available < greatest(p_estimated_amount, 0) then raise exception 'INSUFFICIENT_CREDITS' using errcode = 'P0001'; end if;
  insert into public.credit_operations(user_id, run_id, idempotency_key, estimated_amount, state) values (p_user_id, p_run_id, p_idempotency_key, greatest(p_estimated_amount, 0), 'RESERVED') returning id into operation_id;
  update public.credits set reserved_credits = reserved_credits + greatest(p_estimated_amount, 0), updated_at = now() where user_id = p_user_id;
  return operation_id;
end;
$$;

create or replace function public.complete_credits(p_operation_id uuid, p_final_amount numeric)
returns numeric language plpgsql security definer set search_path = public as $$
declare
  operation public.credit_operations;
  balance_after numeric;
  delta numeric;
begin
  select * into operation from public.credit_operations where id = p_operation_id for update;
  if operation.id is null then raise exception 'CREDIT_OPERATION_NOT_FOUND' using errcode = 'P0001'; end if;
  if operation.state = 'COMPLETED' then select balance into balance_after from public.credits where user_id = operation.user_id; return balance_after; end if;
  if operation.state not in ('RESERVED','PROCESSING') then raise exception 'CREDIT_OPERATION_NOT_PROCESSABLE' using errcode = 'P0001'; end if;
  delta := greatest(p_final_amount, 0) - operation.estimated_amount;
  update public.credits set reserved_credits = greatest(reserved_credits - operation.estimated_amount, 0), balance = balance - greatest(p_final_amount, 0), consumed_credits = consumed_credits + greatest(p_final_amount, 0), updated_at = now() where user_id = operation.user_id returning balance into balance_after;
  if balance_after is null or balance_after < 0 then raise exception 'INSUFFICIENT_CREDITS_FINAL' using errcode = 'P0001'; end if;
  update public.credit_operations set final_amount = greatest(p_final_amount, 0), state = 'COMPLETED', updated_at = now() where id = p_operation_id;
  insert into public.credit_transactions(user_id, amount, type, reference_id) values (operation.user_id, -greatest(p_final_amount, 0), 'chat_usage', operation.id::text);
  return balance_after;
end;
$$;

create or replace function public.refund_credits(p_operation_id uuid, p_reason text)
returns numeric language plpgsql security definer set search_path = public as $$
declare
  operation public.credit_operations;
  balance_after numeric;
begin
  select * into operation from public.credit_operations where id = p_operation_id for update;
  if operation.id is null then raise exception 'CREDIT_OPERATION_NOT_FOUND' using errcode = 'P0001'; end if;
  if operation.state = 'FAILED' then select balance into balance_after from public.credits where user_id = operation.user_id; return balance_after; end if;
  if operation.state not in ('RESERVED','PROCESSING') then raise exception 'CREDIT_OPERATION_NOT_REFUNDABLE' using errcode = 'P0001'; end if;
  update public.credits set reserved_credits = greatest(reserved_credits - operation.estimated_amount, 0), refunded_credits = refunded_credits + operation.estimated_amount, updated_at = now() where user_id = operation.user_id returning balance into balance_after;
  update public.credit_operations set state = 'FAILED', updated_at = now() where id = p_operation_id;
  insert into public.credit_transactions(user_id, amount, type, reference_id) values (operation.user_id, 0, 'adjustment', p_reason);
  return balance_after;
end;
$$;

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.runs enable row level security;
alter table public.run_events enable row level security;
alter table public.credit_operations enable row level security;
alter table public.evidence enable row level security;

create policy organization_members_select_own on public.organization_members for select using (auth.uid() = user_id);
create policy organizations_member_select on public.organizations for select using (exists (select 1 from public.organization_members m where m.organization_id = id and m.user_id = auth.uid()));
create policy runs_own on public.runs for select using (auth.uid() = user_id);
create policy run_events_own on public.run_events for select using (exists (select 1 from public.runs r where r.id = run_id and r.user_id = auth.uid()));
create policy credit_operations_own on public.credit_operations for select using (auth.uid() = user_id);
create policy evidence_own on public.evidence for select using (auth.uid() = user_id);

grant execute on function public.reserve_credits(uuid, text, numeric, uuid) to service_role;
grant execute on function public.complete_credits(uuid, numeric) to service_role;
grant execute on function public.refund_credits(uuid, text) to service_role;
