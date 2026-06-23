-- Buckets públicos servem objetos por URL sem policy SELECT em storage.objects.
-- Remover esta policy impede enumeração/listagem de logos entre tenants.
drop policy if exists "petshop_logos_public_read" on storage.objects;
