import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  CreditCard,
  Heart,
  MessageCircle,
  PawPrint,
  Scissors,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Stethoscope,
  Store,
  Users,
  Zap,
} from "lucide-react";
import { PetsistemLogo } from "@/components/brand/logo";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "PETSISTEM · Sistema completo pro seu petshop",
  description:
    "Sistema feito pra petshop e clínica veterinária. Agenda online no seu site, painel pro time, financeiro pronto e prontuário do bichinho num só lugar.",
};

type PlanLite = {
  code: string;
  name: string;
  priceCents: number;
  maxUsers: number;
  allowsVet: boolean;
  description: string | null;
};

const features = [
  {
    icon: Calendar,
    accent: "from-emerald-500/20 to-emerald-500/0",
    iconColor: "text-emerald-400",
    title: "Tutor agenda direto no site",
    text: "Seu petshop ganha um link próprio (sualoja.petsistem.com.br). O tutor escolhe dia e hora, você só confirma. Acabou ligação.",
  },
  {
    icon: Scissors,
    accent: "from-rose-500/20 to-rose-500/0",
    iconColor: "text-rose-400",
    title: "Banho e tosa organizado",
    text: "Checklist com produtos usados, condição na chegada, observações pro tutor. Cada banho fica registrado pra sempre.",
  },
  {
    icon: Stethoscope,
    accent: "from-sky-500/20 to-sky-500/0",
    iconColor: "text-sky-400",
    title: "Prontuário veterinário",
    text: "Anamnese, exame físico, diagnóstico e conduta numa tela só. Histórico clínico de cada animal sempre à mão.",
  },
  {
    icon: CreditCard,
    accent: "from-amber-500/20 to-amber-500/0",
    iconColor: "text-amber-400",
    title: "Caixa do dia pronto",
    text: "Cada serviço já vira uma cobrança. Marca pago no Pix, dinheiro ou cartão. Fechamento do mês já calculado.",
  },
  {
    icon: Users,
    accent: "from-violet-500/20 to-violet-500/0",
    iconColor: "text-violet-400",
    title: "Equipe num clique",
    text: "Cria atendente ou veterinário, o sistema gera o login e cadastra no plano. Cada um vê só o que faz sentido pro cargo.",
  },
  {
    icon: Smartphone,
    accent: "from-pink-500/20 to-pink-500/0",
    iconColor: "text-pink-400",
    title: "Roda no celular",
    text: "Tudo funciona no navegador do celular ou tablet. Sem instalar app, sem atualização chata, sem dor de cabeça.",
  },
];

const testimonials = [
  {
    name: "Marina Costa",
    role: "Dona, Petgres",
    accent: "bg-emerald-500/15 text-emerald-300",
    text: "Em duas semanas a gente parou de perder horário. Os tutores agendam sozinhos pelo nosso link e a equipe inteira tá no painel.",
  },
  {
    name: "Dr. Rafael Lima",
    role: "Veterinário",
    accent: "bg-sky-500/15 text-sky-300",
    text: "O prontuário tá tudo organizado por animal. Abro no celular dentro do consultório. Mudou meu dia.",
  },
  {
    name: "Carla Mendes",
    role: "Tosadora, Pet & Cia",
    accent: "bg-rose-500/15 text-rose-300",
    text: "O checklist com produto usado é o que faltava. A dona vê o que rolou em cada banho sem precisar perguntar.",
  },
];

const faqs = [
  {
    q: "Preciso instalar alguma coisa?",
    a: "Nada. Tudo roda no navegador — celular, tablet ou computador. Atualização chega sem você fazer nada.",
  },
  {
    q: "É seguro?",
    a: "Sim. Infraestrutura Supabase + Vercel (mesmas plataformas que rodam empresas grandes), backup diário e separação total entre cada loja.",
  },
  {
    q: "Como funciona o teste grátis?",
    a: "Você cria sua loja, ganha 7 dias com os recursos do plano Profissional. Sem cartão de crédito, sem cobrança automática quando acaba.",
  },
  {
    q: "Dá pra migrar do sistema antigo?",
    a: "Dá. Por enquanto a gente ajuda manualmente (mande sua planilha que importamos pra você). Em breve tem importação automática.",
  },
  {
    q: "Quantas pessoas podem usar?",
    a: "Depende do plano: Starter 2 logins, Profissional 5, Premium 12. Cada login com cargo próprio (dono, atendente, veterinário).",
  },
  {
    q: "Cobram por agendamento?",
    a: "Não. Mensalidade fixa. Quantos atendimentos sua loja fizer no mês não muda nada no valor.",
  },
];

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
  });
}

