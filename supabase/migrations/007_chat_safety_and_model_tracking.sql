begin;

-- Mémorise le modèle réel retourné par le provider sur chaque message assistant.
alter table public.messages add column if not exists model_used text;

-- Une réservation de crédits ne peut être attribuée qu’une fois à un appel fournisseur.
create or replace function public.claim_credit_operation(p_user_id uuid, p_operation_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  operation public.credit_operations;
begin
  if p_user_id is null or p_operation_id is null then
    raise exception 'INVALID_CREDIT_OPERATION' using errcode = 'P0001';
  end if;
  select * into operation
  from public.credit_operations
  where id = p_operation_id and user_id = p_user_id
  for update;
  if operation.id is null then
    raise exception 'CREDIT_OPERATION_NOT_FOUND' using errcode = 'P0001';
  end if;
  if operation.state = 'RESERVED' then
    update public.credit_operations set state = 'PROCESSING', updated_at = now() where id = p_operation_id;
    return true;
  end if;
  -- PROCESSING, COMPLETED ou FAILED signifient qu’un appel a déjà été revendiqué ou terminé.
  return false;
end;
$$;

revoke all on function public.claim_credit_operation(uuid, uuid) from public, anon, authenticated;
grant execute on function public.claim_credit_operation(uuid, uuid) to service_role;

commit;
