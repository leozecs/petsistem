"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Ban,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  PenLine,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cancelAppointment, saveAppointment } from "@/app/app/calendarios/actions";
import {
  computeAvailability,
  type AppointmentStatus,
  type ScheduleInput,
} from "@/lib/calendar/availability";
import {
  PETSHOP_TZ_OFFSET_MIN,
  utcInstantOfPetshopMidnight,
} from "@/lib/calendar/time";
import type { Database } from "@/lib/supabase/database.types";

type ServiceArea = Database["public"]["Enums"]["service_area"];
type CalendarRow = Database["public"]["Tables"]["calendars"]["Row"];
type ServiceRow = Database["public"]["Tables"]["services"]["Row"];

type ApptSummary = {
  id: string;
  startIso: string;
  endIso: string;
  status: AppointmentStatus;
  pet_name: string | null;
  service_name: string | null;
  professional_name: string | null;
  tutor_name: string | null;
};

type Props = {
  areas: ServiceArea[];
  activeArea: ServiceArea;
  calendars: CalendarRow[];
  activeCalendarId: string;
  activeDateIso: string;
  visibleYear: number;
  visibleMonth0: number;
  services: ServiceRow[];
  veterinarians: { id: string; name: string }[];
  employees: { id: string; name: string }[];
  clients: { id: string; name: string; phone: string }[];
  pets: { id: string; name: string; client_id: string; species: string }[];
  schedules: ScheduleInput[];
  appointmentsByDay: Record<string, ApptSummary[]>;
};

const HHMM = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "America/Sao_Paulo",
});

const LONG_DATE = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});

const MONTH_NAME = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});

const WEEKDAY_LABELS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

const formSchema = z.object({
  service_id: z.string().uuid("Serviço obrigatório"),
  starts_at: z.string().min(1, "Horário obrigatório"),
  client_id: z.string().uuid().optional().or(z.literal("")),
  pet_id: z.string().uuid().optional().or(z.literal("")),
  veterinarian_id: z.string().uuid().optional().or(z.literal("")),
  employee_id: z.string().uuid().optional().or(z.literal("")),
  tutor_name: z.string().trim().optional(),
  tutor_phone: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});
type FormValues = z.infer<typeof formSchema>;

function statusLabel(status: AppointmentStatus): string {
  switch (status) {
    case "pending": return "Pendente";
    case "confirmed": return "Confirmado";
    case "checked_in": return "Check-in";
    case "in_progress": return "Em atendimento";
    case "finished": return "Finalizado";
    case "cancelled": return "Cancelado";
    case "no_show": return "Não compareceu";
  }
}

function statusChipClass(status: AppointmentStatus): string {
  if (status === "in_progress") return "bg-blue-100 text-blue-700 border-blue-200";
  if (status === "confirmed") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (status === "pending" || status === "checked_in") return "bg-amber-100 text-amber-800 border-amber-200";
  if (status === "cancelled" || status === "no_show") return "bg-rose-100 text-rose-700 border-rose-200";
  return "bg-zinc-100 text-zinc-700 border-zinc-200";
}

function statusDotClass(status: AppointmentStatus): string {
  if (status === "in_progress") return "bg-blue-500";
  if (status === "confirmed") return "bg-emerald-500";
  if (status === "pending" || status === "checked_in") return "bg-amber-500";
  if (status === "cancelled" || status === "no_show") return "bg-rose-500";
  return "bg-zinc-400";
}

const VALID_STATUSES: AppointmentStatus[] = [
  "pending",
  "confirmed",
  "checked_in",
  "in_progress",
  "finished",
];

const AREA_LABEL: Record<ServiceArea, string> = {
  grooming: "Banho e Tosa",
  veterinary: "Veterinária",
};

function formatHHmm(iso: string) {
  return HHMM.format(new Date(iso));
}

