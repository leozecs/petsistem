import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  Minus,
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

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
  });
}

// Rotina real, escrita pelo cliente. Cada bloco mostra um momento concreto
// do dia do petshop em vez de um card genérico de feature.
const dayMoments = [
  {
    when: "07h42",
    actor: "Tutora · pelo WhatsApp",
    line: "Bruna, dá pra encaixar a Mel pro banho hoje à tarde?",
    answer: "Manda esse link. Ela escolhe horário, você confirma no painel.",
    link: "petgres.petsistem.com.br/agendar",
  },
  {
    when: "10h15",
    actor: "Atendente · checkin do bichinho",
    line: "Chegou a Mel. Tá com nó atrás da orelha.",
    answer: "Marca no checklist, anexa foto, salva. O tutor vê na hora da entrega.",
  },
  {
    when: "14h30",
    actor: "Veterinário · em consulta",
    line: "Histórico do Tobias do ano passado? Vacina V10, quando foi?",
    answer: "Tá no prontuário. Abre no celular, busca pelo nome.",
  },
  {
    when: "19h00",
    actor: "Dona · fechamento",
    line: "Quanto entrou hoje? Quem ainda deve?",
    answer: "Caixa do dia conta sozinho. Pix, cartão, dinheiro. Tudo somado.",
  },
];

const testimonials = [
  {
    name: "Bruna Curcia",
    role: "Dona, Petgres, São Paulo",
    text: "Em duas semanas a gente parou de perder horário. Os tutores agendam sozinhos pelo nosso link e a equipe inteira tá no painel.",
  },
  {
    name: "Dr. Rafael Lima",
    role: "Veterinário, Clínica Vida Animal",
    text: "O prontuário tá tudo organizado por animal. Abro no celular dentro do consultório. Mudou meu dia.",
  },
  {
    name: "Carla Mendes",
    role: "Tosadora, Pet & Cia",
    text: "O checklist com produto usado é o que faltava. A dona vê o que rolou em cada banho sem precisar perguntar.",
  },
];

