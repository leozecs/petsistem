-- Phase 2 schema expansion: plans, financials, clinical notes, notifications,
-- checklist photos, soft delete + audit columns on tenant tables.

-- =========================================================================
-- 1. Plans (commercial)
-- =========================================================================
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  price_cents integer not null check (price_cents >= 0),
  max_users integer not null check (max_users > 0),
  allows_veterinarian boolean not null default false,
  description text,
  active boolean not null default true,
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger plans_set_updated_at before update on public.plans
for each row execute function public.set_updated_at();

alter table public.plans enable row level security;

create policy "authenticated can read active plans" on public.plans for select
to authenticated, anon
using (active = true or private.is_admin_master());

create policy "admins manage plans" on public.plans for all
using (private.is_admin_master())
with check (private.is_admin_master());

insert into public.plans (code, name, price_cents, max_users, allows_veterinarian, description) values
  ('starter', 'Starter', 13900, 2, false, 'Banho e Tosa enxuto — dono + atendente, sem veterinário'),
  ('professional', 'Profissional', 22900, 5, true, 'Operação completa com veterinário liberado e até 5 usuários'),
  ('premium', 'Premium', 34900, 12, true, 'Múltiplas equipes, suporte prioritário e até 12 usuários');

-- =========================================================================
-- 2. petshops.plan_id (FK), keep plan_name as fallback display
-- =========================================================================
alter table public.petshops add column plan_id uuid references public.plans(id);
update public.petshops set plan_id = (select id from public.plans where code = 'professional') where plan_id is null;

-- =========================================================================
-- 3. Revenues (receitas)
-- =========================================================================
create type public.financial_category as enum (
  'grooming', 'veterinary', 'retail', 'service', 'other'
);

