-- Phase 7.8: link veterinarians to a login (auth users) — mirror of 7.7 employees.
-- When the owner cadastra a vet, the SaaS provisions a Supabase Auth user
-- and a `veterinarian` membership. veterinarians.user_id stores that link.

alter table public.veterinarians add column user_id uuid references public.users(id) on delete set null;

create unique index veterinarians_user_id_active_idx
  on public.veterinarians(user_id)
  where user_id is not null and deleted_at is null;