const faqs = [
  {
    q: "Preciso instalar alguma coisa?",
    a: "Nada. Tudo roda no navegador, seja celular, tablet ou computador. As atualizações chegam sozinhas, você não precisa fazer nada.",
  },
  {
    q: "É seguro?",
    a: "Sim. Rodamos em Supabase e Vercel, as mesmas plataformas que empresas grandes usam. Tem backup diário e separação total entre cada loja.",
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
    <main
      className="min-h-[100dvh] bg-[#f7f5ef] text-zinc-950 antialiased"
      style={{ fontFamily: "var(--font-hanken), ui-sans-serif, system-ui" }}
    >
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-zinc-800/60 bg-zinc-950/90 text-[#f7f5ef] backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-7 w-32 items-center overflow-hidden">
              <PetsistemLogo tone="light" className="w-32" />
            </div>
          </Link>
          <nav
            className="hidden items-center gap-7 text-sm text-zinc-300 sm:flex"
            style={{ fontFamily: "var(--font-hanken)" }}
          >
            <Link href="#rotina" className="transition hover:text-white">
              Como funciona
            </Link>
            <Link href="#planos" className="transition hover:text-white">
              Planos
            </Link>
            <Link href="#duvidas" className="transition hover:text-white">
              Dúvidas
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden rounded-full px-3 py-1.5 text-sm font-medium text-zinc-300 transition hover:text-white sm:inline-flex"
            >
              Entrar
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#f7f5ef] px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-white"
            >
              Criar grátis
              <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Carimbo de paw print discreto, sem floating ícone genérico */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 right-[-6rem] hidden h-[440px] w-[440px] rounded-full bg-emerald-200/35 blur-[80px] lg:block"
        />
        <div className="mx-auto grid max-w-6xl gap-14 px-4 pt-14 pb-24 sm:px-6 sm:pt-20 sm:pb-32 lg:grid-cols-[1.05fr_1fr] lg:items-end lg:gap-10">
          <div>
            <p
              className="inline-flex items-center gap-2 rounded-full border border-emerald-700/15 bg-emerald-700/[0.06] px-3 py-1 text-[11px] font-medium text-emerald-800"
              style={{ fontFamily: "var(--font-hanken)" }}
            >
              <span className="size-1.5 rounded-full bg-emerald-700" />
              Pra petshop e clínica veterinária
            </p>
            <h1
              className="mt-7 text-[2.5rem] font-medium leading-[1.02] tracking-[-0.025em] text-zinc-950 sm:text-[4.25rem]"
              style={{ fontFamily: "var(--font-bricolage)", fontVariationSettings: "'wdth' 90" }}
            >
              O dia do
              <br />
              seu petshop,
              <br />
              <span className="italic text-emerald-800" style={{ fontVariationSettings: "'wdth' 75" }}>
                bem cuidado.
              </span>
            </h1>
            <p
              className="mt-8 max-w-md text-[17px] leading-[1.55] text-zinc-700"
              style={{ fontFamily: "var(--font-hanken)" }}
            >
              Agenda online no seu link, painel pra equipe inteira, prontuário do
              veterinário, caixa do dia somando sozinho. Sem instalar nada, sem
              treinamento, sem mensalidade que pesa.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="/signup"
                className="group inline-flex items-center gap-2 rounded-full bg-emerald-800 px-5 py-3 text-sm font-semibold text-[#f7f5ef] transition hover:bg-emerald-900"
              >
                Começar de graça por 7 dias
                <ArrowUpRight className="size-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
              <a
                href="https://wa.me/5519999990000?text=Quero%20conhecer%20o%20PETSISTEM%20pro%20meu%20petshop"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white/60 px-5 py-3 text-sm font-medium text-zinc-800 transition hover:bg-white"
              >
                Falar no WhatsApp
              </a>
            </div>
            <p className="mt-5 text-xs text-zinc-500">
              Sem cartão de crédito · Cancela quando quiser · Suporte em português
            </p>
          </div>

          {/* Mockup da agenda */}
          <div className="relative">
            <div
              aria-hidden
              className="absolute -left-6 -top-6 hidden h-[120%] w-[120%] -rotate-1 rounded-[28px] bg-emerald-800/[0.06] lg:block"
            />
            <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_24px_60px_-12px_rgba(15,23,42,0.18)]">
              {/* Janela */}
              <div className="flex items-center gap-2 border-b border-zinc-200 px-4 py-3">
                <span className="size-2.5 rounded-full bg-rose-300" />
                <span className="size-2.5 rounded-full bg-amber-300" />
                <span className="size-2.5 rounded-full bg-emerald-300" />
                <p className="ml-3 font-mono text-[11px] text-zinc-500">
                  petgres.petsistem.com.br
                </p>
              </div>
              <div className="grid grid-cols-[60px_1fr] divide-x divide-zinc-100">
                <ul className="text-[10px] text-zinc-400">
                  {["08", "09", "10", "11", "12", "13", "14"].map((h) => (
                    <li
                      key={h}
                      className="flex h-12 items-start justify-end px-2 pt-1 tabular-nums"
                    >
                      {h}:00
                    </li>
                  ))}
                </ul>
                <div className="relative h-[336px]">
                  <div className="absolute inset-x-2 top-[24px] h-[44px] rounded-md border border-emerald-700/20 bg-emerald-700/[0.10] px-2.5 py-1.5">
                    <p className="text-[11px] font-semibold text-emerald-900">
                      Banho · Mel (Yorkshire)
                    </p>
                    <p className="text-[10px] text-emerald-800/80">
                      08h30 com Bruna
                    </p>
                  </div>
                  <div className="absolute inset-x-2 top-[72px] h-[36px] rounded-md border border-rose-300/50 bg-rose-100 px-2.5 py-1">
                    <p className="text-[11px] font-semibold leading-tight text-rose-900">
                      Tosa higiênica · Tobias
                    </p>
                    <p className="text-[10px] text-rose-800/80">09h15 com Carla</p>
                  </div>
                  <div className="absolute inset-x-2 top-[144px] h-[56px] rounded-md border border-sky-300/50 bg-sky-100 px-2.5 py-1.5">
                    <p className="text-[11px] font-semibold text-sky-900">
                      Consulta vet · Filó
                    </p>
                    <p className="text-[10px] text-sky-800/80">11h00 · Dr. Rafael</p>
                    <p className="mt-0.5 text-[10px] text-sky-800/60">
                      Vacinação V10
                    </p>
                  </div>
                  <div className="absolute inset-x-2 top-[264px] h-[36px] rounded-md border border-amber-300/70 bg-amber-100 px-2.5 py-1">
                    <p className="text-[11px] font-semibold leading-tight text-amber-900">
                      Pedido do site · aguarda confirmar
                    </p>
                    <p className="text-[10px] text-amber-800/80">
                      13h30 · novo tutor
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 divide-x divide-zinc-100 border-t border-zinc-100 bg-zinc-50/60 px-1">
                <div className="px-4 py-3">
                  <p className="text-[10px] uppercase tracking-wide text-zinc-500">
                    Hoje
                  </p>
                  <p className="mt-1 font-mono text-base font-medium tabular-nums text-zinc-900">
                    12 agend.
                  </p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[10px] uppercase tracking-wide text-zinc-500">
                    Recebido
                  </p>
                  <p className="mt-1 font-mono text-base font-medium tabular-nums text-zinc-900">
                    R$ 1.485
                  </p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[10px] uppercase tracking-wide text-emerald-800">
                    Solicitações
                  </p>
                  <p className="mt-1 font-mono text-base font-medium tabular-nums text-emerald-900">
                    3 pendentes
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-3 text-right text-[11px] text-zinc-500">
              Imagem ilustrativa da agenda. O produto real é igualzinho.
            </div>
          </div>
        </div>
      </section>

      {/* Logos / prova social discreta */}
      <section className="border-y border-zinc-200/70 bg-white/40 py-8">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-4 text-[13px] text-zinc-500 sm:px-6">
          <p className="font-medium text-zinc-700">Usam o PETSISTEM:</p>
          <span>Petgres, São Paulo</span>
          <span>Vida Animal, São Carlos</span>
          <span>Pet &amp; Cia, Sorocaba</span>
          <span>Clínica Quatro Patas, Bauru</span>
        </div>
      </section>

      {/* Rotina */}
      <section id="rotina" className="py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <div>
              <h2
                className="text-balance text-4xl font-medium leading-[1.05] tracking-[-0.02em] text-zinc-950 sm:text-[3rem]"
                style={{ fontFamily: "var(--font-bricolage)", fontVariationSettings: "'wdth' 85" }}
              >
                Um dia inteiro de petshop,
                <br />
                <span className="italic text-emerald-800">resolvido aqui dentro.</span>
              </h2>
              <p
                className="mt-6 max-w-md text-[15px] leading-7 text-zinc-700"
                style={{ fontFamily: "var(--font-hanken)" }}
              >
                O sistema foi desenhado ouvindo dono, atendente e veterinário.
                Não é cópia de ERP genérico. A gente cortou tudo que ninguém
                usa e deixou só o que aparece no balcão.
              </p>
              <Link
                href="/signup"
                className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 hover:text-emerald-900"
              >
                Ver na prática
                <ArrowUpRight className="size-4" />
              </Link>
            </div>

            <ol className="relative space-y-2">
              {dayMoments.map((m, i) => (
                <li
                  key={m.when}
                  className="grid grid-cols-[80px_1fr] gap-4 border-t border-zinc-200 py-6"
                >
                  <div>
                    <p
                      className="font-mono text-sm tabular-nums text-zinc-900"
                      style={{ fontFamily: "var(--font-geist-mono)" }}
                    >
                      {m.when}
                    </p>
                    <p className="mt-1 text-[11px] uppercase tracking-wide text-zinc-400">
                      cena {String(i + 1).padStart(2, "0")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-zinc-500">{m.actor}</p>
                    <p
                      className="mt-1.5 text-[19px] leading-snug tracking-tight text-zinc-950"
                      style={{ fontFamily: "var(--font-bricolage)" }}
                    >
                      “{m.line}”
                    </p>
                    <p className="mt-3 flex items-start gap-2 text-[14px] leading-6 text-zinc-700">
                      <span className="mt-2 inline-block size-1.5 shrink-0 rounded-full bg-emerald-700" />
                      <span>
                        {m.answer}
                        {m.link ? (
                          <>
                            {" "}
                            <span className="font-mono text-[12.5px] text-emerald-800">
                              {m.link}
                            </span>
                          </>
                        ) : null}
                      </span>
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Quote de destaque, brand-voice direto */}
      <section className="border-y border-zinc-200/70 bg-emerald-800 py-20 text-[#f7f5ef]">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <p
            className="text-balance text-[2rem] font-medium leading-[1.15] tracking-[-0.02em] sm:text-[2.75rem]"
            style={{ fontFamily: "var(--font-bricolage)", fontVariationSettings: "'wdth' 85" }}
          >
            “Em duas semanas a gente parou de perder horário.
            Os tutores agendam sozinhos pelo nosso link e a equipe
            inteira tá no painel.”
          </p>
          <p className="mt-8 flex items-center gap-3 text-sm text-emerald-100">
            <span className="h-px w-8 bg-emerald-300/60" />
            Bruna Curcia, dona da Petgres, São Paulo
          </p>
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
            <div className="lg:pt-8">
              <h2
                className="text-balance text-4xl font-medium leading-[1.05] tracking-[-0.02em] text-zinc-950 sm:text-[3rem]"
                style={{ fontFamily: "var(--font-bricolage)", fontVariationSettings: "'wdth' 85" }}
              >
                Mensalidade fixa, sem letra miúda.
              </h2>
              <p className="mt-6 max-w-sm text-[15px] leading-7 text-zinc-700">
                Todo plano vem com agenda online, painel pro time e financeiro
                automático. Você só escolhe o tamanho.
              </p>
              <p className="mt-4 max-w-sm text-[13px] leading-6 text-zinc-500">
                Cobramos por equipe ativa, nunca por agendamento. Quantos
                atendimentos sua loja fizer no mês, a fatura é a mesma.
              </p>
            </div>

            {plans.length === 0 ? (
              <p className="text-sm text-zinc-500">Planos em breve.</p>
            ) : (
              <div className="grid items-stretch gap-4 sm:grid-cols-3">
                {plans.map((p, i) => {
                  const isRecommended = i === recommendedIdx;
                  return (
                    <div
                      key={p.code}
                      className={
                        "relative flex flex-col rounded-2xl border p-6 transition " +
                        (isRecommended
                          ? "border-emerald-800/20 bg-emerald-800 text-[#f7f5ef] shadow-[0_24px_50px_-12px_rgba(6,78,59,0.35)] sm:-translate-y-4"
                          : "border-zinc-200 bg-white text-zinc-950 hover:-translate-y-1")
                      }
                    >
                      {isRecommended ? (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#f7f5ef] px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-900 shadow-sm">
                          Mais escolhido
                        </span>
                      ) : null}

                      <h3
                        className="text-lg font-medium tracking-tight"
                        style={{ fontFamily: "var(--font-bricolage)" }}
                      >
                        {p.name}
                      </h3>

                      <p
                        className={
                          "mt-1.5 min-h-[3.25rem] text-[12.5px] leading-5 " +
                          (isRecommended ? "text-emerald-100" : "text-zinc-500")
                        }
                      >
                        {p.description ?? ""}
                      </p>

                      <p className="mt-5 flex items-end gap-1 whitespace-nowrap">
                        <span
                          className="font-medium tracking-tight"
                          style={{
                            fontFamily: "var(--font-bricolage)",
                            fontSize: "2rem",
                            lineHeight: 1,
                            fontVariationSettings: "'wdth' 90",
                          }}
                        >
                          {formatBRL(p.priceCents)}
                        </span>
                        <span
                          className={
                            "pb-0.5 text-[12px] " +
                            (isRecommended ? "text-emerald-100" : "text-zinc-500")
                          }
                        >
                          /mês
                        </span>
                      </p>

                      <ul
                        className={
                          "mt-6 flex-1 space-y-2.5 text-[13.5px] " +
                          (isRecommended ? "text-emerald-50" : "text-zinc-700")
                        }
                      >
                        <li className="flex items-start gap-2.5">
                          <Check
                            className={
                              "mt-0.5 size-3.5 shrink-0 " +
                              (isRecommended ? "text-[#f7f5ef]" : "text-emerald-800")
                            }
                            strokeWidth={3}
                          />
                          <span>Até {p.maxUsers} pessoas usando</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <Check
                            className={
                              "mt-0.5 size-3.5 shrink-0 " +
                              (isRecommended ? "text-[#f7f5ef]" : "text-emerald-800")
                            }
                            strokeWidth={3}
                          />
                          <span>Agenda online no seu link</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <Check
                            className={
                              "mt-0.5 size-3.5 shrink-0 " +
                              (isRecommended ? "text-[#f7f5ef]" : "text-emerald-800")
                            }
                            strokeWidth={3}
                          />
                          <span>Caixa do dia e relatório do mês</span>
                        </li>
                        <li
                          className={
                            "flex items-start gap-2.5 " +
                            (p.allowsVet
                              ? ""
                              : isRecommended
                                ? "opacity-60"
                                : "text-zinc-400")
                          }
                        >
                          {p.allowsVet ? (
                            <Check
                              className={
                                "mt-0.5 size-3.5 shrink-0 " +
                                (isRecommended
                                  ? "text-[#f7f5ef]"
                                  : "text-emerald-800")
                              }
                              strokeWidth={3}
                            />
                          ) : (
                            <Minus className="mt-0.5 size-3.5 shrink-0" strokeWidth={3} />
                          )}
                          <span>Agenda do veterinário e prontuário</span>
                        </li>
                      </ul>

                      <Link
                        href={`/signup?plan=${p.code}`}
                        className={
                          "mt-8 inline-flex w-full items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold transition " +
                          (isRecommended
                            ? "bg-[#f7f5ef] text-emerald-900 hover:bg-white"
                            : "bg-zinc-950 text-[#f7f5ef] hover:bg-zinc-800")
                        }
                      >
                        Começar
                        <ArrowUpRight className="size-3.5" />
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-t border-zinc-200/70 bg-white/50 py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2
            className="max-w-2xl text-balance text-3xl font-medium leading-[1.1] tracking-[-0.02em] text-zinc-950 sm:text-[2.5rem]"
            style={{ fontFamily: "var(--font-bricolage)", fontVariationSettings: "'wdth' 85" }}
          >
            Quem opera todo dia: dono, atendente e veterinário.
          </h2>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <figure
                key={t.name}
                className={
                  "rounded-2xl border border-zinc-200 bg-white p-7 transition hover:border-emerald-800/30 " +
                  (i === 1 ? "md:translate-y-6" : "")
                }
              >
                <p className="font-mono text-xs text-zinc-400">
                  · 0{i + 1}
                </p>
                <blockquote
                  className="mt-4 text-[16.5px] leading-[1.55] text-zinc-900"
                  style={{ fontFamily: "var(--font-bricolage)" }}
                >
                  “{t.text}”
                </blockquote>
                <figcaption className="mt-7 border-t border-zinc-100 pt-4">
                  <p className="text-sm font-semibold text-zinc-950">{t.name}</p>
                  <p className="mt-0.5 text-[12.5px] text-zinc-500">{t.role}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="duvidas" className="py-24 sm:py-32">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-[0.65fr_1fr]">
            <h2
              className="text-balance text-4xl font-medium leading-[1.05] tracking-[-0.02em] text-zinc-950 sm:text-[3rem]"
              style={{ fontFamily: "var(--font-bricolage)", fontVariationSettings: "'wdth' 85" }}
            >
              Perguntas que a gente sempre ouve.
            </h2>
            <div className="divide-y divide-zinc-200 border-t border-zinc-200">
              {faqs.map((f) => (
                <details key={f.q} className="group py-5">
                  <summary className="flex cursor-pointer items-center justify-between gap-4 text-[15.5px] font-medium text-zinc-900 marker:hidden [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <span className="font-mono text-xl text-emerald-800 transition group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 max-w-prose text-[14.5px] leading-7 text-zinc-600">
                    {f.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="bg-zinc-950 py-24 text-[#f7f5ef] sm:py-32">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h2
            className="text-balance text-[2.5rem] font-medium leading-[1.02] tracking-[-0.025em] sm:text-[4.5rem]"
            style={{ fontFamily: "var(--font-bricolage)", fontVariationSettings: "'wdth' 82" }}
          >
            Seu petshop online
            <br />
            <span className="italic text-emerald-300">em dez minutos.</span>
          </h2>
          <p className="mt-7 max-w-lg text-[15.5px] leading-7 text-zinc-300">
            Cadastra a loja, escolhe os serviços e manda o link pro tutor. A gente
            cuida do resto. Você cuida do bichinho.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-full bg-[#f7f5ef] px-6 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-white"
            >
              Criar minha loja grátis
              <ArrowUpRight className="size-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full border border-zinc-700 px-6 py-3 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:text-white"
            >
              Já tenho conta
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-200/70 bg-[#f7f5ef] py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex h-7 w-32 items-center overflow-hidden">
              <PetsistemLogo tone="dark" className="w-32" />
            </div>
            <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] text-zinc-500">
              <Link href="#rotina" className="hover:text-zinc-900">
                Como funciona
              </Link>
              <Link href="#planos" className="hover:text-zinc-900">
                Planos
              </Link>
              <Link href="#duvidas" className="hover:text-zinc-900">
                Dúvidas
              </Link>
              <Link href="/login" className="hover:text-zinc-900">
                Entrar
              </Link>
            </nav>
            <p className="text-[12px] text-zinc-500">
              © {new Date().getFullYear()} PETSISTEM
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
