-- Phase 7.3: per-appointment service checklist (Banho e Tosa only)
--
-- 1:1 with appointments.id (one checklist per booking). Storing as a sibling
-- table instead of widening `appointments` keeps the hot calendar query lean —
-- the panel only joins to checklists on demand when the user opens the dialog.
--
-- Scope is grooming-only at the application layer; RLS does NOT inspect
-- calendars.area to avoid a join cycle. The server action enforces it.

create table public.appointment_checklists (
  appointment_id uuid primary key references public.appointments(id) on delete cascade,
  petshop_id uuid not null references public.petshops(id) on delete cascade,
  products text[] not null default '{}',
  arrival_condition text,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references public.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users(id)
);

create index appointment_checklists_petshop_idx
  on public.appointment_checklists(petshop_id);

alter table public.appointment_checklists enable row level security;

-- Admin master can read everything for support cases.
create policy "admin_master_read_checklists"
  on public.appointment_checklists for select
  to authenticated
  using (private.is_admin_master());

-- Tenant members can read checklists scoped to their petshop. Application code
-- further filters to grooming-area appointments; vet appointments simply won't
-- have a checklist row inserted, so reads return empty there.
create policy "tenant_read_checklists"
  on public.appointment_checklists for select
  to authenticated
  using (private.is_petshop_member(petshop_id));

-- Operational roles can write checklists for their own petshop. The server
-- action narrows further: only owner+attendant on grooming-area appointments.
create policy "tenant_write_checklists"
  on public.appointment_checklists for insert
  to authenticated
  with check (
    private.has_petshop_role(petshop_id, array['owner', 'attendant'])
  );

create policy "tenant_update_checklists"
  on public.appointment_checklists for update
  to authenticated
  using (private.has_petshop_role(petshop_id, array['owner', 'attendant']))
  with check (private.has_petshop_role(petshop_id, array['owner', 'attendant']));

create policy "tenant_delete_checklists"
  on public.appointment_checklists for delete
  to authenticated
  using (private.has_petshop_role(petshop_id, array['owner']));

create trigger appointment_checklists_set_updated_at
  before update on public.appointment_checklists
  for each row execute function public.set_updated_at();
