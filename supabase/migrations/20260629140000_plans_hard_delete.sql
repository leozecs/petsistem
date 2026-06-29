-- Plan deletion is an Admin Master-only server action. Existing shops keep
-- their display fallback in plan_name and lose only the deleted plan link.
alter table public.petshops
  drop constraint if exists petshops_plan_id_fkey;

alter table public.petshops
  add constraint petshops_plan_id_fkey
  foreign key (plan_id)
  references public.plans(id)
  on delete set null;
