-- Phase 8c: seed dos 3 planos padrão + tabela platform_settings
--
-- Aplicar manualmente via Supabase Dashboard → SQL Editor enquanto o MCP
-- estiver desconectado. Idempotente: pode rodar mais de uma vez sem efeito.

-- 1) Planos padrão
insert into public.plans (code, name, price_cents, max_users, allows_veterinarian, description, active)
values
  ('starter',      'Starter',      4900,  2,  false, 'Até 2 usuários (dono + atendente). Sem agenda veterinária.',  true),
  ('profissional', 'Profissional', 9900,  5,  true,  'Até 5 usuários, com agenda veterinária separada.',            true),
  ('premium',      'Premium',     19900, 12,  true,  'Até 12 usuários, dono define livremente cada role.',          true)
on conflict (code) do update
set
  name = excluded.name,
  price_cents = excluded.price_cents,
  max_users = excluded.max_users,
  allows_veterinarian = excluded.allows_veterinarian,
  description = excluded.description;

-- 2) platform_settings — linha única (id=1) com configurações globais do SaaS
create table if not exists public.platform_settings (
  id smallint primary key default 1,
  pix_key text,
  pix_holder_name text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users(id),
  constraint platform_settings_singleton check (id = 1)
);

alter table public.platform_settings enable row level security;

drop policy if exists "admin_master_all_platform_settings" on public.platform_settings;
create policy "admin_master_all_platform_settings"
  on public.platform_settings for all
  to authenticated
  using (private.is_admin_master())
  with check (private.is_admin_master());

-- Garante uma linha inicial pra UPDATE sempre funcionar
insert into public.platform_settings (id) values (1) on conflict do nothing;
