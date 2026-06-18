import Link from "next/link";
import { ArrowRight, CalendarDays, LockKeyhole, ShieldCheck, Store } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const pillars = [
  {
    title: "Multi-tenant real",
    description: "Subdomínios, memberships, roles e RLS para impedir vazamento entre lojas.",
    icon: ShieldCheck,
  },
  {
    title: "Agenda dupla",
    description: "Banho e tosa separado da veterinária, com disponibilidade calculada por serviço.",
    icon: CalendarDays,
  },
  {
    title: "Operação rastreável",
    description: "Checklist, histórico de status, auditoria e acompanhamento público do tutor.",
    icon: LockKeyhole,
  },
];

export function PlatformHome() {
  return (
    <main className="min-h-[100dvh] overflow-x-hidden bg-[#f7f8f5] text-zinc-950">
      <header className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-zinc-950 text-sm font-bold text-white">
            PS
          </div>
          <span className="text-sm font-semibold tracking-tight">PETSISTEM</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-zinc-600 md:flex">
          <Link href="/loja/petgres">Demo loja</Link>
          <Link href="/admin-master">Admin Master</Link>
          <Link href="/app">Painel</Link>
        </nav>
        <Link href="/login" className={cn(buttonVariants(), "rounded-md bg-zinc-950 text-white hover:bg-zinc-800")}>
          Entrar
          <ArrowRight className="size-4" />
        </Link>
      </header>

      <section className="mx-auto grid max-w-7xl gap-10 px-4 pb-16 pt-10 sm:px-6 md:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:pb-24">
        <div className="flex flex-col justify-center">
          <p className="text-sm font-semibold text-zinc-600">SaaS para petshops e clínicas veterinárias</p>
          <h1 className="mt-5 max-w-5xl text-5xl font-semibold leading-[1.02] tracking-tight text-zinc-950 md:text-7xl">
            Gestão comercial e operacional para lojas pet que precisam crescer com controle.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-600">
            Agenda, atendimento, checklist, tutor, assinatura Pix e painel master em uma arquitetura multi-tenant
            pronta para vender para dezenas de lojas.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/loja/petgres"
              className={cn(buttonVariants({ size: "lg" }), "rounded-md bg-zinc-950 text-white hover:bg-zinc-800")}
            >
              Ver loja demo
            </Link>
            <Link
              href="/admin-master"
              className={cn(
                buttonVariants({ size: "lg", variant: "outline" }),
                "rounded-md border-zinc-300 bg-white text-zinc-950",
              )}
            >
              Abrir Admin Master
            </Link>
          </div>
        </div>

        <div className="relative min-h-[520px] overflow-hidden rounded-xl border border-zinc-200 bg-zinc-950 shadow-2xl shadow-zinc-900/10">
          <div
            className="absolute inset-0 opacity-45"
            style={{
              backgroundImage: "url(https://picsum.photos/seed/petsistem-dashboard/1200/1400)",
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "grayscale(1) contrast(1.2)",
            }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_10%,rgba(255,255,255,0.28),transparent_34%),linear-gradient(180deg,rgba(9,9,11,0.1),rgba(9,9,11,0.92))]" />
          <div className="absolute inset-x-5 bottom-5 rounded-lg border border-white/15 bg-white/10 p-5 text-white backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-300">Operação de hoje</p>
                <p className="mt-1 text-3xl font-semibold">30 atendimentos</p>
              </div>
              <Store className="size-9 text-white" />
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
              <div className="rounded-md bg-white/10 p-3">
                <p className="text-zinc-300">Agenda</p>
                <p className="mt-1 font-semibold">18</p>
              </div>
              <div className="rounded-md bg-white/10 p-3">
                <p className="text-zinc-300">Veterinária</p>
                <p className="mt-1 font-semibold">7</p>
              </div>
              <div className="rounded-md bg-white/10 p-3">
                <p className="text-zinc-300">Checklist</p>
                <p className="mt-1 font-semibold">5</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 pb-20 sm:px-6 md:grid-cols-3 lg:px-8">
        {pillars.map((pillar) => {
          const Icon = pillar.icon;
          return (
            <Card key={pillar.title} className="rounded-lg border-zinc-200 bg-white shadow-none">
              <CardContent className="p-6">
                <Icon className="size-6 text-zinc-950" />
                <h2 className="mt-5 text-lg font-semibold">{pillar.title}</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-600">{pillar.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </main>
  );
}
