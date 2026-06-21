"use client";

import Link from "next/link";
import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowRight,
  Ban,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  ListChecks,
  Plus,
  Receipt,
  TrendingUp,
  UserPlus,
  Wallet,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeading } from "@/components/app/section-heading";
import {
  cancelAppointment,
  updateAppointmentStatus,
} from "@/app/app/calendarios/actions";
import type { Database } from "@/lib/supabase/database.types";

type ServiceArea = Database["public"]["Enums"]["service_area"];
type AppointmentStatus = Database["public"]["Enums"]["appointment_status"];

export type DashboardAppt = {
  id: string;
  startIso: string;
  endIso: string;
  status: AppointmentStatus;
  petName: string | null;
  serviceName: string | null;
  tutorName: string | null;
  area: ServiceArea;
};

type OverdueAppt = DashboardAppt & { priceCents: number };

type Props = {
  canSeeFinance: boolean;
  userName: string | null;
  kpis: {
    appointmentsToday: number;
    receivedCents: number;
    pendingCents: number;
    expensesCents: number;
    finishedCount: number;
  };
  inProgress: DashboardAppt[];
  upcoming: DashboardAppt[];
  alerts: {
    pending: DashboardAppt[];
    overduePayments: OverdueAppt[];
    emptyTomorrow: boolean;
  };
};

const HHMM = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "America/Sao_Paulo",
});

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const AREA_LABEL: Record<ServiceArea, string> = {
  grooming: "Banho e Tosa",
  veterinary: "Veterinária",
};

