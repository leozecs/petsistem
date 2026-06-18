import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { signIn } from "@/app/auth-actions";

export function LoginScreen({ error }: { error?: string }) {
  return (
    <main className="grid min-h-[100dvh] bg-zinc-100 text-zinc-950 lg:grid-cols-[1fr_0.9fr]">
      <section className="flex items-center px-4 py-8 sm:px-6 lg:px-12">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-zinc-950 text-sm font-bold text-white">
              PS
            </div>
            <div>
              <p className="text-sm font-semibold">PETSISTEM</p>
              <p className="text-xs text-zinc-500">Acesso administrativo</p>
            </div>
          </div>

          <Card className="rounded-xl border-zinc-200 bg-white shadow-none">
            <CardContent className="p-6 sm:p-8">
              <div className="flex size-12 items-center justify-center rounded-lg bg-zinc-950 text-white">
                <LockKeyhole className="size-5" />
              </div>
              <h1 className="mt-6 text-3xl font-semibold tracking-tight">Entrar no PETSISTEM</h1>
              <p className="mt-3 text-sm leading-6 text-zinc-600">
                Use seu acesso de Admin Master, dono, atendente ou veterinário para entrar no painel.
              </p>
              {error ? (
                <div className="mt-5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                  Email ou senha inválidos.
                </div>
              ) : null}
              <form action={signIn} className="mt-8 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    defaultValue="leocodes.dev@gmail.com"
                    className="rounded-md"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Sua senha"
                    className="rounded-md"
                  />
                </div>
                <button
                  type="submit"
                  className={cn(
                    buttonVariants(),
                    "h-11 w-full rounded-md bg-zinc-950 text-white hover:bg-zinc-800",
                  )}
                >
                  Entrar
                </button>
              </form>
              <div className="mt-5 rounded-lg bg-zinc-50 p-4 text-sm leading-6 text-zinc-600">
                Ao configurar o Supabase, a rota <code className="font-mono text-zinc-950">/api/setup/admin-master</code>{" "}
                cria ou atualiza este usuário como Admin Master.
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
      <section className="hidden overflow-hidden bg-zinc-950 lg:block">
        <div
          className="h-full min-h-[100dvh] opacity-70"
          style={{
            backgroundImage: "url(https://picsum.photos/seed/petsistem-login/1400/1600)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "grayscale(1) contrast(1.2)",
          }}
        />
      </section>
    </main>
  );
}
