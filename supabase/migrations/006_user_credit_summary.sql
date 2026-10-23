begin;

-- Fournit au Dashboard le solde réellement utilisable sans exposer les autres
-- comptes ni ouvrir la table quotidienne en lecture directe aux clients.
create or replace function public.get_my_credit_summary()
returns table (
  wallet_available numeric(14,2),
  daily_available numeric(14,2),
  total_available numeric(14,2),
  quota_date date
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_local_date date := timezone('Africa/Douala', now())::date;
begin
  if current_user_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  -- Crée le quota manquant de façon idempotente si la tâche Cron a été manquée.
  perform public.ensure_daily_credit_quota(current_user_id, current_local_date);

  return query
  select
    greatest(coalesce(c.balance - c.reserved_credits, 0), 0),
    greatest(coalesce(q.granted_credits - q.reserved_credits - q.consumed_credits, 0), 0),
    greatest(coalesce(c.balance - c.reserved_credits, 0), 0)
      + greatest(coalesce(q.granted_credits - q.reserved_credits - q.consumed_credits, 0), 0),
    current_local_date
  from public.credits c
  left join public.daily_credit_quotas q
    on q.user_id = c.user_id and q.quota_date = current_local_date
  where c.user_id = current_user_id;
end;
$$;

revoke all on function public.get_my_credit_summary() from public, anon;
grant execute on function public.get_my_credit_summary() to authenticated;

commit;
