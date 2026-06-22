-- Phase 14.1: categorias editáveis de receita+despesa, receitas avulsas,
-- tracking_slug humano-friendly, etapas de checklist por serviço, foto.

-- ============================================================================
-- 1. Categorias unificadas (receita+despesa) editáveis pela loja
-- ============================================================================

create type public.category_kind as enum ('revenue', 'expense');

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  petshop_id uuid not null references public.petshops(id) on delete cascade,
  kind public.category_kind not null,
  name text not null,
  description text,
  active boolean not null default true,
  position integer not null default 0,
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Mesmo nome só pode aparecer uma vez por (loja, tipo, ativo). Inativas podem
-- repetir pra preservar histórico após rename.
create unique index categories_unique_active_name
  on public.categories(petshop_id, kind, lower(name))
  where active;

create index categories_petshop_kind_idx
  on public.categories(petshop_id, kind, position)
  where active;

alter table public.categories enable row level security;

create policy "admin_master_read_categories"
  on public.categories for select to authenticated
  using (private.is_admin_master());

create policy "tenant_read_categories"
  on public.categories for select to authenticated
  using (private.is_petshop_member(petshop_id));

-- Só owner gerencia categorias (financeiro estratégico)
create policy "owner_insert_categories"
  on public.categories for insert to authenticated
  with check (private.has_petshop_role(petshop_id, array['owner']));

create policy "owner_update_categories"
  on public.categories for update to authenticated
  using (private.has_petshop_role(petshop_id, array['owner']))
  with check (private.has_petshop_role(petshop_id, array['owner']));

create policy "owner_delete_categories"
  on public.categories for delete to authenticated
  using (private.has_petshop_role(petshop_id, array['owner']));

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 2. Categoria opcional em expenses (FK -> categories). Mantém enum legado
-- como fallback durante migração — coluna `category` continua existindo.
-- ============================================================================

alter table public.expenses
  add column category_id uuid references public.categories(id);

create index expenses_category_idx
  on public.expenses(category_id)
  where deleted_at is null;

-- ============================================================================
-- 3. Receitas avulsas (sem vínculo com appointment)
--    Para: venda de produto no balcão, gorjeta, reembolso, etc.
--    Receita de serviço continua via appointment_charges.
-- ============================================================================

create table public.revenue_items (
  id uuid primary key default gen_random_uuid(),
  petshop_id uuid not null references public.petshops(id) on delete cascade,
  category_id uuid references public.categories(id),
  description text not null,
  amount_cents integer not null check (amount_cents > 0),
  payment_method public.payment_method not null,
  received_at date not null default current_date,
  notes text,
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  deleted_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index revenue_items_petshop_date_idx
  on public.revenue_items(petshop_id, received_at desc)
  where deleted_at is null;

create index revenue_items_category_idx
  on public.revenue_items(category_id)
  where deleted_at is null;

alter table public.revenue_items enable row level security;

create policy "admin_master_read_revenue_items"
  on public.revenue_items for select to authenticated
  using (private.is_admin_master());

create policy "tenant_read_revenue_items"
  on public.revenue_items for select to authenticated
  using (private.is_petshop_member(petshop_id));

create policy "tenant_insert_revenue_items"
  on public.revenue_items for insert to authenticated
  with check (private.has_petshop_role(petshop_id, array['owner', 'attendant']));

create policy "tenant_update_revenue_items"
  on public.revenue_items for update to authenticated
  using (private.has_petshop_role(petshop_id, array['owner', 'attendant']))
  with check (private.has_petshop_role(petshop_id, array['owner', 'attendant']));

-- Soft delete só pelo owner
create policy "owner_delete_revenue_items"
  on public.revenue_items for delete to authenticated
  using (private.has_petshop_role(petshop_id, array['owner']));

create trigger revenue_items_set_updated_at
  before update on public.revenue_items
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 4. tracking_slug em appointments (humano-friendly + anti-enumerável)
--    Formato gerado em app code: `<pet-slug>-<YYYY-MM-DD>-<token4>`
--    Mantemos public_tracking_code legado pra não quebrar links antigos.
-- ============================================================================

alter table public.appointments
  add column tracking_slug text;

create unique index appointments_tracking_slug_idx
  on public.appointments(tracking_slug)
  where tracking_slug is not null;

-- ============================================================================
-- 5. Etapas de checklist por serviço (não só global por loja)
--    checklist_steps já existe com (petshop_id, label, position). Adiciono
--    service_id nullable: NULL = template global da loja (continua válido pra
--    backcompat); preenchido = etapa específica de um serviço.
-- ============================================================================

alter table public.checklist_steps
  add column service_id uuid references public.services(id) on delete cascade;

-- Drop o unique antigo (petshop_id, position) que conflita com etapas por
-- serviço (cada serviço terá sua própria position 1).
alter table public.checklist_steps
  drop constraint if exists checklist_steps_petshop_id_position_key;

-- Position única por escopo (loja+serviço, onde service_id NULL = template global)
create unique index checklist_steps_position_scope_idx
  on public.checklist_steps(
    petshop_id,
    coalesce(service_id, '00000000-0000-0000-0000-000000000000'::uuid),
    position
  )
  where active;

create index checklist_steps_service_idx
  on public.checklist_steps(petshop_id, service_id)
  where active;

-- ============================================================================
-- 6. Foto opcional por etapa do checklist (ex: foto do pet antes/depois)
-- ============================================================================

alter table public.checklists
  add column photo_path text;

-- ============================================================================
-- 7. Seed: categorias default por petshop existente
-- ============================================================================

do $$
declare
  ps record;
begin
  for ps in select id from public.petshops loop
    insert into public.categories (petshop_id, kind, name, position)
    values
      (ps.id, 'revenue', 'Banho e tosa', 10),
      (ps.id, 'revenue', 'Consulta veterinária', 20),
      (ps.id, 'revenue', 'Venda de produtos', 30),
      (ps.id, 'revenue', 'Outros', 99),
      (ps.id, 'expense', 'Produtos', 10),
      (ps.id, 'expense', 'Folha de pagamento', 20),
      (ps.id, 'expense', 'Aluguel', 30),
      (ps.id, 'expense', 'Energia e água', 40),
      (ps.id, 'expense', 'Marketing', 50),
      (ps.id, 'expense', 'Equipamento', 60),
      (ps.id, 'expense', 'Veterinário externo', 70),
      (ps.id, 'expense', 'Outros', 99)
    on conflict do nothing;
  end loop;
end $$;

-- ============================================================================
-- 8. Backfill: mapeia o enum legado expense_category para category_id
-- ============================================================================

do $$
declare
  e record;
  cat_id uuid;
  cat_name text;
begin
  for e in select id, petshop_id, category from public.expenses where category_id is null and deleted_at is null loop
    cat_name := case e.category::text
      when 'rent' then 'Aluguel'
      when 'utilities' then 'Energia e água'
      when 'payroll' then 'Folha de pagamento'
      when 'supplies' then 'Produtos'
      when 'services' then 'Veterinário externo'
      when 'maintenance' then 'Equipamento'
      when 'marketing' then 'Marketing'
      when 'taxes' then 'Outros'
      else 'Outros'
    end;

    select id into cat_id
    from public.categories
    where petshop_id = e.petshop_id
      and kind = 'expense'
      and lower(name) = lower(cat_name)
      and active
    limit 1;

    if cat_id is not null then
      update public.expenses set category_id = cat_id where id = e.id;
    end if;
  end loop;
end $$;
