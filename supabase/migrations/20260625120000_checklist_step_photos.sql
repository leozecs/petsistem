-- Phase 15.1: fotos por etapa do checklist + bucket privado

-- 1. Tabela 1:N de fotos por checklist row
create table public.appointment_step_photos (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references public.checklists(id) on delete cascade,
  petshop_id uuid not null references public.petshops(id) on delete cascade,
  photo_path text not null,
  uploaded_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

create index appointment_step_photos_checklist_idx
  on public.appointment_step_photos(checklist_id);

create index appointment_step_photos_petshop_idx
  on public.appointment_step_photos(petshop_id);

alter table public.appointment_step_photos enable row level security;

create policy "admin_master_read_step_photos"
  on public.appointment_step_photos for select to authenticated
  using (private.is_admin_master());

create policy "tenant_read_step_photos"
  on public.appointment_step_photos for select to authenticated
  using (private.is_petshop_member(petshop_id));

create policy "tenant_insert_step_photos"
  on public.appointment_step_photos for insert to authenticated
  with check (private.has_petshop_role(petshop_id, array['owner', 'attendant', 'veterinarian']));

create policy "tenant_delete_step_photos"
  on public.appointment_step_photos for delete to authenticated
  using (private.has_petshop_role(petshop_id, array['owner', 'attendant', 'veterinarian']));

-- 2. Bucket privado de fotos por atendimento
-- Path: "<petshop_id>/<appointment_id>/<random>.jpg"
insert into storage.buckets (id, name, public)
values ('appointment-photos', 'appointment-photos', false)
on conflict (id) do update set public = excluded.public;

drop policy if exists "appointment_photos_member_read" on storage.objects;
drop policy if exists "appointment_photos_member_write" on storage.objects;
drop policy if exists "appointment_photos_member_delete" on storage.objects;

-- Leitura só por membros. Página pública usa signed URL (não passa por essa policy).
create policy "appointment_photos_member_read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'appointment-photos'
    and private.is_petshop_member(
      (split_part(name, '/', 1))::uuid
    )
  );

create policy "appointment_photos_member_write"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'appointment-photos'
    and private.has_petshop_role(
      (split_part(name, '/', 1))::uuid,
      array['owner', 'attendant', 'veterinarian']
    )
  );

create policy "appointment_photos_member_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'appointment-photos'
    and private.has_petshop_role(
      (split_part(name, '/', 1))::uuid,
      array['owner', 'attendant', 'veterinarian']
    )
  );
