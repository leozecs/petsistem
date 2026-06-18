-- Phase 0 hardening: move RLS helpers out of the public/PostgREST surface
-- and fix mutable search_path on the updated_at trigger.

alter function public.set_updated_at() set search_path = pg_catalog;

create schema if not exists private;
grant usage on schema private to anon, authenticated, service_role;

alter function public.is_admin_master() set schema private;
alter function public.is_petshop_member(uuid) set schema private;
alter function public.has_petshop_role(uuid, text[]) set schema private;

alter function private.is_admin_master() set search_path = pg_catalog, public;
alter function private.is_petshop_member(uuid) set search_path = pg_catalog, public;
alter function private.has_petshop_role(uuid, text[]) set search_path = pg_catalog, public;

grant execute on function private.is_admin_master() to anon, authenticated, service_role;
grant execute on function private.is_petshop_member(uuid) to anon, authenticated, service_role;
grant execute on function private.has_petshop_role(uuid, text[]) to anon, authenticated, service_role;
