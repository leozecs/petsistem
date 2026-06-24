"use client";

import Link from "next/link";
import { memo, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Ban,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Clock,
  Plus,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { cancelAppointment, updateAppointmentStatus } from "@/app/app/calendarios/actions";
import { SectionHeading } from "@/components/app/section-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Database } from "@/lib/supabase/database.types";

type Area = Database["public"]["Enums"]["service_area"];
type Status = Database["public"]["Enums"]["appointment_status"];

export type DashboardAppt = {
  id: string;
  startIso: string;
  endIso: string;
  status: Status;
  petName: string | null;
  serviceName: string | null;
  tutorName: string | null;
  area: Area;
};

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
    overduePayments: Array<DashboardAppt & { priceCents: number }>;
    emptyTomorrow: boolean;
  };
};

const HOUR = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});
const DATE = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "America/Sao_Paulo",
});

export function DashboardView({ kpis, inProgress, upcoming, alerts }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function mutate(id: string, action: "confirm" | "cancel") {
    startTransition(async () => {
      const result =
        action === "confirm"
          ? await updateAppointmentStatus(id, "confirmed")
          : await cancelAppointment(id);
      if (!result.ok) {
        toast.error(result.error ?? "Erro ao atualizar.");
        return;
      }
      toast.success(action === "confirm" ? "Agendamento confirmado." : "Agendamento recusado.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Visão do dia"
        description="Prioridades, confirmações e próximos atendimentos em uma única tela."
        action={
          <>
            <Button render={<Link href="/app/calendarios" />}>
              <Plus className="size-4" />
              Agendamento
            </Button>
            <Button variant="outline" render={<Link href="/app/clientes" />}>
              <UserPlus className="size-4" />
              Tutor
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Metric icon={CalendarCheck} label="Agendamentos hoje" value={kpis.appointmentsToday} />
        <Metric icon={CheckCircle2} label="Finalizados" value={kpis.finishedCount} />
      </div>

      {alerts.pending.length > 0 ? (
        <Card className="border-amber-200 bg-amber-50 shadow-none">
          <CardContent className="p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-700" />
              <h2 className="font-semibold text-amber-950">Aguardando confirmação</h2>
              <span className="ml-auto rounded-full bg-amber-700 px-2.5 py-1 text-xs font-bold text-white">
                {alerts.pending.length}
              </span>
            </div>
            <ul className="grid gap-2 xl:grid-cols-2">
              {alerts.pending.map((appointment) => (
                <li
                  key={appointment.id}
                  className="grid grid-cols-[auto_1fr] gap-3 rounded-lg border border-amber-200 bg-white p-3 sm:grid-cols-[auto_1fr_auto] sm:items-center"
                >
                  <div className="font-mono text-xs tabular-nums text-zinc-600">
                    {DATE.format(new Date(appointment.startIso))}
                    <br />
                    {HOUR.format(new Date(appointment.startIso))}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-950">
                      {appointment.petName ?? appointment.tutorName ?? "Pet"}
                    </p>
                    <p className="truncate text-xs text-zinc-500">
                      {appointment.serviceName ?? "Serviço"}
                    </p>
                  </div>
                  <div className="col-span-2 grid grid-cols-2 gap-2 sm:col-span-1 sm:flex">
                    <Button
                      size="sm"
                      onClick={() => mutate(appointment.id, "confirm")}
                      disabled={pending}
                      className="bg-emerald-700 text-white hover:bg-emerald-800"
                    >
                      <CheckCircle2 className="size-4" />
                      <span className="sm:sr-only">Confirmar</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => mutate(appointment.id, "cancel")}
                      disabled={pending}
                      className="border-rose-200 text-rose-700 hover:bg-rose-50"
                    >
                      <Ban className="size-4" />
                      <span className="sm:sr-only">Recusar</span>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <CheckCircle2 className="size-5 shrink-0 text-emerald-700" />
          Todos os agendamentos estão confirmados.
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <AppointmentList icon={Clock} title="Em atendimento agora" items={inProgress} />
        <AppointmentList icon={CalendarDays} title="Próximos hoje" items={upcoming} />
      </div>
    </div>
  );
}

const Metric = memo(function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
}) {
  return (
    <Card className="border-zinc-200 bg-white shadow-none">
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-950">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
});

const AppointmentList = memo(function AppointmentList({
  icon: Icon,
  title,
  items,
}: {
  icon: LucideIcon;
  title: string;
  items: DashboardAppt[];
}) {
  return (
    <Card className="border-zinc-200 bg-white shadow-none">
      <CardContent className="p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <Icon className="size-4 text-zinc-500" />
          <h2 className="text-sm font-semibold text-zinc-950">{title}</h2>
          <span className="ml-auto rounded-full bg-zinc-100 px-2 py-0.5 text-xs tabular-nums text-zinc-600">
            {items.length}
          </span>
        </div>
        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/70 p-5 text-center text-sm text-zinc-500">
            Nenhum atendimento neste momento.
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {items.map((item) => (
              <li key={item.id} className="flex gap-3 py-3">
                <span className="font-mono text-sm tabular-nums text-zinc-700">
                  {HOUR.format(new Date(item.startIso))}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-950">
                    {item.petName ?? item.tutorName ?? "Pet"}
                  </p>
                  <p className="truncate text-xs text-zinc-500">
                    {item.serviceName ?? "Serviço"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
});
