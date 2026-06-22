-- A membership alone must not grant data access when the tenant is blocked or
-- cancelled. Admin Master remains able to govern every tenant.
create or replace function private.is_petshop_member(target_petshop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select private.is_admin_master()
    or exists (
      select 1
      from public.memberships m
      join public.petshops p on p.id = m.petshop_id
      where m.petshop_id = target_petshop_id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and m.deleted_at is null
        and p.status in ('active', 'trial')
        and p.deleted_at is null
    );
$$;

create or replace function private.has_petshop_role(
  target_petshop_id uuid,
  allowed_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select private.is_admin_master()
    or exists (
      select 1
      from public.memberships m
      join public.petshops p on p.id = m.petshop_id
      where m.petshop_id = target_petshop_id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and m.deleted_at is null
        and m.role::text = any(allowed_roles)
        and p.status in ('active', 'trial')
        and p.deleted_at is null
    );
$$;

revoke all on function private.is_petshop_member(uuid) from public;
revoke all on function private.has_petshop_role(uuid, text[]) from public;
grant execute on function private.is_petshop_member(uuid)
  to anon, authenticated, service_role;
grant execute on function private.has_petshop_role(uuid, text[])
  to anon, authenticated, service_role;
