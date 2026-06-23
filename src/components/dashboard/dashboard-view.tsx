"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Ban, CalendarCheck, CalendarDays, CheckCircle2, Clock, Plus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { cancelAppointment, updateAppointmentStatus } from "@/app/app/calendarios/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeading } from "@/components/app/section-heading";
import type { Database } from "@/lib/supabase/database.types";

type Area = Database["public"]["Enums"]["service_area"];
type Status = Database["public"]["Enums"]["appointment_status"];
export type DashboardAppt = { id: string; startIso: string; endIso: string; status: Status; petName: string | null; serviceName: string | null; tutorName: string | null; area: Area };
type Props = { canSeeFinance: boolean; userName: string | null; kpis: { appointmentsToday: number; receivedCents: number; pendingCents: number; expensesCents: number; finishedCount: number }; inProgress: DashboardAppt[]; upcoming: DashboardAppt[]; alerts: { pending: DashboardAppt[]; overduePayments: Array<DashboardAppt & { priceCents: number }>; emptyTomorrow: boolean } };
const HOUR = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
const DATE = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });

export function DashboardView({ kpis, inProgress, upcoming, alerts }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const mutate = (id: string, action: "confirm" | "cancel") => startTransition(async () => {
    const result = action === "confirm" ? await updateAppointmentStatus(id, "confirmed") : await cancelAppointment(id);
    if (!result.ok) { toast.error(result.error ?? "Erro ao atualizar."); return; }
    toast.success(action === "confirm" ? "Agendamento confirmado." : "Agendamento recusado."); router.refresh();
  });
  return <div>
    <SectionHeading title="Visão do dia" description="Operação do petshop sem indicadores financeiros." />
    <div className="mb-6 flex gap-2"><Button render={<Link href="/app/calendarios" />}><Plus className="size-4" /> Agendamento</Button><Button variant="outline" render={<Link href="/app/clientes" />}><UserPlus className="size-4" /> Tutor</Button></div>
    <div className="mb-6 grid gap-3 sm:grid-cols-2"><Metric icon={CalendarCheck} label="Agendamentos hoje" value={kpis.appointmentsToday} /><Metric icon={CheckCircle2} label="Finalizados" value={kpis.finishedCount} /></div>
    <Card className="mb-6 border-amber-200 bg-amber-50 shadow-none"><CardContent className="p-5"><div className="mb-4 flex items-center gap-2"><AlertTriangle className="size-5 text-amber-600" /><h2 className="font-semibold text-amber-950">Agendamentos a confirmar</h2><span className="ml-auto rounded-full bg-amber-600 px-2.5 py-1 text-xs font-bold text-white">{alerts.pending.length}</span></div>{alerts.pending.length === 0 ? <p className="text-sm text-amber-800">Tudo confirmado.</p> : <ul className="grid gap-2 md:grid-cols-2">{alerts.pending.map((appointment) => <li key={appointment.id} className="flex items-center gap-3 rounded-lg border border-amber-200 bg-white p-3"><div className="font-mono text-xs text-zinc-600">{DATE.format(new Date(appointment.startIso))}<br />{HOUR.format(new Date(appointment.startIso))}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{appointment.petName ?? appointment.tutorName ?? "Pet"}</p><p className="truncate text-xs text-zinc-500">{appointment.serviceName ?? "Serviço"}</p></div><button onClick={() => mutate(appointment.id, "confirm")} disabled={pending} className="rounded-md bg-emerald-600 p-2 text-white" aria-label="Confirmar"><CheckCircle2 className="size-4" /></button><button onClick={() => mutate(appointment.id, "cancel")} disabled={pending} className="rounded-md border border-rose-200 p-2 text-rose-700" aria-label="Recusar"><Ban className="size-4" /></button></li>)}</ul>}</CardContent></Card>
    <div className="grid gap-6 lg:grid-cols-2"><AppointmentList icon={Clock} title="Em atendimento agora" items={inProgress} /><AppointmentList icon={CalendarDays} title="Próximos hoje" items={upcoming} /></div>
  </div>;
}

function Metric({ icon: Icon, label, value }: { icon: typeof CalendarCheck; label: string; value: number }) { return <Card className="border-zinc-200 bg-white shadow-none"><CardContent className="p-4"><div className="flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-500"><Icon className="size-4" />{label}</div><p className="mt-2 text-2xl font-semibold">{value}</p></CardContent></Card>; }
function AppointmentList({ icon: Icon, title, items }: { icon: typeof Clock; title: string; items: DashboardAppt[] }) { return <Card className="border-zinc-200 bg-white shadow-none"><CardContent className="p-5"><div className="mb-3 flex items-center gap-2"><Icon className="size-4" /><h2 className="text-sm font-semibold">{title}</h2><span className="ml-auto text-xs text-zinc-500">{items.length}</span></div>{items.length === 0 ? <p className="text-sm text-zinc-500">Nenhum atendimento.</p> : <ul className="divide-y divide-zinc-100">{items.map((item) => <li key={item.id} className="flex gap-3 py-3"><span className="font-mono text-sm">{HOUR.format(new Date(item.startIso))}</span><div><p className="text-sm font-medium">{item.petName ?? item.tutorName ?? "Pet"}</p><p className="text-xs text-zinc-500">{item.serviceName ?? "Serviço"}</p></div></li>)}</ul>}</CardContent></Card>; }
