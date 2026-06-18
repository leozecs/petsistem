create extension if not exists "pgcrypto";

create type public.global_role as enum ('admin_master', 'user');
create type public.petshop_status as enum ('active', 'blocked', 'trial', 'cancelled');
create type public.member_role as enum ('owner', 'attendant', 'veterinarian');
create type public.service_area as enum ('grooming', 'veterinary');
create type public.appointment_status as enum (
  'pending',
  'confirmed',
  'checked_in',
  'in_progress',
  'finished',
  'cancelled',
  'no_show'
);
create type public.subscription_status as enum ('paid', 'pending', 'confirming', 'overdue', 'blocked');
create type public.payment_status as enum ('pending', 'confirming', 'paid', 'rejected', 'overdue');

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  phone text,
  global_role public.global_role not null default 'user',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.petshops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  slug text not null unique,
  subdomain text not null unique,
  status public.petshop_status not null default 'trial',
  plan_name text not null default 'Profissional',
  primary_color text not null default '#111827',
  phone text,
  whatsapp text,
  email text,
  address text,
  pix_key text,
  settings jsonb not null default '{}'::jsonb,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  petshop_id uuid not null references public.petshops(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role public.member_role not null,
  status text not null default 'active' check (status in ('active', 'invited', 'suspended')),
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (petshop_id, user_id)
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  petshop_id uuid not null references public.petshops(id) on delete cascade,
  name text not null,
  phone text not null,
  whatsapp text,
  email text,
  address text,
  notes text,
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.pets (
  id uuid primary key default gen_random_uuid(),
  petshop_id uuid not null references public.petshops(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  species text not null,
  breed text,
  sex text check (sex in ('male', 'female', 'unknown')),
  weight_kg numeric(6,2),
  age_label text,
  photo_path text,
  notes text,
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  petshop_id uuid not null references public.petshops(id) on delete cascade,
  name text not null,
  job_title text not null,
  phone text,
  email text,
  role public.member_role not null default 'attendant',
  active boolean not null default true,
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.veterinarians (
  id uuid primary key default gen_random_uuid(),
  petshop_id uuid not null references public.petshops(id) on delete cascade,
  name text not null,
  crmv text,
  phone text,
  email text,
  specialties text[] not null default '{}',
  active boolean not null default true,
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  petshop_id uuid not null references public.petshops(id) on delete cascade,
  area public.service_area not null,
  name text not null,
  description text,
  duration_minutes integer not null check (duration_minutes > 0),
  price_cents integer not null default 0 check (price_cents >= 0),
  active boolean not null default true,
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.calendars (
  id uuid primary key default gen_random_uuid(),
  petshop_id uuid not null references public.petshops(id) on delete cascade,
  area public.service_area not null,
  name text not null,
  timezone text not null default 'America/Sao_Paulo',
  active boolean not null default true,
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (petshop_id, area, name)
);

create table public.schedules (
  id uuid primary key default gen_random_uuid(),
  petshop_id uuid not null references public.petshops(id) on delete cascade,
  calendar_id uuid not null references public.calendars(id) on delete cascade,
  professional_id uuid,
  weekday integer not null check (weekday between 0 and 6),
  starts_at time not null,
  ends_at time not null,
  active boolean not null default true,
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (starts_at < ends_at)
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  petshop_id uuid not null references public.petshops(id) on delete cascade,
  calendar_id uuid not null references public.calendars(id),
  service_id uuid not null references public.services(id),
  client_id uuid references public.clients(id),
  pet_id uuid references public.pets(id),
  veterinarian_id uuid references public.veterinarians(id),
  employee_id uuid references public.employees(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.appointment_status not null default 'pending',
  tutor_name text,
  tutor_phone text,
  public_tracking_code text not null unique default encode(gen_random_bytes(8), 'hex'),
  notes text,
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (starts_at < ends_at)
);

create table public.checklist_steps (
  id uuid primary key default gen_random_uuid(),
  petshop_id uuid not null references public.petshops(id) on delete cascade,
  label text not null,
  position integer not null,
  active boolean not null default true,
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (petshop_id, position)
);

create table public.checklists (
  id uuid primary key default gen_random_uuid(),
  petshop_id uuid not null references public.petshops(id) on delete cascade,
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  step_id uuid not null references public.checklist_steps(id),
  completed_at timestamptz,
  completed_by uuid references public.users(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (appointment_id, step_id)
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  petshop_id uuid not null references public.petshops(id) on delete cascade,
  plan_name text not null,
  amount_cents integer not null check (amount_cents >= 0),
  due_date date not null,
  status public.subscription_status not null default 'pending',
  pix_key text,
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  petshop_id uuid not null references public.petshops(id) on delete cascade,
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  amount_cents integer not null check (amount_cents >= 0),
  status public.payment_status not null default 'pending',
  paid_at timestamptz,
  confirmed_by uuid references public.users(id),
  proof_path text,
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  petshop_id uuid references public.petshops(id) on delete cascade,
  actor_id uuid references public.users(id),
  action text not null,
  entity_table text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.status_history (
  id uuid primary key default gen_random_uuid(),
  petshop_id uuid not null references public.petshops(id) on delete cascade,
  actor_id uuid references public.users(id),
  entity_table text not null,
  entity_id uuid not null,
  from_status text,
  to_status text not null,
  notes text,
  created_at timestamptz not null default now()
);

create index memberships_petshop_user_idx on public.memberships (petshop_id, user_id);
create index clients_petshop_idx on public.clients (petshop_id);
create index pets_petshop_client_idx on public.pets (petshop_id, client_id);
create index services_petshop_area_idx on public.services (petshop_id, area);
create index appointments_petshop_starts_idx on public.appointments (petshop_id, starts_at);
create index appointments_tracking_code_idx on public.appointments (public_tracking_code);
create index checklists_petshop_appointment_idx on public.checklists (petshop_id, appointment_id);
create index audit_logs_petshop_created_idx on public.audit_logs (petshop_id, created_at desc);
create index status_history_petshop_entity_idx on public.status_history (petshop_id, entity_table, entity_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_admin_master()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.global_role = 'admin_master'
  );
$$;

create or replace function public.is_petshop_member(target_petshop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin_master()
    or exists (
      select 1
      from public.memberships m
      where m.petshop_id = target_petshop_id
        and m.user_id = auth.uid()
        and m.status = 'active'
    );
$$;

create or replace function public.has_petshop_role(target_petshop_id uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin_master()
    or exists (
      select 1
      from public.memberships m
      where m.petshop_id = target_petshop_id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and m.role::text = any(allowed_roles)
    );
$$;

create trigger users_set_updated_at before update on public.users
for each row execute function public.set_updated_at();
create trigger petshops_set_updated_at before update on public.petshops
for each row execute function public.set_updated_at();
create trigger memberships_set_updated_at before update on public.memberships
for each row execute function public.set_updated_at();
create trigger clients_set_updated_at before update on public.clients
for each row execute function public.set_updated_at();
create trigger pets_set_updated_at before update on public.pets
for each row execute function public.set_updated_at();
create trigger employees_set_updated_at before update on public.employees
for each row execute function public.set_updated_at();
create trigger veterinarians_set_updated_at before update on public.veterinarians
for each row execute function public.set_updated_at();
create trigger services_set_updated_at before update on public.services
for each row execute function public.set_updated_at();
create trigger calendars_set_updated_at before update on public.calendars
for each row execute function public.set_updated_at();
create trigger schedules_set_updated_at before update on public.schedules
for each row execute function public.set_updated_at();
create trigger appointments_set_updated_at before update on public.appointments
for each row execute function public.set_updated_at();
create trigger checklist_steps_set_updated_at before update on public.checklist_steps
for each row execute function public.set_updated_at();
create trigger checklists_set_updated_at before update on public.checklists
for each row execute function public.set_updated_at();
create trigger subscriptions_set_updated_at before update on public.subscriptions
for each row execute function public.set_updated_at();
create trigger payments_set_updated_at before update on public.payments
for each row execute function public.set_updated_at();

alter table public.users enable row level security;
alter table public.petshops enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.memberships enable row level security;
alter table public.clients enable row level security;
alter table public.pets enable row level security;
alter table public.employees enable row level security;
alter table public.veterinarians enable row level security;
alter table public.services enable row level security;
alter table public.calendars enable row level security;
alter table public.schedules enable row level security;
alter table public.appointments enable row level security;
alter table public.checklist_steps enable row level security;
alter table public.checklists enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.audit_logs enable row level security;
alter table public.status_history enable row level security;

create policy "users can read own profile or admin can read all"
on public.users for select
using (id = auth.uid() or public.is_admin_master());

create policy "users can update own profile"
on public.users for update
using (id = auth.uid())
with check (id = auth.uid());

create policy "admins manage users"
on public.users for all
using (public.is_admin_master())
with check (public.is_admin_master());

create policy "petshop members read their tenant"
on public.petshops for select
using (public.is_petshop_member(id));

create policy "admins manage petshops"
on public.petshops for all
using (public.is_admin_master())
with check (public.is_admin_master());

create policy "memberships visible to tenant members"
on public.memberships for select
using (public.is_petshop_member(petshop_id));

create policy "owners and admins manage memberships"
on public.memberships for all
using (public.has_petshop_role(petshop_id, array['owner']))
with check (public.has_petshop_role(petshop_id, array['owner']));

create policy "roles visible to authenticated users"
on public.roles for select
to authenticated
using (true);

create policy "permissions visible to authenticated users"
on public.permissions for select
to authenticated
using (true);

create policy "role permissions visible to authenticated users"
on public.role_permissions for select
to authenticated
using (true);

create policy "admins manage role catalog"
on public.roles for all
using (public.is_admin_master())
with check (public.is_admin_master());

create policy "admins manage permission catalog"
on public.permissions for all
using (public.is_admin_master())
with check (public.is_admin_master());

create policy "admins manage role permissions"
on public.role_permissions for all
using (public.is_admin_master())
with check (public.is_admin_master());

create policy "tenant members read clients" on public.clients for select
using (public.is_petshop_member(petshop_id));
create policy "owners and attendants manage clients" on public.clients for all
using (public.has_petshop_role(petshop_id, array['owner','attendant']))
with check (public.has_petshop_role(petshop_id, array['owner','attendant']));

create policy "tenant members read pets" on public.pets for select
using (public.is_petshop_member(petshop_id));
create policy "owners and attendants manage pets" on public.pets for all
using (public.has_petshop_role(petshop_id, array['owner','attendant']))
with check (public.has_petshop_role(petshop_id, array['owner','attendant']));

create policy "tenant members read employees" on public.employees for select
using (public.is_petshop_member(petshop_id));
create policy "owners manage employees" on public.employees for all
using (public.has_petshop_role(petshop_id, array['owner']))
with check (public.has_petshop_role(petshop_id, array['owner']));

create policy "tenant members read veterinarians" on public.veterinarians for select
using (public.is_petshop_member(petshop_id));
create policy "owners manage veterinarians" on public.veterinarians for all
using (public.has_petshop_role(petshop_id, array['owner']))
with check (public.has_petshop_role(petshop_id, array['owner']));

create policy "tenant members read services" on public.services for select
using (public.is_petshop_member(petshop_id));
create policy "owners manage services" on public.services for all
using (public.has_petshop_role(petshop_id, array['owner']))
with check (public.has_petshop_role(petshop_id, array['owner']));

create policy "tenant members read calendars" on public.calendars for select
using (public.is_petshop_member(petshop_id));
create policy "owners manage calendars" on public.calendars for all
using (public.has_petshop_role(petshop_id, array['owner']))
with check (public.has_petshop_role(petshop_id, array['owner']));

create policy "tenant members read schedules" on public.schedules for select
using (public.is_petshop_member(petshop_id));
create policy "owners manage schedules" on public.schedules for all
using (public.has_petshop_role(petshop_id, array['owner']))
with check (public.has_petshop_role(petshop_id, array['owner']));

create policy "tenant members read appointments" on public.appointments for select
using (public.is_petshop_member(petshop_id));
create policy "ops team manage appointments" on public.appointments for all
using (public.has_petshop_role(petshop_id, array['owner','attendant','veterinarian']))
with check (public.has_petshop_role(petshop_id, array['owner','attendant','veterinarian']));
create policy "public can create appointment requests" on public.appointments for insert
to anon
with check (status = 'pending');
create policy "public tracking can read appointment summary" on public.appointments for select
to anon
using (public_tracking_code is not null);

create policy "tenant members read checklist steps" on public.checklist_steps for select
using (public.is_petshop_member(petshop_id));
create policy "owners manage checklist steps" on public.checklist_steps for all
using (public.has_petshop_role(petshop_id, array['owner']))
with check (public.has_petshop_role(petshop_id, array['owner']));

create policy "tenant members read checklists" on public.checklists for select
using (public.is_petshop_member(petshop_id));
create policy "ops team update checklists" on public.checklists for all
using (public.has_petshop_role(petshop_id, array['owner','attendant','veterinarian']))
with check (public.has_petshop_role(petshop_id, array['owner','attendant','veterinarian']));

create policy "owners read subscriptions" on public.subscriptions for select
using (public.has_petshop_role(petshop_id, array['owner']));
create policy "admins manage subscriptions" on public.subscriptions for all
using (public.is_admin_master())
with check (public.is_admin_master());

create policy "owners read payments" on public.payments for select
using (public.has_petshop_role(petshop_id, array['owner']));
create policy "owners mark payment confirming" on public.payments for update
using (public.has_petshop_role(petshop_id, array['owner']))
with check (public.has_petshop_role(petshop_id, array['owner']) and status = 'confirming');
create policy "admins manage payments" on public.payments for all
using (public.is_admin_master())
with check (public.is_admin_master());

create policy "tenant members read audit logs" on public.audit_logs for select
using (petshop_id is null and public.is_admin_master() or public.is_petshop_member(petshop_id));
create policy "admins insert audit logs" on public.audit_logs for insert
with check (public.is_admin_master() or public.is_petshop_member(petshop_id));

create policy "tenant members read status history" on public.status_history for select
using (public.is_petshop_member(petshop_id));
create policy "tenant members insert status history" on public.status_history for insert
with check (public.is_petshop_member(petshop_id));

insert into public.roles (code, name, description) values
  ('owner', 'Dono', 'Gestao completa da loja'),
  ('attendant', 'Atendente', 'Agenda, checklist e atendimento diario'),
  ('veterinarian', 'Veterinario', 'Consultas, observacoes e finalizacao clinica');

insert into public.permissions (code, name, description) values
  ('agenda.manage', 'Gerenciar agenda', 'Criar, editar e cancelar agendamentos'),
  ('clients.manage', 'Gerenciar clientes', 'CRUD de tutores'),
  ('pets.manage', 'Gerenciar pets', 'CRUD de pets e fotos'),
  ('team.manage', 'Gerenciar equipe', 'Funcionarios e veterinarios'),
  ('checklist.manage', 'Gerenciar checklist', 'Atualizar fluxo operacional'),
  ('subscription.read', 'Ver assinatura', 'Acessar plano, vencimento e pagamentos');

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on
  (r.code = 'owner')
  or (r.code = 'attendant' and p.code in ('agenda.manage','clients.manage','pets.manage','checklist.manage'))
  or (r.code = 'veterinarian' and p.code in ('agenda.manage','checklist.manage'));
