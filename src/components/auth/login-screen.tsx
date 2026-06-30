import Image from "next/image";
import Link from "next/link";
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
  "tenant-blocked": "Sua loja está bloqueada. Procure o suporte do PETSISTEM.",
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
      className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-white px-5 py-10 text-zinc-950"
      style={{ fontFamily: "var(--font-hanken), ui-sans-serif, system-ui" }}
    >
      <div aria-hidden className="absolute inset-y-0 left-0 w-1/2 bg-white" />
      <div aria-hidden className="absolute inset-y-0 right-0 w-1/2 bg-zinc-950" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-1/2 w-16 -translate-x-1/2 bg-gradient-to-r from-white via-white/35 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-1/2 w-16 bg-gradient-to-r from-transparent via-zinc-950/35 to-zinc-950"
      />

      <section className="relative z-10 w-full max-w-md">
        <Link
          href="/"
          className="relative mx-auto mb-9 block h-11 w-64"
          aria-label="Voltar para PETSISTEM"
        >
          <span className="absolute inset-y-0 left-0 w-1/2 overflow-hidden">
            <Image
              src="/brand/petsistem-logo-dark.png"
              alt="PETSISTEM"
              width={208}
              height={46}
              priority
              sizes="208px"
              className="absolute left-12 top-1/2 h-auto w-52 max-w-none -translate-y-1/2"
            />
          </span>
          <span className="absolute inset-y-0 right-0 w-1/2 overflow-hidden">
            <Image
              src="/brand/petsistem-logo-light.png"
              alt=""
              width={208}
              height={46}
              priority
              sizes="208px"
              className="absolute left-[-80px] top-1/2 h-auto w-52 max-w-none -translate-y-1/2"
            />
          </span>
        </Link>

        <div className="rounded-lg border border-zinc-200 bg-[#f7f5ef] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.18)] sm:p-8">
          <h1
            className="text-[2.2rem] font-medium leading-[1.08] text-zinc-950"
            style={{
              fontFamily: "var(--font-bricolage)",
              fontVariationSettings: "'wdth' 90",
            }}
          >
            Entrar no
            <br />
            <span
              className="italic text-zinc-950"
              style={{ fontVariationSettings: "'wdth' 78" }}
            >
              PETSISTEM.
            </span>
          </h1>

          <p className="mt-4 text-[15px] leading-6 text-zinc-700">
            Use seu acesso de dono de pet, atendente ou veterinária para entrar
            no painel da sua loja.
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
                <Label
                  htmlFor="email"
                  className="text-[13px] font-medium text-zinc-800"
                >
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="seu@email.com"
                  className="h-12 rounded-lg border-zinc-300 bg-white px-4 text-[15px] shadow-sm focus-visible:border-zinc-950 focus-visible:ring-zinc-950/15"
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
                  className="h-12 rounded-lg border-zinc-300 bg-white px-4 text-[15px] shadow-sm focus-visible:border-zinc-950 focus-visible:ring-zinc-950/15"
                  required
                />
              </div>
              <LoginSubmitButton />
            </fieldset>
          </form>
        </div>
      </section>
    </main>
  );
}
