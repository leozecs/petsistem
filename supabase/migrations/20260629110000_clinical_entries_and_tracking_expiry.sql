-- Pet-level veterinary history independent from a single appointment.
create table public.pet_clinical_entries (
  id uuid primary key default gen_random_uuid(),
  petshop_id uuid not null references public.petshops(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  veterinarian_id uuid references public.veterinarians(id) on delete set null,
  appointment_id uuid references public.appointments(id) on delete set null,
  title text not null check (char_length(title) between 1 and 120),
  notes text not null check (char_length(notes) between 1 and 6000),
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index pet_clinical_entries_tenant_pet_date_idx
  on public.pet_clinical_entries(petshop_id, pet_id, created_at desc);

create trigger pet_clinical_entries_set_updated_at
before update on public.pet_clinical_entries
for each row execute function public.set_updated_at();

alter table public.pet_clinical_entries enable row level security;

create policy "owners and vets read pet clinical entries"
on public.pet_clinical_entries for select to authenticated
using (private.has_petshop_role(petshop_id, array['owner', 'veterinarian']));

create policy "owners and vets create pet clinical entries"
on public.pet_clinical_entries for insert to authenticated
with check (
  private.has_petshop_role(petshop_id, array['owner', 'veterinarian'])
  and created_by = auth.uid()
  and exists (
    select 1 from public.pets p
    where p.id = pet_clinical_entries.pet_id
      and p.petshop_id = pet_clinical_entries.petshop_id
      and p.deleted_at is null
  )
);

create policy "owners and vets update pet clinical entries"
on public.pet_clinical_entries for update to authenticated
using (private.has_petshop_role(petshop_id, array['owner', 'veterinarian']))
with check (private.has_petshop_role(petshop_id, array['owner', 'veterinarian']));

alter table public.appointments
  add column if not exists tracking_expires_at timestamptz;

create index appointments_tracking_expiry_idx
  on public.appointments(tracking_expires_at)
  where tracking_slug is not null and tracking_expires_at is not null;
