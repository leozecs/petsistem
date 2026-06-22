alter table public.petshops add column if not exists billing_blocked_at timestamptz;

create or replace function public.reconcile_billing_status()
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare item record; previous_status public.petshop_status; overdue_count integer := 0; blocked_count integer := 0;
begin
  for item in with latest as (
    select distinct on (s.petshop_id) s.id, s.petshop_id, s.due_date
    from public.subscriptions s order by s.petshop_id, s.created_at desc, s.id desc
  ) select l.* from latest l join public.subscriptions s on s.id = l.id
    where s.status = 'pending' and s.due_date < current_date
  loop
    update public.subscriptions set status = 'overdue', updated_at = now() where id = item.id and status = 'pending';
    if found then overdue_count := overdue_count + 1; end if;
    select status into previous_status from public.petshops where id = item.petshop_id and deleted_at is null for update;
    if previous_status in ('trial', 'active') then
      update public.petshops set status = 'blocked', billing_blocked_at = now(), updated_at = now() where id = item.petshop_id;
      blocked_count := blocked_count + 1;
      insert into public.status_history (petshop_id, entity_table, entity_id, from_status, to_status, notes)
        values (item.petshop_id, 'petshops', item.petshop_id, previous_status::text, 'blocked', 'Assinatura vencida; bloqueio automático e transacional.');
      insert into public.audit_logs (petshop_id, action, entity_table, entity_id, metadata)
        values (item.petshop_id, 'billing.overdue', 'petshops', item.petshop_id,
          jsonb_build_object('subscription_id', item.id, 'due_date', item.due_date, 'source', 'vercel_cron'));
    end if;
  end loop;
  return jsonb_build_object('overdue', overdue_count, 'blocked', blocked_count);
end;
$$;

create or replace function public.confirm_subscription_payment(p_subscription_id uuid, p_actor_id uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare shop_id uuid; reactivated boolean := false;
begin
  select petshop_id into shop_id from public.subscriptions where id = p_subscription_id for update;
  if shop_id is null then raise exception 'subscription_not_found'; end if;
  update public.subscriptions set status = 'paid', updated_by = p_actor_id, updated_at = now() where id = p_subscription_id;
  update public.petshops set status = 'active', billing_blocked_at = null, updated_by = p_actor_id, updated_at = now()
    where id = shop_id and status = 'blocked' and billing_blocked_at is not null
      and p_subscription_id = (select id from public.subscriptions where petshop_id = shop_id order by created_at desc, id desc limit 1);
  reactivated := found;
  if reactivated then
    insert into public.status_history (petshop_id, actor_id, entity_table, entity_id, from_status, to_status, notes)
      values (shop_id, p_actor_id, 'petshops', shop_id, 'blocked', 'active', 'Pagamento confirmado; desbloqueio automático.');
  end if;
  insert into public.audit_logs (petshop_id, actor_id, action, entity_table, entity_id, metadata)
    values (shop_id, p_actor_id, 'billing.payment_confirmed', 'subscriptions', p_subscription_id, jsonb_build_object('reactivated', reactivated));
  return jsonb_build_object('reactivated', reactivated);
end;
$$;

create or replace function public.confirm_payment(p_payment_id uuid, p_actor_id uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare subscription_id uuid; result jsonb;
begin
  update public.payments set status = 'paid', paid_at = now(), confirmed_by = p_actor_id, updated_by = p_actor_id, updated_at = now()
    where id = p_payment_id returning payments.subscription_id into subscription_id;
  if subscription_id is null then raise exception 'payment_not_found'; end if;
  result := public.confirm_subscription_payment(subscription_id, p_actor_id);
  return result || jsonb_build_object('payment_id', p_payment_id);
end;
$$;

revoke all on function public.confirm_subscription_payment(uuid, uuid) from public, anon, authenticated;
revoke all on function public.confirm_payment(uuid, uuid) from public, anon, authenticated;
grant execute on function public.confirm_subscription_payment(uuid, uuid) to service_role;
grant execute on function public.confirm_payment(uuid, uuid) to service_role;
