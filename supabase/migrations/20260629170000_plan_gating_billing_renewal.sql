-- Plan gating defaults + automatic monthly renewal after manual payment.

update public.plans
set
  max_users = case lower(code)
    when 'starter' then 2
    when 'profissional' then 5
    when 'professional' then 5
    when 'premium' then 12
    else max_users
  end,
  allows_veterinarian = case lower(code)
    when 'starter' then false
    when 'profissional' then true
    when 'professional' then true
    when 'premium' then true
    else allows_veterinarian
  end,
  updated_at = now()
where lower(code) in ('starter', 'profissional', 'professional', 'premium');

create or replace function public.confirm_subscription_payment(p_subscription_id uuid, p_actor_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  paid_sub record;
  shop record;
  next_due date;
  next_amount integer;
  next_plan_name text;
  next_subscription_id uuid;
  reactivated boolean := false;
begin
  select *
    into paid_sub
  from public.subscriptions
  where id = p_subscription_id
    and deleted_at is null
  for update;

  if paid_sub.id is null then
    raise exception 'subscription_not_found';
  end if;

  update public.subscriptions
  set status = 'paid',
      updated_by = p_actor_id,
      updated_at = now()
  where id = p_subscription_id;

  select p.id, p.status, p.plan_id, p.plan_name, p.pix_key, pl.name as catalog_plan_name, pl.price_cents
    into shop
  from public.petshops p
  left join public.plans pl on pl.id = p.plan_id
  where p.id = paid_sub.petshop_id
    and p.deleted_at is null
  for update;

  if shop.id is null then
    raise exception 'petshop_not_found';
  end if;

  update public.petshops
  set status = 'active',
      billing_blocked_at = null,
      updated_by = p_actor_id,
      updated_at = now()
  where id = shop.id
    and status = 'blocked'
    and billing_blocked_at is not null
    and p_subscription_id = (
      select id
      from public.subscriptions
      where petshop_id = shop.id
        and deleted_at is null
      order by created_at desc, id desc
      limit 1
    );
  reactivated := found;

  next_due := (paid_sub.due_date + interval '1 month')::date;
  next_plan_name := coalesce(shop.catalog_plan_name, shop.plan_name, paid_sub.plan_name);
  next_amount := coalesce(shop.price_cents, paid_sub.amount_cents);

  select id
    into next_subscription_id
  from public.subscriptions
  where petshop_id = shop.id
    and due_date = next_due
    and deleted_at is null
  limit 1;

  if next_subscription_id is null then
    insert into public.subscriptions (
      petshop_id,
      plan_name,
      amount_cents,
      due_date,
      status,
      pix_key,
      created_by
    )
    values (
      shop.id,
      next_plan_name,
      next_amount,
      next_due,
      'pending',
      shop.pix_key,
      p_actor_id
    )
    returning id into next_subscription_id;
  end if;

  if reactivated then
    insert into public.status_history (petshop_id, actor_id, entity_table, entity_id, from_status, to_status, notes)
    values (shop.id, p_actor_id, 'petshops', shop.id, 'blocked', 'active', 'Pagamento confirmado; desbloqueio automático.');
  end if;

  insert into public.audit_logs (petshop_id, actor_id, action, entity_table, entity_id, metadata)
  values (
    shop.id,
    p_actor_id,
    'billing.payment_confirmed',
    'subscriptions',
    p_subscription_id,
    jsonb_build_object(
      'reactivated', reactivated,
      'next_subscription_id', next_subscription_id,
      'next_due_date', next_due
    )
  );

  return jsonb_build_object(
    'reactivated', reactivated,
    'next_subscription_id', next_subscription_id,
    'next_due_date', next_due
  );
end;
$$;

revoke all on function public.confirm_subscription_payment(uuid, uuid) from public, anon, authenticated;
grant execute on function public.confirm_subscription_payment(uuid, uuid) to service_role;

drop policy if exists "owners read subscriptions for billing recovery" on public.subscriptions;
create policy "owners read subscriptions for billing recovery"
on public.subscriptions
for select
to authenticated
using (
  deleted_at is null
  and exists (
    select 1
    from public.memberships m
    where m.petshop_id = subscriptions.petshop_id
      and m.user_id = (select auth.uid())
      and m.role = 'owner'
      and m.status = 'active'
      and m.deleted_at is null
  )
);
