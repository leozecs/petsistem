import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  CreditCard,
  MessageCircle,
  PawPrint,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Stethoscope,
  Store,
  Users,
} from "lucide-react";
import { PetsistemLogo } from "@/components/brand/logo";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "PETSISTEM · O sistema de gestão dos petshops modernos",
  description:
    "Agenda online, painel para a equipe, financeiro, prontuário veterinário. Tudo o que sua loja precisa pra crescer — em uma única plataforma.",
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
    title: "Agenda online 24/7",
    text: "Seus tutores agendam pelo subdomínio próprio da loja. Slots de 30 minutos em tempo real, sem ligação telefônica.",
  },
  {
    icon: PawPrint,
    title: "Tutores & Pets unificados",
    text: "Cadastro automático na primeira solicitação. Filtra por nome, telefone ou pet. Cada tutor tem múltiplos pets.",
  },
  {
    icon: Stethoscope,
    title: "Veterinária integrada",
    text: "Calendário separado, prontuário com queixa/anamnese/exame/diagnóstico/conduta. Histórico clínico do paciente.",
  },
  {
    icon: CreditCard,
    title: "Caixa e cobranças",
    text: "Cada serviço vira fatura automática. Marca pago com Pix, dinheiro ou cartão. Relatório mensal pronto.",
  },
  {
    icon: Users,
    title: "Time com cargos",
    text: "Crie atendentes e veterinários com um clique — o sistema gera login e cadastra no plano. Cada um vê só o que precisa.",
  },
  {
    icon: Smartphone,
    title: "Funciona no celular",
    text: "Painel responsivo, drag-and-drop suave, sem instalar nada. Funciona em qualquer navegador moderno.",
  },
];

const testimonials = [
  {
    name: "Marina Costa",
    role: "Dona, Petgres",
    text: "Em duas semanas paramos de perder agendamento. Os tutores agendam sozinhos pelo nosso link. Equipe ama o painel.",
  },
  {
    name: "Dr. Rafael Lima",
    role: "Veterinário",
    text: "O prontuário ficou todo organizado por pet. Acesso pelo celular dentro do consultório. Mudou meu dia-a-dia.",
  },
  {
    name: "Carla Mendes",
    role: "Tosadora, Pet & Cia",
    text: "O checklist com produtos usados é o que faltava. A dona consegue ver o que rolou em cada banho sem precisar perguntar.",
  },
];

