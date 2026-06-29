-- Category deletion keeps historical financial rows but deliberately clears
-- their now-deleted category reference.
alter table public.expenses drop constraint if exists expenses_category_id_fkey;
alter table public.expenses
  add constraint expenses_category_id_fkey foreign key (category_id)
  references public.categories(id) on delete set null;

alter table public.revenue_items drop constraint if exists revenue_items_category_id_fkey;
alter table public.revenue_items
  add constraint revenue_items_category_id_fkey foreign key (category_id)
  references public.categories(id) on delete set null;

-- Repair stores provisioned through the admin flow before subscriptions were
-- created there. Exactly one initial pending charge is added per missing store.
insert into public.subscriptions (
  petshop_id, plan_name, amount_cents, due_date, status, created_by
)
select
  p.id,
  coalesce(pl.name, nullif(p.plan_name, ''), 'Starter'),
  coalesce(pl.price_cents, 13900),
  current_date + 30,
  'pending'::public.subscription_status,
  p.created_by
from public.petshops p
left join public.plans pl on pl.id = p.plan_id
where p.deleted_at is null
  and not exists (
    select 1 from public.subscriptions s
    where s.petshop_id = p.id and s.deleted_at is null
  );

-- Owner and attendant can configure service-specific checklist flows. An
-- attendant remains restricted to grooming services in their own tenant.
drop policy if exists "owners manage checklist steps" on public.checklist_steps;
create policy "ops configure service checklist steps"
on public.checklist_steps for all to authenticated
using (
  private.has_petshop_role(petshop_id, array['owner'])
  or (
    private.has_petshop_role(petshop_id, array['attendant'])
    and service_id is not null
    and exists (
      select 1 from public.services s
      where s.id = checklist_steps.service_id
        and s.petshop_id = checklist_steps.petshop_id
        and s.area = 'grooming'
        and s.deleted_at is null
    )
  )
)
with check (
  private.has_petshop_role(petshop_id, array['owner'])
  or (
    private.has_petshop_role(petshop_id, array['attendant'])
    and service_id is not null
    and exists (
      select 1 from public.services s
      where s.id = checklist_steps.service_id
        and s.petshop_id = checklist_steps.petshop_id
        and s.area = 'grooming'
        and s.deleted_at is null
    )
  )
);
