"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Mail,
  PawPrint,
  ShieldCheck,
  Sparkles,
  Store,
  User,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PetsistemLogo } from "@/components/brand/logo";
import { signupTenant } from "@/app/signup/actions";

const formSchema = z
  .object({
    shop_name: z.string().trim().min(2, "Nome muito curto"),
    owner_name: z.string().trim().min(2, "Seu nome muito curto"),
    whatsapp: z.string().trim().min(8, "WhatsApp invalido"),
    email: z.string().trim().email("Email invalido"),
    password: z.string().min(8, "Minimo 8 caracteres"),
    confirm: z.string().min(8, "Confirme a senha"),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "As senhas nao conferem",
  });

type FormValues = z.infer<typeof formSchema>;
type SignupMode = "trial" | "paid";
type BillingCycle = "monthly" | "annual";

export function SignupForm({
  mode = "trial",
  plan,
  billing = "monthly",
}: {
  mode?: SignupMode;
  plan?: string;
  billing?: BillingCycle;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const paidSignup = mode === "paid";

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      shop_name: "",
      owner_name: "",
      whatsapp: "",
      email: "",
      password: "",
      confirm: "",
    },
  });

  function onSubmit(values: FormValues) {
    const fd = new FormData();
    fd.set("shop_name", values.shop_name);
    fd.set("owner_name", values.owner_name);
    fd.set("whatsapp", values.whatsapp);
    fd.set("email", values.email);
    fd.set("password", values.password);
    fd.set("confirm", values.confirm);
    fd.set("mode", mode);
    if (plan) fd.set("plan", plan);
    fd.set("billing", billing);

    startTransition(async () => {
      const result = await signupTenant(fd);
      if (result.ok) {
        const params = new URLSearchParams({
          email: result.email,
          mode: result.mode,
          shop: result.shopName,
          plan: result.planName,
          amount: String(result.amountCents),
          billing: result.billing,
        });
        router.push(`/signup/success?${params.toString()}`);
      } else if (result.fieldErrors) {
        for (const [k, msg] of Object.entries(result.fieldErrors)) {
          form.setError(k as keyof FormValues, { message: msg });
        }
        if (result.error) toast.error(result.error);
      } else {
        toast.error(result.error ?? "Erro ao criar conta");
      }
    });
  }

  return (
    <main className="grid min-h-[100dvh] bg-zinc-950 text-white lg:grid-cols-[1.1fr_1fr]">
      <section className="flex items-center justify-center px-4 py-10 sm:px-6 sm:py-14">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-7 w-32 items-center overflow-hidden">
              <PetsistemLogo tone="light" className="w-32" />
            </div>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[0.625rem] font-semibold text-emerald-300">
              {paidSignup ? "Plano escolhido" : "Cadastro"}
            </span>
          </div>

          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {paidSignup ? "Finalize sua loja com Pix" : "Bora abrir sua loja"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            {paidSignup
              ? "Cadastre a loja, pague via Pix e envie o comprovante. O Admin Master valida manualmente e libera seu login."
              : "Em menos de 1 minuto seu petshop fica no ar. 7 dias gratis pra testar tudo, sem cartao."}
          </p>

          {paidSignup ? (
            <div className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-50">
              <p className="font-semibold">Pagamento apos cadastro</p>
              <p className="mt-1 text-xs leading-5 text-emerald-100">
                Plano: {plan ?? "selecionado"} · {billing === "annual" ? "anual" : "mensal"}.
                A conta fica como solicitacao ate validacao do Pix.
              </p>
            </div>
          ) : null}

          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="shop_name" className="text-zinc-200">
                Nome da loja
              </Label>
              <Input
                id="shop_name"
                placeholder="Ex: Petgres Banho e Tosa"
                className="border-white/10 bg-white/5 text-white placeholder:text-zinc-500 focus-visible:border-emerald-400 focus-visible:ring-emerald-400/30"
                {...form.register("shop_name")}
              />
              {form.formState.errors.shop_name ? (
                <p className="text-xs text-rose-400">
                  {form.formState.errors.shop_name.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner_name" className="text-zinc-200">
                Seu nome
              </Label>
              <Input
                id="owner_name"
                placeholder="Nome completo"
                autoComplete="name"
                className="border-white/10 bg-white/5 text-white placeholder:text-zinc-500 focus-visible:border-emerald-400 focus-visible:ring-emerald-400/30"
                {...form.register("owner_name")}
              />
              {form.formState.errors.owner_name ? (
                <p className="text-xs text-rose-400">
                  {form.formState.errors.owner_name.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp" className="text-zinc-200">
                WhatsApp
              </Label>
              <Input
                id="whatsapp"
                placeholder="(11) 99999-9999"
                autoComplete="tel"
                className="border-white/10 bg-white/5 text-white placeholder:text-zinc-500 focus-visible:border-emerald-400 focus-visible:ring-emerald-400/30"
                {...form.register("whatsapp")}
              />
              {form.formState.errors.whatsapp ? (
                <p className="text-xs text-rose-400">
                  {form.formState.errors.whatsapp.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-200">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                autoComplete="email"
                className="border-white/10 bg-white/5 text-white placeholder:text-zinc-500 focus-visible:border-emerald-400 focus-visible:ring-emerald-400/30"
                {...form.register("email")}
              />
              {form.formState.errors.email ? (
                <p className="text-xs text-rose-400">
                  {form.formState.errors.email.message}
                </p>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-zinc-200">
                  Senha
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Minimo 8"
                  autoComplete="new-password"
                  className="border-white/10 bg-white/5 text-white placeholder:text-zinc-500 focus-visible:border-emerald-400 focus-visible:ring-emerald-400/30"
                  {...form.register("password")}
                />
                {form.formState.errors.password ? (
                  <p className="text-xs text-rose-400">
                    {form.formState.errors.password.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm" className="text-zinc-200">
                  Confirmar
                </Label>
                <Input
                  id="confirm"
                  type="password"
                  placeholder="Repete a senha"
                  autoComplete="new-password"
                  className="border-white/10 bg-white/5 text-white placeholder:text-zinc-500 focus-visible:border-emerald-400 focus-visible:ring-emerald-400/30"
                  {...form.register("confirm")}
                />
                {form.formState.errors.confirm ? (
                  <p className="text-xs text-rose-400">
                    {form.formState.errors.confirm.message}
                  </p>
                ) : null}
              </div>
            </div>

            <Button
              type="submit"
              disabled={pending}
              className="h-11 w-full rounded-md bg-emerald-400 font-semibold text-zinc-950 hover:bg-emerald-300"
            >
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Criando sua loja...
                </>
              ) : (
                <>
                  <Zap className="size-4" />
                  {paidSignup ? "Cadastrar e ver Pix" : "Criar minha loja gratis"}
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>

            <p className="text-center text-xs text-zinc-500">
              Ja tem conta?{" "}
              <Link
                href="/login"
                className="font-semibold text-zinc-300 underline underline-offset-2 hover:text-white"
              >
                Entrar
              </Link>
            </p>
          </form>

          <Link
            href="/"
            className="mt-8 inline-flex items-center gap-1.5 text-xs text-zinc-500 transition hover:text-zinc-300"
          >
            <ArrowLeft className="size-3" />
            Voltar pra landing
          </Link>
        </div>
      </section>

      <aside className="hidden border-l border-white/5 bg-gradient-to-br from-zinc-900 to-zinc-950 lg:block">
        <div className="relative flex h-full flex-col justify-center overflow-hidden px-12 py-16">
          <div
            aria-hidden
            className="absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(50% 50% at 50% 30%, rgba(16,185,129,0.18), rgba(0,0,0,0) 70%)",
            }}
          />
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-25">
            <PawPrint className="absolute right-[10%] top-20 size-6 rotate-12 text-emerald-300/50" />
            <Sparkles className="absolute left-[12%] top-40 size-5 text-amber-300/50" />
            <PawPrint className="absolute left-[18%] bottom-32 size-5 rotate-45 text-pink-300/40" />
          </div>

          <div className="max-w-md">
            <h2 className="text-3xl font-semibold tracking-tight">
              O que vai estar pronto quando voce logar
            </h2>
            <ul className="mt-8 space-y-5 text-sm">
              <li className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300">
                  <Store className="size-4" />
                </div>
                <div>
                  <p className="font-semibold">Subdominio proprio</p>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    A gente cria um endereco pra sua loja. Voce troca depois se quiser.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-300">
                  <Sparkles className="size-4" />
                </div>
                <div>
                  <p className="font-semibold">Banho e tosa + veterinaria</p>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    Calendarios separados prontos pra receber agendamento.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 text-sky-300">
                  <User className="size-4" />
                </div>
                <div>
                  <p className="font-semibold">Voce como dono</p>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    Cadastra atendentes e veterinarios depois, cada um com login proprio.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/15 text-rose-300">
                  <Mail className="size-4" />
                </div>
                <div>
                  <p className="font-semibold">Email pra confirmar</p>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    A gente manda um link antes do primeiro login.
                  </p>
                </div>
              </li>
            </ul>

            <div className="mt-12 rounded-xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-300">
                <ShieldCheck className="size-4" />
                Sem pegadinha
              </div>
              <p className="mt-2 text-sm leading-6 text-zinc-300">
                {paidSignup
                  ? "Pagamento via Pix manual. Envie o comprovante no WhatsApp oficial e aguarde validacao."
                  : "7 dias inteiros pra testar com tudo liberado. Quando acabar, voce escolhe o plano e paga via Pix."}
              </p>
              <ul className="mt-3 space-y-1.5 text-xs text-zinc-400">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-emerald-400" />
                  Sem cartao de credito no teste gratis
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-emerald-400" />
                  Validacao manual por Admin Master no plano pago
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-emerald-400" />
                  Suporte por WhatsApp
                </li>
              </ul>
            </div>
          </div>
        </div>
      </aside>
    </main>
  );
}
