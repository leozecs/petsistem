import Link from "next/link";
import { ArrowRight, HeartPulse, LogIn, Scissors, ShieldCheck } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { publicActions, services, tenant } from "@/lib/data/demo";
import { cn } from "@/lib/utils";

export function TenantStorefront({ slug = tenant.slug }: { slug?: string }) {
  return (
    <main className="min-h-[100dvh] overflow-x-hidden bg-[#f5f7f1] text-zinc-950">
      <header className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href={`/loja/${slug}`} className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-zinc-950 text-sm font-bold text-white">
            {tenant.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold">{tenant.name}</p>
            <p className="text-xs text-zinc-500">Banho, tosa e veterinária</p>
          </div>
        </Link>
        <Link
          href="/login"
          className={cn(buttonVariants({ variant: "outline" }), "rounded-md border-zinc-300 bg-white")}
        >
            <LogIn className="size-4" />
            Entrar no Sistema
        </Link>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-8 sm:px-6 md:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <div>
          <p className="text-sm font-semibold text-zinc-600">{tenant.address}</p>
          <h1 className="mt-5 max-w-5xl text-5xl font-semibold leading-[1.02] tracking-tight text-zinc-950 md:text-7xl">
            Cuidado completo para o seu pet, com horários claros e acompanhamento em tempo real.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-600">
            Agende banho, tosa ou consulta veterinária sem ver dados internos da loja. Você escolhe apenas serviço,
            dia e horário disponível.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {publicActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.label}
                  href={action.href}
                  className={cn(
                    buttonVariants(),
                    "h-12 rounded-md bg-zinc-950 text-white hover:bg-zinc-800",
                  )}
                >
                  <Icon className="size-4" />
                  <span className="truncate">{action.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="relative min-h-[560px] overflow-hidden rounded-xl border border-zinc-200 bg-zinc-950">
          <div
            className="absolute inset-0 opacity-70"
            style={{
              backgroundImage: "url(https://picsum.photos/seed/petcare-clinic/1200/1400)",
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "grayscale(1) contrast(1.15)",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/45 to-transparent" />
          <div className="absolute inset-x-5 bottom-5 rounded-lg border border-white/15 bg-white/10 p-5 text-white backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <ShieldCheck className="size-5" />
              <p className="text-sm font-medium">Agenda pública mostra apenas disponibilidade.</p>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-md bg-white/10 p-4">
                <Scissors className="size-5" />
                <p className="mt-3 text-sm text-zinc-300">Próximo banho</p>
                <p className="text-lg font-semibold">Hoje, 14:10</p>
              </div>
              <div className="rounded-md bg-white/10 p-4">
                <HeartPulse className="size-5" />
                <p className="mt-3 text-sm text-zinc-300">Próxima consulta</p>
                <p className="text-lg font-semibold">Amanhã, 09:00</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="agendar" className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">Escolha um serviço</h2>
            <p className="mt-2 text-sm text-zinc-600">Fluxo público preparado para conectar com disponibilidade real.</p>
          </div>
          <ArrowRight className="hidden size-6 text-zinc-400 sm:block" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {services.map((service) => (
            <Card key={`${service.area}-${service.name}`} className="rounded-lg border-zinc-200 bg-white shadow-none">
              <CardContent className="p-5">
                <p className="text-xs font-semibold text-zinc-500">{service.area}</p>
                <h3 className="mt-3 text-lg font-semibold">{service.name}</h3>
                <p className="mt-2 text-sm text-zinc-600">{service.duration} - {service.price}</p>
                <Button variant="outline" className="mt-5 w-full rounded-md border-zinc-300 bg-white">
                  Ver horários
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
