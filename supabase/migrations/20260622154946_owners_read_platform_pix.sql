-- Donos autenticados precisam ler somente a configuracao Pix global usada
-- para pagar a assinatura. A policy nao libera escrita nem outras roles.

create or replace function private.is_petshop_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships m
    where m.user_id = (select auth.uid())
      and m.role = 'owner'
      and m.status = 'active'
      and m.deleted_at is null
  );
$$;

revoke all on function private.is_petshop_owner() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_petshop_owner() to authenticated;

grant select (id, pix_key, pix_holder_name)
  on public.platform_settings
  to authenticated;

drop policy if exists "owners_read_platform_pix" on public.platform_settings;
create policy "owners_read_platform_pix"
  on public.platform_settings
  for select
  to authenticated
  using (private.is_petshop_owner());
