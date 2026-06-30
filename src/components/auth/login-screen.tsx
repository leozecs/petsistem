import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "@/app/auth-actions";
import { LoginSubmitButton } from "@/components/auth/login-submit-button";
import { RateLimitBanner } from "@/components/auth/rate-limit-banner";
import { PetsistemLogo } from "@/components/brand/logo";

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
      className="grid min-h-[100dvh] bg-[#f7f5ef] text-zinc-950 lg:grid-cols-[1.08fr_1fr]"
      style={{ fontFamily: "var(--font-hanken), ui-sans-serif, system-ui" }}
    >
      <section className="flex items-center px-5 py-10 sm:px-8 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <Link
            href="/"
            className="mb-11 inline-flex"
            aria-label="Voltar para PETSISTEM"
          >
            <PetsistemLogo tone="dark" className="w-40" priority />
          </Link>

          <h1
            className="text-[2.25rem] font-medium leading-[1.08] text-zinc-950 sm:text-[2.75rem]"
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

      <section className="relative hidden overflow-hidden bg-zinc-950 text-white lg:block">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:96px_96px] opacity-30"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute left-14 top-0 h-full w-px bg-white/15"
        />

        <div className="relative flex h-full min-h-[100dvh] flex-col justify-between p-14">
          <div className="flex justify-end">
            <span className="border border-white/25 px-3 py-1 text-[11px] font-semibold uppercase text-white/80">
              Sistema operacional
            </span>
          </div>

          <div className="max-w-lg space-y-8">
            <p
              className="text-[3rem] font-medium leading-[1.02] sm:text-[3.4rem]"
              style={{
                fontFamily: "var(--font-bricolage)",
                fontVariationSettings: "'wdth' 85",
              }}
            >
              Gestão do petshop, agenda e clínica{" "}
              <span
                className="italic text-white/70"
                style={{ fontVariationSettings: "'wdth' 78" }}
              >
                num só painel.
              </span>
            </p>
            <p className="max-w-md text-[16px] leading-7 text-white/72">
              O PETSISTEM reúne agendamentos, equipe, clientes, pets,
              prontuário veterinário e rotina financeira para a loja operar com
              menos retrabalho.
            </p>
            <div className="grid max-w-md grid-cols-3 border-y border-white/18 text-white">
              {["Agenda", "Prontuário", "Caixa"].map((item) => (
                <div
                  key={item}
                  className="border-r border-white/18 px-4 py-4 text-[12px] font-semibold uppercase last:border-r-0"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-[12px] text-white/58">
            <span className="h-px w-8 bg-white/35" />
            Petshop e clínica veterinária, no Brasil.
          </div>
        </div>
      </section>
    </main>
  );
}
