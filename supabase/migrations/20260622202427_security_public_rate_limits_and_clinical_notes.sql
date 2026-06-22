-- Security hardening for unauthenticated flows and veterinary records.

-- Global abuse-control data. This table is infrastructure state, not tenant
-- business data, so it intentionally has no petshop_id.
create table public.public_action_attempts (
  id bigint generated always as identity primary key,
  action text not null check (char_length(action) between 1 and 64),
  key_hash text not null check (key_hash ~ '^[a-f0-9]{64}$'),
  attempted_at timestamptz not null default now()
);

create index public_action_attempts_lookup_idx
  on public.public_action_attempts (action, key_hash, attempted_at desc);

alter table public.public_action_attempts enable row level security;
revoke all on public.public_action_attempts from public, anon, authenticated;

-- Called only by server-side service_role. Advisory lock makes count+insert
-- atomic for each action/key pair, preventing concurrent burst bypass.
create or replace function public.consume_public_rate_limit(
  p_action text,
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
volatile
set search_path = public
as $$
declare
  recent_count integer;
begin
  if char_length(p_action) not between 1 and 64
     or p_key_hash !~ '^[a-f0-9]{64}$'
     or p_limit < 1
     or p_window_seconds < 1 then
    raise exception 'invalid rate limit arguments';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_action || ':' || p_key_hash, 0));

  delete from public.public_action_attempts
  where action = p_action
    and key_hash = p_key_hash
    and attempted_at < now() - make_interval(secs => p_window_seconds);

  select count(*)::integer into recent_count
  from public.public_action_attempts
  where action = p_action
    and key_hash = p_key_hash
    and attempted_at >= now() - make_interval(secs => p_window_seconds);

  if recent_count >= p_limit then
    return false;
  end if;

  insert into public.public_action_attempts (action, key_hash)
  values (p_action, p_key_hash);
  return true;
end;
$$;

revoke all on function public.consume_public_rate_limit(text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_public_rate_limit(text, text, integer, integer)
  to service_role;

-- Clinical records contain sensitive veterinary data. Attendants keep access
-- to operational appointments/checklists, but not clinical notes.
drop policy if exists "tenant members read clinical notes" on public.clinical_notes;
drop policy if exists "owners and veterinarians read clinical notes" on public.clinical_notes;
create policy "owners and veterinarians read clinical notes"
  on public.clinical_notes
  for select
  to authenticated
  using (
    deleted_at is null
    and private.has_petshop_role(petshop_id, array['owner', 'veterinarian'])
  );
