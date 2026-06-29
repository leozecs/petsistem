-- A aplicação emite signed upload URLs após validar sessão, tenant, role,
-- tamanho e MIME. Nenhum cliente precisa de acesso direto a storage.objects.
drop policy if exists "petshop_logos_owner_write" on storage.objects;
drop policy if exists "petshop_logos_owner_update" on storage.objects;
drop policy if exists "petshop_logos_owner_delete" on storage.objects;
