-- Phase 0 hardening moved the helpers to schema `private` via ALTER FUNCTION SET SCHEMA,
-- but that does NOT rewrite the function body. is_petshop_member and has_petshop_role
-- still called public.is_admin_master() inside, which fails because that function now
-- lives in private. Recreate the helpers with correct fully-qualified references.

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
      where m.petshop_id = target_petshop_id
        and m.user_id = auth.uid()
        and m.status = 'active'
    );
$$;

create or replace function private.has_petshop_role(target_petshop_id uuid, allowed_roles text[])
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
      where m.petshop_id = target_petshop_id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and m.role::text = any(allowed_roles)
    );
$$;
