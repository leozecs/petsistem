-- Phase 6: prevent overlapping appointments per calendar via Postgres EXCLUDE constraint.
-- Generated tstzrange column + GiST exclusion constraint. Only enforces on valid statuses
-- (not cancelled / no_show) and non-deleted rows.

create extension if not exists btree_gist;

alter table public.appointments
  add column if not exists duration_range tstzrange
  generated always as (tstzrange(starts_at, ends_at, '[)')) stored;

alter table public.appointments
  add constraint appointments_no_overlap
  exclude using gist (
    calendar_id with =,
    duration_range with &&
  )
  where (status not in ('cancelled', 'no_show') and deleted_at is null);

comment on constraint appointments_no_overlap on public.appointments is
  'Hard guarantee: no two valid appointments per calendar may overlap in time.';