export function DashboardView({
  canSeeFinance,
  kpis,
  inProgress,
  upcoming,
  alerts,
}: Props) {
  const router = useRouter();
  const [pendingTx, startTransition] = useTransition();
  const saldo = kpis.receivedCents - kpis.expensesCents;

  function handleConfirm(apptId: string) {
    startTransition(async () => {
      const result = await updateAppointmentStatus(apptId, "confirmed");
      if (result.ok) {
        toast.success("Agendamento confirmado");
        router.refresh();
      } else {
        toast.error(result.error ?? "Erro ao confirmar");
      }
    });
  }

  function handleCancel(apptId: string) {
    if (!confirm("Cancelar esta solicitação? O tutor não será mais atendido.")) return;
    startTransition(async () => {
      const result = await cancelAppointment(apptId);
      if (result.ok) {
        toast.success("Solicitação cancelada");
        router.refresh();
      } else {
        toast.error(result.error ?? "Erro ao cancelar");
      }
    });
  }

  const alertCount =
    alerts.pending.length +
    alerts.overduePayments.length +
    (alerts.emptyTomorrow ? 1 : 0);

  const kpiCards = useMemo(() => {
    const cards: Array<{
      label: string;
      value: string;
      sub?: string;
      icon: typeof CalendarCheck;
      tone: "default" | "good" | "warn" | "bad" | "dark";
    }> = [
      {
        label: "Agendamentos hoje",
        value: String(kpis.appointmentsToday),
        sub: `${kpis.finishedCount} finalizados`,
        icon: CalendarCheck,
        tone: "default",
      },
      {
        label: "Finalizados",
        value: String(kpis.finishedCount),
        sub: "Atendimentos completos",
        icon: CheckCircle2,
        tone: "good",
      },
    ];
    if (canSeeFinance) {
      cards.push(
        {
          label: "Recebido",
          value: formatBRL(kpis.receivedCents),
          icon: TrendingUp,
          tone: "good",
        },
        {
          label: "A receber",
          value: formatBRL(kpis.pendingCents),
          icon: Wallet,
          tone: "warn",
        },
        {
          label: "Despesas",
          value: formatBRL(kpis.expensesCents),
          icon: Receipt,
          tone: "bad",
        },
        {
          label: "Saldo do dia",
          value: formatBRL(saldo),
          icon: CreditCard,
          tone: "dark",
        },
      );
    }
    return cards;
  }, [kpis, saldo, canSeeFinance]);

  return (
    <div>
      <SectionHeading
        title="Visão do dia"
        description="Snapshot operacional. Use os atalhos abaixo para acelerar."
      />

      {/* Quick actions */}
      <div className="mb-6 flex flex-wrap gap-2">
        <Link
          href="/app/calendarios"
          className="inline-flex items-center gap-2 rounded-md bg-zinc-950 px-3 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
        >
          <Plus className="size-4" />
          Agendamento
        </Link>
        <Link
          href="/app/clientes"
          className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50"
        >
          <UserPlus className="size-4" />
          Tutor
        </Link>
        {canSeeFinance ? (
          <Link
            href="/app/caixa"
            className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50"
          >
            <Receipt className="size-4" />
            Despesa
          </Link>
        ) : null}
      </div>

      {/* KPI grid */}
      <div
        className={
          "mb-6 grid gap-3 " +
          (canSeeFinance ? "sm:grid-cols-2 lg:grid-cols-6" : "sm:grid-cols-2")
        }
      >
        {kpiCards.map((c) => {
          const Icon = c.icon;
          const isDark = c.tone === "dark";
          const accent =
            c.tone === "good"
              ? "text-emerald-600"
              : c.tone === "warn"
                ? "text-amber-600"
                : c.tone === "bad"
                  ? "text-rose-600"
                  : "text-zinc-700";
          return (
            <Card
              key={c.label}
              className={
                "rounded-lg shadow-none " +
                (isDark
                  ? "border-zinc-950 bg-zinc-950 text-white"
                  : "border-zinc-200 bg-white")
              }
            >
              <CardContent className="p-4">
                <div
                  className={
                    "flex items-center gap-2 text-xs uppercase tracking-wide " +
                    (isDark ? "text-zinc-400" : "text-zinc-500")
                  }
                >
                  <Icon className={"size-4 " + (isDark ? "text-white" : accent)} />
                  {c.label}
                </div>
                <p
                  className={
                    "mt-2 text-2xl font-semibold " +
                    (isDark
                      ? saldo >= 0
                        ? "text-white"
                        : "text-rose-300"
                      : "text-zinc-950")
                  }
                >
                  {c.value}
                </p>
                {c.sub ? (
                  <p
                    className={
                      "text-xs " + (isDark ? "text-zinc-400" : "text-zinc-500")
                    }
                  >
                    {c.sub}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Main column */}
        <div className="space-y-4">
          {/* Em atendimento */}
          <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
            <CardContent className="p-5">
              <div className="mb-3 flex items-center gap-2">
                <Clock className="size-4 text-blue-600" />
                <h2 className="text-sm font-semibold text-zinc-950">
                  Em atendimento agora
                </h2>
                <span className="ml-auto text-xs text-zinc-500">
                  {inProgress.length} ativo(s)
                </span>
              </div>
              {inProgress.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  Nenhum atendimento em andamento.
                </p>
              ) : (
                <ul className="divide-y divide-zinc-100">
                  {inProgress.map((a) => (
                    <ApptRow key={a.id} appt={a} accent="blue" />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Próximos hoje */}
          <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
            <CardContent className="p-5">
              <div className="mb-3 flex items-center gap-2">
                <CalendarDays className="size-4 text-zinc-700" />
                <h2 className="text-sm font-semibold text-zinc-950">
                  Próximos hoje
                </h2>
                <span className="ml-auto text-xs text-zinc-500">
                  {upcoming.length}
                </span>
              </div>
              {upcoming.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  Sem agendamentos pendentes pelo resto do dia.
                </p>
              ) : (
                <ul className="divide-y divide-zinc-100">
                  {upcoming.map((a) => (
                    <ApptRow key={a.id} appt={a} accent="zinc" />
                  ))}
                </ul>
              )}
              <div className="mt-3 text-right">
                <Link
                  href="/app/calendarios"
                  className="inline-flex items-center gap-1 text-xs font-medium text-zinc-700 hover:text-zinc-950"
                >
                  Ver calendário completo
                  <ArrowRight className="size-3" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alerts side panel */}
        <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-600" />
              <h2 className="text-sm font-semibold text-zinc-950">Alertas</h2>
              <span className="ml-auto text-xs text-zinc-500">{alertCount}</span>
            </div>

            {/* Pendentes — bloco destacado quando há solicitações novas do site público */}
            {alerts.pending.length > 0 ? (
              <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <span className="relative flex size-2.5">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex size-2.5 rounded-full bg-amber-500" />
                  </span>
                  <p className="text-sm font-bold text-amber-950">
                    Solicitações pendentes
                  </p>
                  <span className="ml-auto rounded-full bg-amber-600 px-2 py-0.5 text-xs font-bold text-white">
                    {alerts.pending.length}
                  </span>
                </div>
                <ul className="space-y-2">
                  {alerts.pending.slice(0, 5).map((a) => (
                    <li
                      key={a.id}
                      className="flex flex-wrap items-center gap-2 rounded-md bg-white p-2"
                    >
                      <span className="font-mono text-xs font-medium text-zinc-700">
                        {HHMM.format(new Date(a.startIso))}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-zinc-900">
                          {a.serviceName ?? "Serviço"}
                        </p>
                        <p className="truncate text-[0.6875rem] text-zinc-500">
                          {a.petName ?? a.tutorName ?? "—"}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => handleConfirm(a.id)}
                          disabled={pendingTx}
                          className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-[0.6875rem] font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
                        >
                          <CheckCircle2 className="size-3" />
                          Confirmar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCancel(a.id)}
                          disabled={pendingTx}
                          className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-white px-2 py-1 text-[0.6875rem] font-medium text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
                        >
                          <Ban className="size-3" />
                          Recusar
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                {alerts.pending.length > 5 ? (
                  <p className="mt-2 text-[0.6875rem] text-amber-800">
                    + {alerts.pending.length - 5} outra(s) no calendário
                  </p>
                ) : null}
              </div>
            ) : (
              <AlertBlock
                title="Pendentes sem confirmação"
                empty="Tudo confirmado."
                count={0}
              />
            )}

            {canSeeFinance ? (
              <AlertBlock
                title="A receber em atraso"
                empty="Sem cobranças vencidas."
                count={alerts.overduePayments.length}
              >
                {alerts.overduePayments.slice(0, 5).map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-2 py-1.5 text-xs"
                  >
                    <span className="truncate text-zinc-900">
                      {a.serviceName ?? "Serviço"} ·{" "}
                      {a.petName ?? a.tutorName ?? "—"}
                    </span>
                    <span className="shrink-0 font-semibold text-rose-700">
                      {formatBRL(a.priceCents)}
                    </span>
                  </li>
                ))}
                {alerts.overduePayments.length > 0 ? (
                  <Link
                    href="/app/caixa"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-zinc-700 hover:text-zinc-950"
                  >
                    Ir pro caixa
                    <ArrowRight className="size-3" />
                  </Link>
                ) : null}
              </AlertBlock>
            ) : null}

            {alerts.emptyTomorrow ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <ListChecks className="mr-1 inline size-3.5" />
                Amanhã não tem nenhum agendamento. Vale revisar a divulgação.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ApptRow({ appt, accent }: { appt: DashboardAppt; accent: "blue" | "zinc" }) {
  const accentClass =
    accent === "blue" ? "border-l-blue-500 bg-blue-50/40" : "border-l-zinc-200";
  return (
    <li className={"flex items-center gap-3 border-l-2 py-2.5 pl-3 " + accentClass}>
      <span className="font-mono text-sm font-medium text-zinc-700">
        {HHMM.format(new Date(appt.startIso))}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-950">
          {appt.serviceName ?? "Serviço"}
        </p>
        <p className="truncate text-xs text-zinc-500">
          {appt.petName ?? appt.tutorName ?? "—"} · {AREA_LABEL[appt.area]}
        </p>
      </div>
    </li>
  );
}

function AlertBlock({
  title,
  count,
  empty,
  children,
}: {
  title: string;
  count: number;
  empty: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-zinc-700">{title}</p>
        <span className="text-[0.625rem] text-zinc-500">{count}</span>
      </div>
      {count === 0 ? (
        <p className="text-xs text-zinc-500">{empty}</p>
      ) : (
        <ul className="divide-y divide-zinc-100">{children}</ul>
      )}
    </div>
  );
}
