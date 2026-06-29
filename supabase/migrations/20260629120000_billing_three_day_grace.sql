update public.plans set price_cents = 13999 where lower(code) = 'starter';
update public.plans set price_cents = 19799 where lower(code) in ('professional', 'profissional');
update public.plans set price_cents = 23999 where lower(code) = 'premium';

update public.subscriptions set amount_cents = case
  when lower(plan_name) like '%premium%' then 23999
  when lower(plan_name) like '%profissional%' or lower(plan_name) like '%professional%' then 19799
  else 13999
end
where status in ('pending', 'overdue') and deleted_at is null;

create or replace function public.reconcile_billing_status()
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare item record; previous_status public.petshop_status; overdue_count integer := 0; blocked_count integer := 0;
begin
  for item in
    with latest as (
      select distinct on (s.petshop_id) s.id, s.petshop_id, s.due_date, s.status
      from public.subscriptions s
      where s.deleted_at is null
      order by s.petshop_id, s.created_at desc, s.id desc
    ) select * from latest where status in ('pending', 'overdue') and due_date < current_date
  loop
    update public.subscriptions set status = 'overdue', updated_at = now()
      where id = item.id and status = 'pending';
    if found then overdue_count := overdue_count + 1; end if;

    if item.due_date < current_date - 3 then
      select status into previous_status from public.petshops
        where id = item.petshop_id and deleted_at is null for update;
      if previous_status in ('trial', 'active') then
        update public.petshops set status = 'blocked', billing_blocked_at = now(), updated_at = now()
          where id = item.petshop_id;
        blocked_count := blocked_count + 1;
        insert into public.status_history (petshop_id, entity_table, entity_id, from_status, to_status, notes)
          values (item.petshop_id, 'petshops', item.petshop_id, previous_status::text, 'blocked', 'Assinatura vencida há mais de 3 dias; bloqueio automático.');
        insert into public.audit_logs (petshop_id, action, entity_table, entity_id, metadata)
          values (item.petshop_id, 'billing.overdue_blocked', 'petshops', item.petshop_id, jsonb_build_object('subscription_id', item.id, 'due_date', item.due_date, 'grace_days', 3, 'source', 'vercel_cron'));
      end if;
    end if;
  end loop;
  return jsonb_build_object('overdue', overdue_count, 'blocked', blocked_count);
end;
$$;