function isoDateOnlyParts(year: number, month0: number, day: number): string {
  return `${year}-${String(month0 + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

type GridCell = {
  iso: string;
  day: number;
  month0: number;
  inMonth: boolean;
  isToday: boolean;
};

function buildMonthGrid(year: number, month0: number, todayIso: string): GridCell[] {
  const firstDayOfMonth = new Date(year, month0, 1);
  const startDow = firstDayOfMonth.getDay(); // 0=Sun
  const start = new Date(year, month0, 1 - startDow);
  const cells: GridCell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const cellYear = d.getFullYear();
    const cellMonth0 = d.getMonth();
    const cellDay = d.getDate();
    const iso = isoDateOnlyParts(cellYear, cellMonth0, cellDay);
    cells.push({
      iso,
      day: cellDay,
      month0: cellMonth0,
      inMonth: cellMonth0 === month0,
      isToday: iso === todayIso,
    });
  }
  return cells;
}

function todayInPetshopIso(): string {
  const now = new Date();
  const adjusted = new Date(now.getTime() + PETSHOP_TZ_OFFSET_MIN * 60_000);
  return isoDateOnlyParts(
    adjusted.getUTCFullYear(),
    adjusted.getUTCMonth(),
    adjusted.getUTCDate(),
  );
}

export function CalendariosView({
  areas,
  activeArea,
  calendars,
  activeCalendarId,
  activeDateIso,
  visibleYear,
  visibleMonth0,
  services,
  veterinarians,
  employees,
  clients,
  pets,
  schedules,
  appointmentsByDay,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);

  // Re-evaluate "today" once a minute so the highlight crosses midnight without a
  // hard reload — operators frequently leave the tab open overnight.
  const [todayIso, setTodayIso] = useState(todayInPetshopIso);
  useEffect(() => {
    const tick = () => setTodayIso(todayInPetshopIso());
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);
  const gridCells = useMemo(
    () => buildMonthGrid(visibleYear, visibleMonth0, todayIso),
    [visibleYear, visibleMonth0, todayIso],
  );

  const dayAppointments = useMemo(
    () => appointmentsByDay[activeDateIso] ?? [],
    [appointmentsByDay, activeDateIso],
  );

  const visibleMonthLabel = useMemo(() => {
    const formatted = MONTH_NAME.format(new Date(visibleYear, visibleMonth0, 15));
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }, [visibleYear, visibleMonth0]);

  const selectedDate = useMemo(() => {
    const [y, m, d] = activeDateIso.split("-").map(Number);
    return new Date(y!, (m ?? 1) - 1, d ?? 1);
  }, [activeDateIso]);

  const servicesForArea = useMemo(
    () => services.filter((s) => s.area === activeArea),
    [services, activeArea],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      service_id: servicesForArea[0]?.id ?? "",
      starts_at: "",
      client_id: "",
      pet_id: "",
      veterinarian_id: "",
      employee_id: "",
      tutor_name: "",
      tutor_phone: "",
      notes: "",
    },
  });

  const watchedClient = form.watch("client_id");
  const watchedService = form.watch("service_id");
  const selectedService = useMemo(
    () => servicesForArea.find((s) => s.id === watchedService) ?? null,
    [servicesForArea, watchedService],
  );
  const petsForClient = useMemo(
    () => (watchedClient ? pets.filter((p) => p.client_id === watchedClient) : []),
    [watchedClient, pets],
  );

  const availableSlots = useMemo(() => {
    if (!selectedService) return [];
    const [y, m, d] = activeDateIso.split("-").map(Number);
    if (!y || !m || !d) return [];
    const petshopMidnight = utcInstantOfPetshopMidnight(y, m - 1, d);
    const nextDay = isoDateOnlyParts(y, m - 1, d + 1);
    const prevDay = isoDateOnlyParts(y, m - 1, d - 1);
    // Cross-midnight appointments (e.g. yesterday 23:30 → today 01:00) live in
    // the previous day's bucket but still occupy slots on the active day. Pull
    // the adjacent buckets so the engine sees them.
    const candidates = [
      ...(appointmentsByDay[prevDay] ?? []),
      ...(appointmentsByDay[activeDateIso] ?? []),
      ...(appointmentsByDay[nextDay] ?? []),
    ];
    const dayAppts = candidates
      .filter((a) => VALID_STATUSES.includes(a.status))
      .map((a) => ({
        id: a.id,
        starts_at: new Date(a.startIso),
        ends_at: new Date(a.endIso),
        status: a.status,
      }));
    return computeAvailability({
      petshopMidnightUtc: petshopMidnight,
      schedules,
      appointments: dayAppts,
      slotDurationMin: selectedService.duration_minutes,
      stepMin: 30,
    }).filter((s) => s.status === "free");
  }, [selectedService, activeDateIso, schedules, appointmentsByDay]);

  function navigateMonth(delta: number) {
    const next = new Date(visibleYear, visibleMonth0 + delta, 1);
    const iso = isoDateOnlyParts(next.getFullYear(), next.getMonth(), 1);
    pushUrl({ date: iso });
  }

  function navigateToToday() {
    pushUrl({ date: todayIso });
  }

  function pushUrl(patch: { area?: ServiceArea; date?: string; calendar?: string }) {
    // Preserve existing query params (notably `calendar` when a tenant has more
    // than one calendar per area). Without this, navigating month/day would
    // silently reset the user to the area's first calendar.
    const url = new URL(window.location.href);
    if (patch.area) url.searchParams.set("area", patch.area);
    if (patch.date) url.searchParams.set("date", patch.date);
    if (patch.calendar) url.searchParams.set("calendar", patch.calendar);
    router.push(`${url.pathname}?${url.searchParams.toString()}`);
  }

  function openCreate() {
    form.reset({
      service_id: servicesForArea[0]?.id ?? "",
      starts_at: "",
      client_id: "",
      pet_id: "",
      veterinarian_id: "",
      employee_id: "",
      tutor_name: "",
      tutor_phone: "",
      notes: "",
    });
    setDialogOpen(true);
  }

  function onSubmit(values: FormValues) {
    const service = servicesForArea.find((s) => s.id === values.service_id);
    if (!service) {
      toast.error("Selecione um serviço.");
      return;
    }
    const startDate = new Date(values.starts_at);
    const endDate = new Date(startDate.getTime() + service.duration_minutes * 60_000);

    const fd = new FormData();
    fd.set("calendar_id", activeCalendarId);
    fd.set("service_id", values.service_id);
    fd.set("client_id", values.client_id ?? "");
    fd.set("pet_id", values.pet_id ?? "");
    fd.set("veterinarian_id", values.veterinarian_id ?? "");
    fd.set("employee_id", values.employee_id ?? "");
    fd.set("starts_at", startDate.toISOString());
    fd.set("ends_at", endDate.toISOString());
    fd.set("tutor_name", values.tutor_name ?? "");
    fd.set("tutor_phone", values.tutor_phone ?? "");
    fd.set("notes", values.notes ?? "");

    startTransition(async () => {
      const result = await saveAppointment({ ok: false }, fd);
      if (result.ok) {
        toast.success("Agendamento criado");
        setDialogOpen(false);
        router.refresh();
      } else if (result.fieldErrors) {
        for (const [key, msg] of Object.entries(result.fieldErrors)) {
          form.setError(key as keyof FormValues, { message: msg });
        }
      } else if (result.error) {
        toast.error(result.error);
      }
    });
  }

  function handleCancel(apptId: string) {
    if (!confirm("Cancelar este agendamento?")) return;
    startTransition(async () => {
      const result = await cancelAppointment(apptId);
      if (result.ok) {
        toast.success("Agendamento cancelado");
        router.refresh();
      } else {
        toast.error(result.error ?? "Erro ao cancelar");
      }
    });
  }

  const showAreaTabs = areas.length > 1;
  const hasMultipleCalendarsForArea =
    calendars.filter((c) => c.area === activeArea).length > 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
            Calendários
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            {showAreaTabs
              ? "Alterna entre Banho e Tosa e Veterinária."
              : `Calendário ${AREA_LABEL[activeArea].toLowerCase()}.`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {showAreaTabs ? (
            <div className="inline-flex rounded-md border border-zinc-200 bg-white p-1">
              {areas.map((a) => {
                const active = a === activeArea;
                const href = `/app/calendarios?area=${a}&date=${activeDateIso}`;
                return (
                  <Link
                    key={a}
                    href={href}
                    className={
                      "rounded-md px-3 py-1.5 text-sm font-medium transition " +
                      (active
                        ? "bg-zinc-950 text-white shadow-sm"
                        : "text-zinc-600 hover:bg-zinc-100")
                    }
                  >
                    {AREA_LABEL[a]}
                  </Link>
                );
              })}
            </div>
          ) : null}
          <Button
            onClick={openCreate}
            className="hidden rounded-md bg-zinc-950 text-white hover:bg-zinc-800 sm:inline-flex"
          >
            <Plus className="size-4" />
            Agendar
          </Button>
        </div>
      </div>

      {/* Month nav row */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="rounded-md border-zinc-200 bg-white"
            onClick={() => navigateMonth(-1)}
            aria-label="Mês anterior"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-[10rem] text-base font-semibold text-zinc-950">
            {visibleMonthLabel}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="rounded-md border-zinc-200 bg-white"
            onClick={() => navigateMonth(1)}
            aria-label="Próximo mês"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="rounded-md border-zinc-200 bg-white"
          onClick={navigateToToday}
        >
          Hoje
        </Button>
      </div>

      {/* Grid + day panel */}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="overflow-hidden rounded-lg border-zinc-200 bg-white shadow-none">
          <div className="grid grid-cols-7 border-b border-zinc-200 bg-zinc-50">
            {WEEKDAY_LABELS.map((d) => (
              <div
                key={d}
                className="px-2 py-2 text-center text-xs font-medium uppercase tracking-wide text-zinc-500"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {gridCells.map((cell) => {
              const appts = appointmentsByDay[cell.iso] ?? [];
              const validAppts = appts.filter((a) => VALID_STATUSES.includes(a.status));
              const isActive = cell.iso === activeDateIso;
              const firstAppt = validAppts[0];
              return (
                <button
                  key={cell.iso}
                  onClick={() => pushUrl({ date: cell.iso })}
                  className={
                    "flex h-24 flex-col gap-1 border-b border-r border-zinc-100 p-2 text-left transition focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:h-28 " +
                    (isActive
                      ? "bg-zinc-950 text-white"
                      : cell.inMonth
                        ? "bg-white text-zinc-900 hover:bg-zinc-50"
                        : "bg-zinc-50/60 text-zinc-400 hover:bg-zinc-100")
                  }
                  aria-label={`Selecionar ${cell.iso}`}
                  aria-pressed={isActive}
                >
                  <div className="flex items-start justify-between">
                    <span
                      className={
                        "text-sm " +
                        (cell.isToday ? "font-bold" : "font-medium") +
                        (isActive ? " text-white" : "")
                      }
                    >
                      {cell.day}
                    </span>
                    {validAppts.length > 0 ? (
                      <span
                        className={
                          "inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[0.625rem] font-semibold " +
                          (isActive
                            ? "bg-white/20 text-white"
                            : "bg-zinc-900 text-white")
                        }
                      >
                        {validAppts.length}
                      </span>
                    ) : null}
                  </div>
                  {firstAppt ? (
                    <div
                      className={
                        "mt-auto flex items-center gap-1.5 truncate rounded px-1.5 py-1 text-[0.6875rem] " +
                        (isActive
                          ? "bg-white/15 text-white"
                          : statusChipClass(firstAppt.status))
                      }
                    >
                      <span
                        className={
                          "h-1.5 w-1.5 shrink-0 rounded-full " +
                          (isActive ? "bg-white" : statusDotClass(firstAppt.status))
                        }
                      />
                      <span className="truncate">
                        {formatHHmm(firstAppt.startIso)} ·{" "}
                        {firstAppt.service_name ?? firstAppt.pet_name ?? "—"}
                      </span>
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
          <CardContent className="space-y-4 p-5">
            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-500">Dia</p>
              <p className="mt-1 text-base font-semibold text-zinc-950">
                {LONG_DATE.format(selectedDate)}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                Compromissos ({dayAppointments.length})
              </p>
              {dayAppointments.length === 0 ? (
                <div className="mt-3 rounded-md border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
                  Nenhum agendamento neste dia.
                </div>
              ) : (
                <ul className="mt-3 space-y-2">
                  {dayAppointments.map((a) => (
                    <li
                      key={a.id}
                      className="rounded-md border border-zinc-200 bg-white p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-medium text-zinc-700">
                              {formatHHmm(a.startIso)}
                            </span>
                            <span
                              className={
                                "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[0.625rem] font-medium " +
                                statusChipClass(a.status)
                              }
                            >
                              <span className={"h-1.5 w-1.5 rounded-full " + statusDotClass(a.status)} />
                              {statusLabel(a.status)}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-sm font-medium text-zinc-950">
                            {a.service_name ?? "Serviço"}
                          </p>
                          <p className="truncate text-xs text-zinc-500">
                            {a.pet_name ?? a.tutor_name ?? "Tutor avulso"}
                            {a.professional_name ? ` · ${a.professional_name}` : ""}
                          </p>
                        </div>
                        {a.status !== "cancelled" &&
                        a.status !== "finished" &&
                        a.status !== "no_show" ? (
                          <button
                            onClick={() => handleCancel(a.id)}
                            disabled={pending}
                            className="shrink-0 rounded-md border border-zinc-200 p-1.5 text-zinc-500 hover:bg-rose-50 hover:text-rose-700"
                            aria-label="Cancelar"
                          >
                            <Ban className="size-3.5" />
                          </button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-500">
              <CalendarDays className="mr-1 inline size-3.5" />
              {hasMultipleCalendarsForArea
                ? `${calendars.filter((c) => c.area === activeArea).length} calendários em ${AREA_LABEL[activeArea].toLowerCase()}.`
                : `Calendário ${AREA_LABEL[activeArea].toLowerCase()}.`}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mobile FAB. Spacer pushes scrollable content above the floating button so
          the last day-appointment row stays tappable. */}
      <div className="h-24 sm:hidden" aria-hidden />
      <button
        onClick={openCreate}
        className="fixed bottom-6 right-6 z-40 inline-flex size-14 items-center justify-center rounded-full bg-zinc-950 text-white shadow-xl shadow-zinc-950/20 transition hover:bg-zinc-800 sm:hidden"
        aria-label="Novo agendamento"
      >
        <Plus className="size-6" />
      </button>

      {/* Form dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-xl border-zinc-200 bg-white sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Novo agendamento</DialogTitle>
            <DialogDescription>
              {LONG_DATE.format(selectedDate)} · {AREA_LABEL[activeArea]}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-4 sm:grid-cols-2"
          >
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="service_id">Serviço</Label>
              <Select
                value={form.watch("service_id") || undefined}
                onValueChange={(v) =>
                  form.setValue("service_id", String(v ?? ""), { shouldValidate: true })
                }
              >
                <SelectTrigger id="service_id" className="rounded-md">
                  <SelectValue placeholder="Escolha o serviço" />
                </SelectTrigger>
                <SelectContent>
                  {servicesForArea.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} · {s.duration_minutes} min · R${" "}
                      {(s.price_cents / 100).toFixed(2).replace(".", ",")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.service_id ? (
                <p className="text-xs text-rose-600">
                  {form.formState.errors.service_id.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="starts_at">Horário disponível</Label>
              <Select
                value={form.watch("starts_at") || undefined}
                onValueChange={(v) =>
                  form.setValue("starts_at", String(v ?? ""), { shouldValidate: true })
                }
                disabled={!selectedService}
              >
                <SelectTrigger id="starts_at" className="rounded-md">
                  <SelectValue
                    placeholder={
                      selectedService
                        ? availableSlots.length > 0
                          ? "Escolha o horário"
                          : "Sem horário livre nesse dia"
                        : "Selecione o serviço primeiro"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableSlots.map((slot) => {
                    const iso = slot.start.toISOString();
                    return (
                      <SelectItem key={iso} value={iso}>
                        {formatHHmm(iso)} – {formatHHmm(slot.end.toISOString())}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {form.formState.errors.starts_at ? (
                <p className="text-xs text-rose-600">
                  {form.formState.errors.starts_at.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="client_id">Tutor cadastrado</Label>
              <Select
                value={form.watch("client_id") || undefined}
                onValueChange={(v) => {
                  form.setValue("client_id", String(v ?? ""), { shouldValidate: true });
                  form.setValue("pet_id", "", { shouldValidate: true });
                }}
              >
                <SelectTrigger id="client_id" className="rounded-md">
                  <SelectValue placeholder="Opcional" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pet_id">Pet</Label>
              <Select
                value={form.watch("pet_id") || undefined}
                onValueChange={(v) =>
                  form.setValue("pet_id", String(v ?? ""), { shouldValidate: true })
                }
                disabled={!watchedClient}
              >
                <SelectTrigger id="pet_id" className="rounded-md">
                  <SelectValue
                    placeholder={watchedClient ? "Selecione" : "Selecione o tutor"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {petsForClient.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} · {p.species}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {activeArea === "veterinary" ? (
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="veterinarian_id">Veterinário</Label>
                <Select
                  value={form.watch("veterinarian_id") || undefined}
                  onValueChange={(v) =>
                    form.setValue("veterinarian_id", String(v ?? ""), { shouldValidate: true })
                  }
                >
                  <SelectTrigger id="veterinarian_id" className="rounded-md">
                    <SelectValue placeholder="Sem profissional definido" />
                  </SelectTrigger>
                  <SelectContent>
                    {veterinarians.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="employee_id">Profissional</Label>
                <Select
                  value={form.watch("employee_id") || undefined}
                  onValueChange={(v) =>
                    form.setValue("employee_id", String(v ?? ""), { shouldValidate: true })
                  }
                >
                  <SelectTrigger id="employee_id" className="rounded-md">
                    <SelectValue placeholder="Sem profissional definido" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="tutor_name">Tutor avulso</Label>
              <Input id="tutor_name" placeholder="Nome do tutor" {...form.register("tutor_name")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tutor_phone">Telefone</Label>
              <Input
                id="tutor_phone"
                placeholder="(19) 99999-0000"
                {...form.register("tutor_phone")}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea id="notes" rows={3} {...form.register("notes")} />
            </div>

            <DialogFooter className="sm:col-span-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-md border-zinc-300 bg-white"
                onClick={() => setDialogOpen(false)}
                disabled={pending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="rounded-md bg-zinc-950 text-white hover:bg-zinc-800"
                disabled={pending}
              >
                {pending ? "Salvando…" : (
                  <>
                    <PenLine className="size-4" />
                    Criar agendamento
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
