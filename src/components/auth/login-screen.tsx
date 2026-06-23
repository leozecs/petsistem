import Link from "next/link";
import { PawPrint } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "@/app/auth-actions";
import { LoginSubmitButton } from "@/components/auth/login-submit-button";
import { RateLimitBanner } from "@/components/auth/rate-limit-banner";

const errorMessages: Record<string, string> = {
  "invalid-credentials": "Email ou senha inválidos.",
  "missing-fields": "Informe email e senha para continuar.",
  "supabase-not-configured": "Supabase não está configurado neste ambiente.",
  "profile-missing": "Sessão criada, mas o perfil não foi encontrado no banco.",
  "no-tenant": "Seu usuário não está vinculado a nenhuma loja ativa.",
  "tenant-blocked": "Sua loja está bloqueada. Procure o Admin Master.",
  "session-required": "Faça login para continuar.",
  "not-authorized": "Você não tem permissão para acessar essa área.",
  "email-not-confirmed":
    "Confirme seu email antes de entrar. Clica no link que a gente mandou pra você ou pede reenvio em /signup/success.",
  "rate-limited": "Muitas tentativas. Aguarde alguns minutos.",
};

export function LoginScreen({
  error,
  until,
}: {
  error?: string;
  until?: string;
}) {
  const isRateLimited =
    error === "rate-limited" && until && new Date(until).getTime() > Date.now();
  const errorMessage =
    error && !isRateLimited
      ? errorMessages[error] ?? "Não foi possível concluir o login."
      : null;

  return (
    <main
      className="grid min-h-[100dvh] bg-[#f7f5ef] text-zinc-950 lg:grid-cols-[1.1fr_1fr]"
      style={{ fontFamily: "var(--font-hanken), ui-sans-serif, system-ui" }}
    >
      {/* FORMULÁRIO */}
      <section className="flex items-center px-5 py-10 sm:px-8 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <Link
            href="/"
            className="mb-10 inline-flex items-center gap-2.5"
            aria-label="Voltar para PETSISTEM"
          >
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-800 text-[#f7f5ef]">
              <PawPrint className="size-4" strokeWidth={2.2} />
            </div>
            <span
              className="text-[15px] font-semibold tracking-tight text-zinc-900"
              style={{ fontFamily: "var(--font-bricolage)" }}
            >
              PETSISTEM
            </span>
          </Link>

          <p
            className="inline-flex items-center gap-2 rounded-full border border-emerald-800/15 bg-emerald-800/[0.06] px-3 py-1 text-[11px] font-medium text-emerald-900"
            style={{ fontFamily: "var(--font-hanken)" }}
          >
            <span className="size-1.5 rounded-full bg-emerald-800" />
            Acesso interno
          </p>

          <h1
            className="mt-5 text-[2.25rem] font-medium leading-[1.05] tracking-[-0.025em] text-zinc-950 sm:text-[2.75rem]"
            style={{
              fontFamily: "var(--font-bricolage)",
              fontVariationSettings: "'wdth' 90",
            }}
          >
            Entrar no
            <br />
            <span
              className="italic text-emerald-800"
              style={{ fontVariationSettings: "'wdth' 78" }}
            >
              PETSISTEM.
            </span>
          </h1>

          <p className="mt-4 max-w-sm text-[15px] leading-6 text-zinc-700">
            Use seu acesso de Admin Master, dono, atendente ou veterinário pra
            entrar no painel da sua loja.
          </p>

          {errorMessage ? (
            <div
              role="alert"
              className="mt-7 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3.5 text-sm leading-5 text-rose-800"
            >
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-rose-500" />
              <span>{errorMessage}</span>
            </div>
          ) : null}
          {isRateLimited && until ? <RateLimitBanner untilIso={until} /> : null}

          <form action={signIn} className="mt-7 space-y-4">
            <fieldset
              disabled={Boolean(isRateLimited)}
              className="space-y-4 disabled:opacity-60"
            >
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[13px] font-medium text-zinc-800">
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="seu@email.com"
                  className="h-12 rounded-lg border-zinc-300 bg-white px-4 text-[15px] shadow-sm focus-visible:border-emerald-700 focus-visible:ring-emerald-700/15"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="password"
                  className="text-[13px] font-medium text-zinc-800"
                >
                  Senha
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="h-12 rounded-lg border-zinc-300 bg-white px-4 text-[15px] shadow-sm focus-visible:border-emerald-700 focus-visible:ring-emerald-700/15"
                  required
                />
              </div>
              <LoginSubmitButton />
            </fieldset>
          </form>

        </div>
      </section>

      {/* PAINEL DA MARCA */}
      <section className="relative hidden overflow-hidden bg-emerald-800 text-[#f7f5ef] lg:block">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 -top-24 h-[360px] w-[360px] rounded-full bg-emerald-700/40 blur-[80px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 bottom-0 h-[420px] w-[420px] rounded-full bg-emerald-900/50 blur-[100px]"
        />

        <div className="relative flex h-full min-h-[100dvh] flex-col justify-between p-14">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-[#f7f5ef]/15 text-[#f7f5ef]">
              <PawPrint className="size-4" strokeWidth={2.2} />
            </div>
            <span
              className="text-[15px] font-semibold tracking-tight text-[#f7f5ef]"
              style={{ fontFamily: "var(--font-bricolage)" }}
            >
              PETSISTEM
            </span>
            <span className="ml-1 rounded-full border border-emerald-100/30 bg-emerald-100/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-100">
              Painel
            </span>
          </div>

          <div className="max-w-md space-y-7">
            <p
              className="text-[2.5rem] font-medium leading-[1.05] tracking-[-0.02em]"
              style={{
                fontFamily: "var(--font-bricolage)",
                fontVariationSettings: "'wdth' 85",
              }}
            >
              O dia do seu petshop{" "}
              <span
                className="italic text-emerald-200"
                style={{ fontVariationSettings: "'wdth' 78" }}
              >
                resolvido aqui dentro.
              </span>
            </p>
            <p className="max-w-sm text-[15px] leading-6 text-emerald-100/85">
              Agenda online, painel pra equipe, prontuário do veterinário e
              caixa do dia somando sozinho. Tudo num lugar só.
            </p>
          </div>

          <div className="flex items-center gap-2 text-[12px] text-emerald-100/70">
            <span className="h-px w-8 bg-emerald-300/40" />
            Petshop e clínica veterinária, no Brasil.
          </div>
        </div>
      </section>
    </main>
  );
}