const faqs = [
  {
    q: "Preciso instalar alguma coisa?",
    a: "Não. PETSISTEM roda inteiro no navegador. Funciona em celular, tablet e computador. Atualizações são automáticas.",
  },
  {
    q: "Meus dados ficam seguros?",
    a: "Sim. Hospedagem em infraestrutura com SOC 2 (Supabase + Vercel), backups diários, isolamento total entre lojas via RLS no Postgres.",
  },
  {
    q: "Como funciona o teste grátis?",
    a: "Você cria sua loja em segundos, recebe 14 dias com todos os recursos do plano Profissional. Sem cartão de crédito.",
  },
  {
    q: "Posso migrar de outro sistema?",
    a: "Sim. Em breve teremos importação por planilha. Enquanto isso, nosso suporte ajuda você a fazer a migração manualmente.",
  },
  {
    q: "Quantos funcionários posso ter?",
    a: "Depende do plano. Starter aceita 2, Profissional 5 e Premium 12 usuários. Cada um com role próprio (dono, atendente, veterinário).",
  },
  {
    q: "Vocês cobram por agendamento?",
    a: "Não. Mensalidade fixa. Você agenda quantos atendimentos quiser — não tem taxa por transação.",
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
  // Busca os planos ativos pra montar a tabela de preços com dados reais.
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
  // Plano do meio destacado como "Recomendado" — convenção SaaS.
  const recommendedIdx = plans.length >= 2 ? 1 : 0;

  return (
    <main className="min-h-[100dvh] bg-zinc-950 text-white antialiased">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center">
            <div className="flex h-7 w-32 items-center overflow-hidden">
              <PetsistemLogo tone="light" className="w-32" />
            </div>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-zinc-400 sm:flex">
            <Link href="#features" className="transition hover:text-white">
              Recursos
            </Link>
            <Link href="#pricing" className="transition hover:text-white">
              Preços
            </Link>
            <Link href="#faq" className="transition hover:text-white">
              FAQ
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <a
              href="https://app.petsistem.com.br/login"
              className="hidden rounded-md px-3 py-1.5 text-sm font-medium text-zinc-300 transition hover:text-white sm:inline-flex"
            >
              Entrar
            </a>
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
        {/* Glow background */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(60% 50% at 50% 0%, rgba(255,255,255,0.08), rgba(0,0,0,0) 70%)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
        />
        <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
            <Sparkles className="size-3" />
            Plataforma feita pra petshops modernos
          </div>
          <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
            O sistema que sua{" "}
            <span className="bg-gradient-to-br from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
              loja precisa
            </span>{" "}
            pra crescer
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-7 text-zinc-400 sm:text-lg">
            Agenda online no seu próprio subdomínio, painel completo pra equipe,
            financeiro automático, prontuário veterinário. Em poucos minutos
            você está atendendo.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-zinc-950 shadow-lg shadow-white/10 transition hover:bg-zinc-100"
            >
              Criar minha loja grátis
              <ArrowRight className="size-4" />
            </Link>
            <a
              href="https://wa.me/5519999990000?text=Quero%20conhecer%20o%20PETSISTEM"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
            >
              <MessageCircle className="size-4" />
              Falar com a gente
            </a>
          </div>
          <p className="mt-5 text-xs text-zinc-500">
            14 dias grátis · Sem cartão de crédito · Cancele quando quiser
          </p>

          {/* Mock screenshot */}
          <div className="mx-auto mt-16 max-w-5xl rounded-xl border border-white/10 bg-zinc-900/50 p-2 shadow-2xl shadow-black/40">
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
                  <p className="mt-2 text-2xl font-semibold">12</p>
                  <p className="text-xs text-emerald-400">3 em atendimento</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <p className="text-xs text-zinc-500">Recebido</p>
                  <p className="mt-2 text-2xl font-semibold">R$ 1.485</p>
                  <p className="text-xs text-zinc-500">+ R$ 320 a receber</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-amber-500/10 p-4">
                  <p className="text-xs text-amber-300">Solicitações pendentes</p>
                  <p className="mt-2 text-2xl font-semibold">3</p>
                  <p className="text-xs text-amber-200">Confirme no painel</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-b border-white/5 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-center text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Recursos
          </p>
          <h2 className="mx-auto mt-2 max-w-2xl text-balance text-center text-3xl font-semibold tracking-tight sm:text-4xl">
            Tudo que sua loja precisa em um único lugar
          </h2>
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="group rounded-xl border border-white/10 bg-white/5 p-6 transition hover:bg-white/[0.07]"
                >
                  <div className="flex size-10 items-center justify-center rounded-lg bg-white/10">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">{f.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-b border-white/5 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-center text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Planos
          </p>
          <h2 className="mx-auto mt-2 max-w-2xl text-balance text-center text-3xl font-semibold tracking-tight sm:text-4xl">
            Preço simples. Sem taxa por agendamento.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-sm text-zinc-400">
            Todos os planos incluem agenda online, painel da equipe, financeiro
            automático e suporte. Cancele quando quiser.
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
                        ? "border-white/30 bg-white/[0.07] shadow-lg shadow-white/5"
                        : "border-white/10 bg-white/[0.03]")
                    }
                  >
                    {isRecommended ? (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-white px-3 py-0.5 text-[0.625rem] font-bold uppercase tracking-wider text-zinc-950">
                        Recomendado
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
                        Até {p.maxUsers} usuários
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                        Agenda online no subdomínio
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                        Caixa + relatórios mensais
                      </li>
                      <li className="flex items-center gap-2">
                        {p.allowsVet ? (
                          <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                        ) : (
                          <span className="size-4 shrink-0 text-zinc-600">—</span>
                        )}
                        <span className={p.allowsVet ? "" : "text-zinc-500"}>
                          Agenda veterinária + prontuário
                        </span>
                      </li>
                    </ul>
                    <Link
                      href={`/signup?plan=${p.code}`}
                      className={
                        "mt-8 inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition " +
                        (isRecommended
                          ? "bg-white text-zinc-950 hover:bg-zinc-100"
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
          <p className="text-center text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Quem usa
          </p>
          <h2 className="mx-auto mt-2 max-w-2xl text-balance text-center text-3xl font-semibold tracking-tight sm:text-4xl">
            Petshops modernos confiam no PETSISTEM
          </h2>
          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {testimonials.map((t) => (
              <figure
                key={t.name}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-6"
              >
                <blockquote className="text-sm leading-7 text-zinc-200">
                  &ldquo;{t.text}&rdquo;
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-3 border-t border-white/10 pt-4">
                  <div className="flex size-9 items-center justify-center rounded-full bg-white/10 text-xs font-semibold">
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
          <p className="text-center text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Perguntas frequentes
          </p>
          <h2 className="mt-2 text-balance text-center text-3xl font-semibold tracking-tight sm:text-4xl">
            Tudo que você precisa saber
          </h2>
          <div className="mt-12 divide-y divide-white/5 rounded-xl border border-white/10 bg-white/[0.02]">
            {faqs.map((f) => (
              <details key={f.q} className="group p-6 open:bg-white/[0.03]">
                <summary className="flex cursor-pointer items-center justify-between gap-4 text-sm font-semibold text-white marker:hidden [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span className="text-2xl text-zinc-500 transition group-open:rotate-45">
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
          <Store className="mx-auto size-10 text-zinc-400" />
          <h2 className="mt-6 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Comece em poucos minutos
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm text-zinc-400 sm:text-base">
            Sua loja online, agenda funcional, time configurado. Sem cartão de
            crédito.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100"
            >
              Criar minha loja grátis
              <ArrowRight className="size-4" />
            </Link>
            <a
              href="https://app.petsistem.com.br/login"
              className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
            >
              Já tenho conta
            </a>
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
                Recursos
              </Link>
              <Link href="#pricing" className="hover:text-zinc-300">
                Preços
              </Link>
              <Link href="#faq" className="hover:text-zinc-300">
                FAQ
              </Link>
              <a
                href="https://app.petsistem.com.br/login"
                className="hover:text-zinc-300"
              >
                Entrar
              </a>
            </nav>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <ShieldCheck className="size-4" />
              <span>© {new Date().getFullYear()} PETSISTEM</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
