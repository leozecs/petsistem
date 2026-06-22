-- Critical 4-7: timezone per tenant, atomic billing reconciliation,
-- owner-only strategic finance, and reserved tenant subdomains.

alter table public.petshops
  add column if not exists timezone text not null default 'America/Sao_Paulo';

alter table public.petshops
  add constraint petshops_timezone_allowed
  check (timezone in (
    'America/Noronha', 'America/Sao_Paulo', 'America/Fortaleza',
    'America/Manaus', 'America/Cuiaba', 'America/Rio_Branco'
  )) not valid;
alter table public.petshops validate constraint petshops_timezone_allowed;

alter table public.petshops
  add constraint petshops_subdomain_not_reserved
  check (lower(subdomain) <> all (array[
    'www','app','admin','admin-master','api','auth','static','assets','cdn','mail',
    'blog','login','signup','marketing','suporte','support','status','docs',
    'dashboard','painel','billing','checkout','ftp','smtp','imap','pop','mx','ns1','ns2'
  ]::text[])) not valid;

drop policy if exists "tenant members read revenues" on public.revenues;
create policy "owners read revenues" on public.revenues for select to authenticated
  using (private.has_petshop_role(petshop_id, array['owner']) and deleted_at is null);

drop policy if exists "tenant members read expenses" on public.expenses;
create policy "owners read expenses" on public.expenses for select to authenticated
  using (private.has_petshop_role(petshop_id, array['owner']) and deleted_at is null);

drop policy if exists "tenant_read_categories" on public.categories;
create policy "owner_read_categories" on public.categories for select to authenticated
  using (private.has_petshop_role(petshop_id, array['owner']));

drop policy if exists "tenant_read_revenue_items" on public.revenue_items;
drop policy if exists "tenant_insert_revenue_items" on public.revenue_items;
drop policy if exists "tenant_update_revenue_items" on public.revenue_items;
create policy "owner_read_revenue_items" on public.revenue_items for select to authenticated
  using (private.has_petshop_role(petshop_id, array['owner']) and deleted_at is null);
create policy "owner_insert_revenue_items" on public.revenue_items for insert to authenticated
  with check (private.has_petshop_role(petshop_id, array['owner']));
create policy "owner_update_revenue_items" on public.revenue_items for update to authenticated
  using (private.has_petshop_role(petshop_id, array['owner']))
  with check (private.has_petshop_role(petshop_id, array['owner']));

create or replace function public.reconcile_billing_status()
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  item record;
  previous_status public.petshop_status;
  overdue_count integer := 0;
  blocked_count integer := 0;
begin
  for item in
    with latest as (
      select distinct on (s.petshop_id) s.id, s.petshop_id, s.due_date
      from public.subscriptions s
      order by s.petshop_id, s.created_at desc, s.id desc
    )
    select l.id, l.petshop_id, l.due_date
    from latest l
    join public.subscriptions s on s.id = l.id
    where s.status = 'pending' and s.due_date < current_date
  loop
    update public.subscriptions
      set status = 'overdue', updated_at = now()
      where id = item.id and status = 'pending';
    if found then
      overdue_count := overdue_count + 1;
    end if;

    select status into previous_status
      from public.petshops
      where id = item.petshop_id and deleted_at is null
      for update;

    if previous_status in ('trial', 'active') then
      update public.petshops
        set status = 'blocked', updated_at = now()
        where id = item.petshop_id;
      blocked_count := blocked_count + 1;

      insert into public.status_history
        (petshop_id, entity_table, entity_id, from_status, to_status, notes)
      values
        (item.petshop_id, 'petshops', item.petshop_id, previous_status::text, 'blocked',
         'Assinatura vencida; bloqueio automático e transacional.');

      insert into public.audit_logs
        (petshop_id, action, entity_table, entity_id, metadata)
      values
        (item.petshop_id, 'billing.overdue', 'petshops', item.petshop_id,
         jsonb_build_object('subscription_id', item.id, 'due_date', item.due_date, 'source', 'vercel_cron'));
    end if;
  end loop;

  return jsonb_build_object('overdue', overdue_count, 'blocked', blocked_count);
end;
$$;

revoke all on function public.reconcile_billing_status() from public, anon, authenticated;
grant execute on function public.reconcile_billing_status() to service_role;
