import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "@/app/auth-actions";
import { PetsistemLogo } from "@/components/brand/logo";
import { LoginSubmitButton } from "@/components/auth/login-submit-button";

const errorMessages: Record<string, string> = {
  "invalid-credentials": "Email ou senha invalidos.",
  "missing-fields": "Informe email e senha para continuar.",
  "supabase-not-configured": "Supabase nao esta configurado neste ambiente.",
  "profile-missing": "Sessao criada mas o perfil nao foi encontrado no banco.",
  "no-tenant": "Seu usuario nao esta vinculado a nenhuma loja ativa.",
  "tenant-blocked": "Sua loja esta bloqueada. Procure o Admin Master.",
  "session-required": "Faca login para continuar.",
  "not-authorized": "Voce nao tem permissao para acessar essa area.",
};

export function LoginScreen({ error }: { error?: string }) {
  const errorMessage = error ? (errorMessages[error] ?? "Nao foi possivel concluir o login.") : null;

  return (
    <main className="grid min-h-[100dvh] bg-zinc-100 text-zinc-950 lg:grid-cols-[1fr_0.9fr]">
      <section className="flex items-center px-4 py-8 sm:px-6 lg:px-12">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-10 w-40 items-center overflow-hidden">
              <PetsistemLogo tone="dark" className="w-40" priority />
            </div>
            <p className="text-xs text-zinc-500">Acesso administrativo</p>
          </div>

          <Card className="rounded-xl border-zinc-200 bg-white shadow-none">
            <CardContent className="p-6 sm:p-8">
              <div className="flex size-12 items-center justify-center rounded-lg bg-zinc-950 text-white">
                <LockKeyhole className="size-5" />
              </div>
              <h1 className="mt-6 text-3xl font-semibold tracking-tight">Entrar no PETSISTEM</h1>
              <p className="mt-3 text-sm leading-6 text-zinc-600">
                Use seu acesso de Admin Master, dono, atendente ou veterinario para entrar no painel.
              </p>
              {errorMessage ? (
                <div className="mt-5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                  {errorMessage}
                </div>
              ) : null}
              <form action={signIn} className="mt-8 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="seu@email.com"
                    className="rounded-md"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Sua senha"
                    className="rounded-md"
                    required
                  />
                </div>
                <LoginSubmitButton />
              </form>
              <div className="mt-5 rounded-lg bg-zinc-50 p-4 text-sm leading-6 text-zinc-600">
                Ao configurar o Supabase, a rota <code className="font-mono text-zinc-950">/api/setup/admin-master</code>{" "}
                cria ou atualiza este usuario como Admin Master.
              </div>
            </CardContent>
          </Card>

          <div className="mt-5 text-center text-sm text-zinc-600">
            Quer testar um agendamento? Acesse{" "}
            <Link href="/loja/petgres" className="font-semibold text-zinc-950 underline underline-offset-4">
              /loja/petgres
            </Link>
            .
          </div>
        </div>
      </section>
      <section className="relative hidden overflow-hidden bg-black text-white lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(255,255,255,0.12),transparent_34%)]" />
        <div className="relative flex h-full min-h-[100dvh] items-center justify-center px-16">
          <PetsistemLogo tone="light" className="w-full max-w-xl drop-shadow-[0_24px_60px_rgba(255,255,255,0.08)]" priority />
        </div>
      </section>
    </main>
  );
}
