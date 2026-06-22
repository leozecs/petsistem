-- Phase 17: intervalo (gap) entre agendamentos configurável por loja.
-- Default 30min mantém comportamento legado.
alter table public.petshops
  add column if not exists slot_minutes integer not null default 30
  check (slot_minutes in (15, 20, 30, 45, 60));