create table public.revenues (
  id uuid primary key default gen_random_uuid(),
  petshop_id uuid not null references public.petshops(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,
  category public.financial_category not null default 'other',
  description text not null,
  amount_cents integer not null check (amount_cents >= 0),
  received_at date not null,
  payment_method text,
  notes text,
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  deleted_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index revenues_petshop_received_idx on public.revenues (petshop_id, received_at desc) where deleted_at is null;

create trigger revenues_set_updated_at before update on public.revenues
for each row execute function public.set_updated_at();

alter table public.revenues enable row level security;

create policy "tenant members read revenues" on public.revenues for select
using (private.is_petshop_member(petshop_id) and deleted_at is null);

create policy "owners manage revenues" on public.revenues for all
using (private.has_petshop_role(petshop_id, array['owner']))
with check (private.has_petshop_role(petshop_id, array['owner']));

-- =========================================================================
-- 4. Expenses (despesas)
-- =========================================================================
create type public.expense_category as enum (
  'rent', 'utilities', 'payroll', 'supplies', 'services', 'maintenance', 'taxes', 'marketing', 'other'
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  petshop_id uuid not null references public.petshops(id) on delete cascade,
  category public.expense_category not null default 'other',
  description text not null,
  amount_cents integer not null check (amount_cents >= 0),
  due_date date not null,
  paid_at date,
  proof_path text,
  notes text,
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  deleted_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index expenses_petshop_due_idx on public.expenses (petshop_id, due_date desc) where deleted_at is null;

create trigger expenses_set_updated_at before update on public.expenses
for each row execute function public.set_updated_at();

alter table public.expenses enable row level security;

create policy "tenant members read expenses" on public.expenses for select
using (private.is_petshop_member(petshop_id) and deleted_at is null);

create policy "owners manage expenses" on public.expenses for all
using (private.has_petshop_role(petshop_id, array['owner']))
with check (private.has_petshop_role(petshop_id, array['owner']));

-- =========================================================================
-- 5. Clinical Notes (observações veterinárias)
-- =========================================================================
create table public.clinical_notes (
  id uuid primary key default gen_random_uuid(),
  petshop_id uuid not null references public.petshops(id) on delete cascade,
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  veterinarian_id uuid references public.veterinarians(id) on delete set null,
  pet_id uuid references public.pets(id) on delete set null,
  diagnosis text,
  observations text,
  medications text,
  recommendations text,
  weight_kg numeric(6,2),
  temperature_c numeric(4,1),
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  deleted_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index clinical_notes_petshop_idx on public.clinical_notes (petshop_id) where deleted_at is null;
create index clinical_notes_appointment_idx on public.clinical_notes (appointment_id);
create index clinical_notes_pet_idx on public.clinical_notes (pet_id) where deleted_at is null;

create trigger clinical_notes_set_updated_at before update on public.clinical_notes
for each row execute function public.set_updated_at();

alter table public.clinical_notes enable row level security;

create policy "tenant members read clinical notes" on public.clinical_notes for select
using (private.is_petshop_member(petshop_id) and deleted_at is null);

create policy "vets and owners manage clinical notes" on public.clinical_notes for all
using (private.has_petshop_role(petshop_id, array['owner','veterinarian']))
with check (private.has_petshop_role(petshop_id, array['owner','veterinarian']));

-- =========================================================================
-- 6. Notifications (in-app)
-- =========================================================================
create type public.notification_kind as enum (
  'subscription_due', 'support_access', 'appointment_change', 'checklist_step', 'system'
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  petshop_id uuid references public.petshops(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  kind public.notification_kind not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_user_unread_idx on public.notifications (user_id) where read_at is null;

alter table public.notifications enable row level security;

create policy "users read own notifications" on public.notifications for select
using (user_id = auth.uid());

create policy "users mark own notifications read" on public.notifications for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "tenant members insert notifications" on public.notifications for insert
with check (
  private.is_admin_master()
  or (petshop_id is not null and private.is_petshop_member(petshop_id))
);

-- =========================================================================
-- 7. Checklist Photos
-- =========================================================================
create table public.checklist_photos (
  id uuid primary key default gen_random_uuid(),
  petshop_id uuid not null references public.petshops(id) on delete cascade,
  checklist_id uuid not null references public.checklists(id) on delete cascade,
  path text not null,
  caption text,
  uploaded_by uuid references public.users(id),
  uploaded_at timestamptz not null default now()
);

create index checklist_photos_checklist_idx on public.checklist_photos (checklist_id);

alter table public.checklist_photos enable row level security;

create policy "tenant members read checklist photos" on public.checklist_photos for select
using (private.is_petshop_member(petshop_id));

create policy "ops team upload checklist photos" on public.checklist_photos for insert
with check (private.has_petshop_role(petshop_id, array['owner','attendant','veterinarian']));

create policy "ops team delete checklist photos" on public.checklist_photos for delete
using (private.has_petshop_role(petshop_id, array['owner','attendant','veterinarian']));

-- =========================================================================
-- 8. Soft delete + audit columns on tenant tables
-- =========================================================================
do $$
declare
  t text;
  tables text[] := array[
    'users','petshops','memberships','clients','pets','employees','veterinarians',
    'services','calendars','schedules','appointments','checklist_steps','checklists',
    'subscriptions','payments'
  ];
begin
  foreach t in array tables loop
    execute format('alter table public.%I add column if not exists deleted_at timestamptz', t);
    execute format('alter table public.%I add column if not exists deleted_by uuid references public.users(id)', t);
  end loop;
end $$;

alter table public.users add column if not exists updated_by uuid references public.users(id);
alter table public.memberships add column if not exists updated_by uuid references public.users(id);
alter table public.checklists add column if not exists updated_by uuid references public.users(id);

-- =========================================================================
-- 9. Partial indexes for soft delete (active rows only)
-- =========================================================================
create index if not exists clients_petshop_active_idx on public.clients (petshop_id) where deleted_at is null;
create index if not exists pets_petshop_active_idx on public.pets (petshop_id) where deleted_at is null;
create index if not exists appointments_petshop_active_idx on public.appointments (petshop_id, starts_at) where deleted_at is null;
create index if not exists employees_petshop_active_idx on public.employees (petshop_id) where deleted_at is null;
create index if not exists veterinarians_petshop_active_idx on public.veterinarians (petshop_id) where deleted_at is null;
create index if not exists services_petshop_active_idx on public.services (petshop_id, area) where deleted_at is null and active = true;
