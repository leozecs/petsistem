-- Phase 13: rate limit no /login (3 tentativas em 15 min por email OU ip).
--
-- Tabela registra cada tentativa pra que o server consiga decidir se bloqueia
-- a próxima. RLS bloqueia tudo — só a server action (rodando com service role
-- ou autenticada com auth.uid() = null) lê/escreve.

create table public.login_attempts (
  id bigserial primary key,
  email text not null,
  ip text,
  succeeded boolean not null default false,
  attempted_at timestamptz not null default now()
);

create index login_attempts_email_time_idx
  on public.login_attempts(email, attempted_at desc);

create index login_attempts_ip_time_idx
  on public.login_attempts(ip, attempted_at desc)
  where ip is not null;

alter table public.login_attempts enable row level security;

-- Sem policies = ninguém com role authenticated/anon consegue ler/escrever.
-- O server action usa o admin client (service_role) que ignora RLS.
