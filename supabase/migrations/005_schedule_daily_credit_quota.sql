begin;

-- pg_cron du staging a été vérifié en GMT; 23:00 GMT = 00:00 Africa/Douala.
-- Le générateur est idempotent et le mécanisme à la demande de la migration 003
-- rattrape aussi un éventuel cron manqué sans accorder deux fois le même jour.
do $$
begin
  if exists (
    select 1 from cron.job
    where jobname = 'prismai-daily-credit-quota'
    limit 1
  ) then
    perform cron.unschedule('prismai-daily-credit-quota');
  end if;

  perform cron.schedule(
    'prismai-daily-credit-quota',
    '0 23 * * *',
    'select public.grant_daily_credit_quotas();'
  );
end;
$$;

commit;
