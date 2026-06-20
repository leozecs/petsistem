-- Phase 7.7: link employees to a login (auth users)
--
-- When the owner creates a funcionário, the SaaS provisions a Supabase Auth user
-- and an attendant membership. employees.user_id stores that link so the same
-- person editing the funcionário row also reactivates/suspends their login.

alter table public.employees add column user_id uuid references public.users(id) on delete set null;

-- One ACTIVE employee row per user — prevents duplicate funcionário cards for
-- the same login. Soft-deleted rows are excluded so a name can be re-added.
create unique index employees_user_id_active_idx
  on public.employees(user_id)
  where user_id is not null and deleted_at is null;
