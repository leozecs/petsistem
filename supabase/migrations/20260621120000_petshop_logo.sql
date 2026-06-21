-- Phase 10: branding por loja — coluna pra logo + bucket de Storage
--
-- petshops.logo_path armazena o path dentro do bucket público "petshop-logos".
-- O dono carrega o arquivo via /app/configuracoes; renderiza no AppShell e na
-- landing do subdomínio. Path fixo `<petshop_id>/logo.<ext>` simplifica
-- substituição (upsert) e RLS.

alter table public.petshops add column if not exists logo_path text;

-- Storage bucket público (todos leem; só dono escreve no path do próprio shop).
insert into storage.buckets (id, name, public)
values ('petshop-logos', 'petshop-logos', true)
on conflict (id) do update set public = excluded.public;

-- Limpa policies antigas se existirem (idempotência).
drop policy if exists "petshop_logos_public_read" on storage.objects;
drop policy if exists "petshop_logos_owner_write" on storage.objects;
drop policy if exists "petshop_logos_owner_update" on storage.objects;
drop policy if exists "petshop_logos_owner_delete" on storage.objects;

-- Leitura pública — logo aparece no booking sem auth.
create policy "petshop_logos_public_read"
  on storage.objects for select
  using (bucket_id = 'petshop-logos');

-- Escrita: apenas o owner do petshop cujo id casa com a primeira parte do path.
-- Path esperado: "<petshop_id>/logo.<ext>". A função extrai o uuid via split_part.
create policy "petshop_logos_owner_write"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'petshop-logos'
    and private.has_petshop_role(
      (split_part(name, '/', 1))::uuid,
      array['owner']
    )
  );

create policy "petshop_logos_owner_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'petshop-logos'
    and private.has_petshop_role(
      (split_part(name, '/', 1))::uuid,
      array['owner']
    )
  )
  with check (
    bucket_id = 'petshop-logos'
    and private.has_petshop_role(
      (split_part(name, '/', 1))::uuid,
      array['owner']
    )
  );

create policy "petshop_logos_owner_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'petshop-logos'
    and private.has_petshop_role(
      (split_part(name, '/', 1))::uuid,
      array['owner']
    )
  );