export default async function MarketingPage() {
  let plans: PlanLite[] = [];
  const admin = createAdminClient();
  if (admin) {
    const { data } = await admin
      .from("plans")
      .select("code, name, price_cents, max_users, allows_veterinarian, description")
      .eq("active", true)
      .order("price_cents");
    plans = (data ?? []).map((p) => ({
      code: p.code,
      name: p.name,
      priceCents: p.price_cents,
      maxUsers: p.max_users,
      allowsVet: p.allows_veterinarian,
      description: p.description,
    }));
  }
  const recommendedIdx = plans.length >= 2 ? 1 : 0;

  return (
    <main className="min-h-[100dvh] bg-zinc-950 text-white antialiased">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-32 items-center overflow-hidden">
              <PetsistemLogo tone="light" className="w-32" />
            </div>
            <span className="hidden rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[0.625rem] font-semibold text-emerald-300 sm:inline-block">
              Pra petshop
            </span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-zinc-400 sm:flex">
            <Link href="#features" className="transition hover:text-white">
              O que faz
            </Link>
            <Link href="#pricing" className="transition hover:text-white">
              Planos
            </Link>
            <Link href="#faq" className="transition hover:text-white">
              Dúvidas
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden rounded-md px-3 py-1.5 text-sm font-medium text-zinc-300 transition hover:text-white sm:inline-flex"
            >
              Entrar
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200"
            >
              Criar grátis
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/5">
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(60% 50% at 50% 0%, rgba(16,185,129,0.10), rgba(0,0,0,0) 70%)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent"
        />

        {/* Floating pet icons (decoração) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-30"
        >
          <PawPrint className="absolute left-[10%] top-32 size-6 text-emerald-300/40 rotate-12" />
          <Heart className="absolute right-[14%] top-20 size-5 text-rose-300/50" />
          <Scissors className="absolute right-[8%] top-44 size-5 text-amber-300/40 -rotate-12" />
          <PawPrint className="absolute left-[6%] top-72 size-4 text-sky-300/50 -rotate-12" />
          <Stethoscope className="absolute right-[20%] bottom-24 size-5 text-violet-300/40" />
          <PawPrint className="absolute left-[18%] bottom-32 size-5 text-pink-300/40 rotate-45" />
        </div>

        <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
            <PawPrint className="size-3" />
            Feito sob medida pra petshop e clínica veterinária
          </div>
          <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
            Banho, tosa, consulta —{" "}
            <span className="bg-gradient-to-br from-emerald-300 via-white to-sky-300 bg-clip-text text-transparent">
              tudo numa tela só
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-7 text-zinc-300 sm:text-lg">
            Sistema desenhado pra petshops modernos. Seu tutor agenda online, sua
            equipe organiza o dia, você fecha o caixa no fim do expediente. Em
            menos de 10 minutos seu petshop tá no ar.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-zinc-950 shadow-lg shadow-emerald-500/20 transition hover:bg-zinc-100"
            >
              <Zap className="size-4 text-amber-500" />
              Quero testar grátis
              <ArrowRight className="size-4" />
            </Link>
            <a
              href="https://wa.me/5519999990000?text=Quero%20conhecer%20o%20PETSISTEM%20pro%20meu%20petshop"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
            >
              <MessageCircle className="size-4 text-emerald-400" />
              Falar com a gente
            </a>
          </div>
          <p className="mt-5 inline-flex items-center gap-2 text-xs text-zinc-400">
            <CheckCircle2 className="size-3.5 text-emerald-400" />
            7 dias grátis · Sem cartão de crédito · Cancela quando quiser
          </p>

          {/* Mock screenshot */}
          <div className="mx-auto mt-16 max-w-5xl rounded-xl border border-white/10 bg-zinc-900/60 p-2 shadow-2xl shadow-emerald-500/10">
            <div className="rounded-lg border border-white/5 bg-gradient-to-br from-zinc-900 to-zinc-950 p-6 text-left">
              <div className="mb-4 flex items-center gap-2 text-xs text-zinc-500">
                <span className="size-2.5 rounded-full bg-rose-500/60" />
                <span className="size-2.5 rounded-full bg-amber-500/60" />
                <span className="size-2.5 rounded-full bg-emerald-500/60" />
                <span className="ml-2 font-mono">
                  https://petgres.petsistem.com.br
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <p className="text-xs text-zinc-500">Agendamentos hoje</p>
                  <p className="mt-2 text-2xl font-semibold text-white">12</p>
                  <p className="text-xs text-emerald-400">3 em atendimento</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <p className="text-xs text-zinc-500">Recebido</p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    R$ 1.485
                  </p>
                  <p className="text-xs text-zinc-500">+ R$ 320 a receber</p>
                </div>
                <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-4">
                  <p className="text-xs text-amber-300">
                    Solicitações do site
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-white">3</p>
                  <p className="text-xs text-amber-200">Confirma no painel</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-b border-white/5 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-center text-xs font-semibold uppercase tracking-wider text-emerald-400">
            O que tem dentro
          </p>
          <h2 className="mx-auto mt-2 max-w-2xl text-balance text-center text-3xl font-semibold tracking-tight sm:text-4xl">
            Pensado pra rotina real de petshop
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-sm text-zinc-400">
            Cada tela foi feita ouvindo dono, atendente e veterinário. Sem
            firula, sem opção que ninguém usa.
          </p>
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] p-6 transition hover:bg-white/[0.06]"
                >
                  <div
                    aria-hidden
                    className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-current to-transparent ${f.iconColor}`}
                  />
                  <div
                    aria-hidden
                    className={`absolute -right-8 -top-8 size-32 rounded-full bg-gradient-to-br ${f.accent} blur-2xl opacity-60 group-hover:opacity-100 transition`}
                  />
                  <div
                    className={`relative flex size-10 items-center justify-center rounded-lg bg-white/5 ${f.iconColor}`}
                  >
                    <Icon className="size-5" />
                  </div>
                  <h3 className="relative mt-4 text-base font-semibold">
                    {f.title}
                  </h3>
                  <p className="relative mt-2 text-sm leading-6 text-zinc-400">
                    {f.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-b border-white/5 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-center text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Planos
          </p>
          <h2 className="mx-auto mt-2 max-w-2xl text-balance text-center text-3xl font-semibold tracking-tight sm:text-4xl">
            Mensalidade fixa, sem letra miúda
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-sm text-zinc-400">
            Todo plano vem com agenda online, painel pro time e financeiro
            automático. Você só escolhe o tamanho.
          </p>

          {plans.length === 0 ? (
            <p className="mt-10 text-center text-sm text-zinc-500">
              Planos em breve.
            </p>
          ) : (
            <div className="mt-14 grid gap-6 lg:grid-cols-3">
              {plans.map((p, i) => {
                const isRecommended = i === recommendedIdx;
                return (
                  <div
                    key={p.code}
                    className={
                      "relative rounded-xl border p-6 " +
                      (isRecommended
                        ? "border-emerald-400/40 bg-emerald-400/[0.06] shadow-lg shadow-emerald-500/10"
                        : "border-white/10 bg-white/[0.03]")
                    }
                  >
                    {isRecommended ? (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-400 px-3 py-0.5 text-[0.625rem] font-bold uppercase tracking-wider text-zinc-950">
                        Mais escolhido
                      </span>
                    ) : null}
                    <h3 className="text-lg font-semibold">{p.name}</h3>
                    <p className="mt-1 text-xs text-zinc-400">
                      {p.description ?? "—"}
                    </p>
                    <p className="mt-6">
                      <span className="text-4xl font-semibold">
                        {formatBRL(p.priceCents)}
                      </span>
                      <span className="ml-1 text-sm text-zinc-400">/mês</span>
                    </p>
                    <ul className="mt-6 space-y-2 text-sm text-zinc-300">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                        Até {p.maxUsers} pessoas usando
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                        Agenda online no seu link
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                        Caixa do dia + relatório do mês
                      </li>
                      <li className="flex items-center gap-2">
                        {p.allowsVet ? (
                          <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                        ) : (
                          <span className="size-4 shrink-0 text-zinc-600">—</span>
                        )}
                        <span className={p.allowsVet ? "" : "text-zinc-500"}>
                          Agenda do veterinário + prontuário
                        </span>
                      </li>
                    </ul>
                    <Link
                      href={`/signup?plan=${p.code}`}
                      className={
                        "mt-8 inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition " +
                        (isRecommended
                          ? "bg-emerald-400 text-zinc-950 hover:bg-emerald-300"
                          : "border border-white/15 bg-transparent text-white hover:bg-white/10")
                      }
                    >
                      Começar com {p.name}
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-b border-white/5 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-center text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Quem usa
          </p>
          <h2 className="mx-auto mt-2 max-w-2xl text-balance text-center text-3xl font-semibold tracking-tight sm:text-4xl">
            Petshop não para — o sistema acompanha
          </h2>
          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {testimonials.map((t) => (
              <figure
                key={t.name}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-6"
              >
                <Sparkles className="mb-3 size-4 text-amber-400" />
                <blockquote className="text-sm leading-7 text-zinc-200">
                  &ldquo;{t.text}&rdquo;
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-3 border-t border-white/10 pt-4">
                  <div
                    className={`flex size-9 items-center justify-center rounded-full text-xs font-semibold ${t.accent}`}
                  >
                    {t.name
                      .split(" ")
                      .map((p) => p[0])
                      .slice(0, 2)
                      .join("")}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-zinc-500">{t.role}</p>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-b border-white/5 py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <p className="text-center text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Dúvidas
          </p>
          <h2 className="mt-2 text-balance text-center text-3xl font-semibold tracking-tight sm:text-4xl">
            Perguntas que a gente sempre ouve
          </h2>
          <div className="mt-12 divide-y divide-white/5 rounded-xl border border-white/10 bg-white/[0.02]">
            {faqs.map((f) => (
              <details key={f.q} className="group p-6 open:bg-white/[0.03]">
                <summary className="flex cursor-pointer items-center justify-between gap-4 text-sm font-semibold text-white marker:hidden [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span className="text-2xl text-emerald-400 transition group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-7 text-zinc-400">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-b border-white/5 py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400/20 to-sky-400/20">
            <Store className="size-6 text-emerald-300" />
          </div>
          <h2 className="mt-6 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Seu petshop online em 10 minutos
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm text-zinc-400 sm:text-base">
            Cadastra, escolhe os serviços, manda o link pro tutor. Sem treinamento,
            sem instalação, sem dor de cabeça.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-md bg-emerald-400 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-300"
            >
              <Zap className="size-4" />
              Quero testar grátis
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
            >
              Já tenho conta
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
            <div className="flex h-7 w-32 items-center overflow-hidden">
              <PetsistemLogo tone="light" className="w-32" />
            </div>
            <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-zinc-500">
              <Link href="#features" className="hover:text-zinc-300">
                O que faz
              </Link>
              <Link href="#pricing" className="hover:text-zinc-300">
                Planos
              </Link>
              <Link href="#faq" className="hover:text-zinc-300">
                Dúvidas
              </Link>
              <Link href="/login" className="hover:text-zinc-300">
                Entrar
              </Link>
            </nav>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <ShieldCheck className="size-4 text-emerald-400" />
              <span>© {new Date().getFullYear()} PETSISTEM</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
