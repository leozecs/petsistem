-- Phase 7.9: prontuário veterinário (Veterinária only)
--
-- 1:1 com appointments via PK/FK. RLS permite read/write apenas para owner e
-- veterinarians do petshop. A camada de aplicação verifica que o appointment
-- é de área veterinary antes de criar/editar — RLS não inspeciona calendar.area
-- pra evitar join recursivo.

create table public.appointment_records (
  appointment_id uuid primary key references public.appointments(id) on delete cascade,
  petshop_id uuid not null references public.petshops(id) on delete cascade,
  chief_complaint text,
  anamnesis text,
  physical_exam text,
  diagnosis text,
  plan text,
  created_at timestamptz not null default now(),
  created_by uuid references public.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users(id)
);

create index appointment_records_petshop_idx
  on public.appointment_records(petshop_id);

alter table public.appointment_records enable row level security;

create policy "admin_master_read_records"
  on public.appointment_records for select
  to authenticated using (private.is_admin_master());

create policy "tenant_read_records"
  on public.appointment_records for select
  to authenticated using (private.is_petshop_member(petshop_id));

create policy "tenant_write_records"
  on public.appointment_records for insert
  to authenticated
  with check (private.has_petshop_role(petshop_id, array['owner', 'veterinarian']));

create policy "tenant_update_records"
  on public.appointment_records for update
  to authenticated
  using (private.has_petshop_role(petshop_id, array['owner', 'veterinarian']))
  with check (private.has_petshop_role(petshop_id, array['owner', 'veterinarian']));

create policy "tenant_delete_records"
  on public.appointment_records for delete
  to authenticated
  using (private.has_petshop_role(petshop_id, array['owner']));

create trigger appointment_records_set_updated_at
  before update on public.appointment_records
  for each row execute function public.set_updated_at();
