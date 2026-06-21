-- Phase 10 fix: owner não tinha UPDATE em public.petshops, então
-- updatePetshopGeneral / updatePetshopVisual / uploadPetshopLogo retornavam ok
-- mas RLS suprimia silenciosamente as escritas. Policy abre UPDATE pro dono
-- do petshop. A action server-side já restringe quais colunas são tocadas
-- (name, legal_name, address, phone, whatsapp, email, primary_color, logo_path),
-- e admin master continua tendo poder total via a policy ALL existente.

drop policy if exists "owners update own petshop" on public.petshops;

create policy "owners update own petshop"
  on public.petshops for update
  to authenticated
  using (private.has_petshop_role(id, array['owner']))
  with check (private.has_petshop_role(id, array['owner']));
