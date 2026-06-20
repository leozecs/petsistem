-- Phase 7.4: Financeiro — caixa do dia + despesas
--
-- public.expenses already exists from the schema-expansion migration. We only
-- ADD a payment_method column to it and create the new charges table + enum.

create type public.payment_method as enum ('pix', 'cash', 'card', 'transfer', 'other');

create table public.appointment_charges (
  appointment_id uuid primary key references public.appointments(id) on delete cascade,
  petshop_id uuid not null references public.petshops(id) on delete cascade,
  price_cents integer not null check (price_cents >= 0),
  payment_method public.payment_method,
  paid_at timestamptz,
  paid_by uuid references public.users(id),
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references public.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users(id)
);

create index appointment_charges_petshop_idx on public.appointment_charges(petshop_id);
create index appointment_charges_paid_at_idx on public.appointment_charges(petshop_id, paid_at);

alter table public.appointment_charges enable row level security;

create policy "admin_master_read_charges" on public.appointment_charges for select to authenticated using (private.is_admin_master());
create policy "tenant_read_charges" on public.appointment_charges for select to authenticated using (private.is_petshop_member(petshop_id));
create policy "tenant_write_charges" on public.appointment_charges for insert to authenticated with check (private.has_petshop_role(petshop_id, array['owner', 'attendant']));
create policy "tenant_update_charges" on public.appointment_charges for update to authenticated using (private.has_petshop_role(petshop_id, array['owner', 'attendant'])) with check (private.has_petshop_role(petshop_id, array['owner', 'attendant']));
create policy "tenant_delete_charges" on public.appointment_charges for delete to authenticated using (private.has_petshop_role(petshop_id, array['owner']));

create trigger appointment_charges_set_updated_at before update on public.appointment_charges for each row execute function public.set_updated_at();

insert into public.appointment_charges (appointment_id, petshop_id, price_cents)
select a.id, a.petshop_id, s.price_cents
from public.appointments a
join public.services s on s.id = a.service_id
where a.deleted_at is null
on conflict (appointment_id) do nothing;

alter table public.expenses add column payment_method public.payment_method;
