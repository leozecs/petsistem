-- petshops missed updated_by in the initial schema; spec requires it on all entities.
alter table public.petshops add column if not exists updated_by uuid references public.users(id);
