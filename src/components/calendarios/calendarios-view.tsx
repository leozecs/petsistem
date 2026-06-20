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
  ChevronRight as ChevronAdvance,
  ClipboardList,
  MessageCircle,
  PenLine,
  Plus,
  Undo2,
  UserX,
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  cancelAppointment,
  createClientInline,
  createPetInline,
  saveAppointment,
  updateAppointmentStatus,
} from "@/app/app/calendarios/actions";
import {
  forwardLabel,
  isTerminal,
  nextStatus,
  prevStatus,
} from "@/lib/calendar/status";
import { buildConfirmationMessage, buildWhatsappUrl } from "@/lib/whatsapp";
import { ChecklistDialog } from "@/components/calendarios/checklist-dialog";
import { RecordDialog } from "@/components/calendarios/record-dialog";
import { Combobox } from "@/components/ui/combobox";
import {
  computeAvailability,
  effectiveSchedules,
  type AppointmentStatus,
  type ScheduleInput,
} from "@/lib/calendar/availability";
import {
  PETSHOP_TZ_OFFSET_MIN,
  petshopWeekday,
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
  tutor_phone: string | null;
  tutor_whatsapp: string | null;
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
  clients: { id: string; name: string; phone: string }[];
  pets: { id: string; name: string; client_id: string; species: string }[];
  schedules: ScheduleInput[];
  appointmentsByDay: Record<string, ApptSummary[]>;
  petshopName: string;
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
  client_id: z.string().uuid("Tutor obrigatório"),
  pet_id: z.string().uuid("Pet obrigatório"),
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
  // Use petshop-TZ weekday so the grid aligns correctly regardless of browser TZ.
  const firstOfMonthUtc = utcInstantOfPetshopMidnight(year, month0, 1);
  const startDow = petshopWeekday(firstOfMonthUtc); // 0=Sun in petshop TZ
  const cells: GridCell[] = [];
  for (let i = 0; i < 42; i++) {
    const offsetDays = i - startDow;
    // Walk from (1 - startDow) to (42 - startDow) relative to month start.
    const dayUtc = new Date(firstOfMonthUtc.getTime() + offsetDays * 86_400_000);
    const cellYear = dayUtc.getUTCFullYear();
    const cellMonth0 = dayUtc.getUTCMonth();
    const cellDay = dayUtc.getUTCDate();
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
  clients,
  pets,
  schedules,
  appointmentsByDay,
  petshopName,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  // Checklist dialog target. When set, ChecklistDialog opens for that appointment.
  // submitLabel toggles between "Salvar e iniciar" (intercept of checked_in→in_progress)
  // and "Salvar" (read/edit mode for already-started or finished bookings).
  const [checklist, setChecklist] = useState<{
    apptId: string;
    title: string;
    submitLabel: string;
  } | null>(null);
  // Prontuário (área veterinária) — mesmo padrão do checklist.
  const [record, setRecord] = useState<{
    apptId: string;
    title: string;
    submitLabel: string;
  } | null>(null);

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

  // Use the petshop-TZ midnight UTC instant so LONG_DATE (timeZone America/Sao_Paulo)
  // always formats the correct calendar day regardless of the browser's local TZ.
  const selectedDate = useMemo(() => {
    const [y, m, d] = activeDateIso.split("-").map(Number);
    if (!y || !m || !d) return new Date();
    return utcInstantOfPetshopMidnight(y, m - 1, d);
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
      notes: "",
    },
  });
  // Optimistically-added clients/pets created via inline server actions. Merged
  // into the visible options so the Combobox can immediately display + select
  // the freshly-created row without waiting for router.refresh().
  const [extraClients, setExtraClients] = useState<{ id: string; name: string; phone: string }[]>([]);
  const [extraPets, setExtraPets] = useState<{ id: string; name: string; client_id: string; species: string }[]>([]);
  const mergedClients = useMemo(() => [...clients, ...extraClients], [clients, extraClients]);
  const mergedPets = useMemo(() => [...pets, ...extraPets], [pets, extraPets]);

  const watchedClient = form.watch("client_id");
  const watchedService = form.watch("service_id");
  const selectedService = useMemo(
    () => servicesForArea.find((s) => s.id === watchedService) ?? null,
    [servicesForArea, watchedService],
  );
  const petsForClient = useMemo(
    () =>
      watchedClient ? mergedPets.filter((p) => p.client_id === watchedClient) : [],
    [watchedClient, mergedPets],
  );

  const availableSlots = useMemo(() => {
    if (!selectedService) return [];
    const [y, m, d] = activeDateIso.split("-").map(Number);
    if (!y || !m || !d) return [];
    const petshopMidnight = utcInstantOfPetshopMidnight(y, m - 1, d);
    const nextDay = isoDateOnlyParts(y, m - 1, d + 1);
    const prevDay = isoDateOnlyParts(y, m - 1, d - 1);
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

    // Generate raw 30-min anchor slots. Engine marks each as free/occupied
    // based on whether it overlaps any existing appointment.
    const rawSlots = computeAvailability({
      petshopMidnightUtc: petshopMidnight,
      schedules: effectiveSchedules(schedules),
      appointments: dayAppts,
      slotDurationMin: 30,
      stepMin: 30,
    });

    // A service of duration D needs ceil(D / 30) consecutive free 30-min slots
    // starting at the anchor. Walk the array and keep anchors whose forward
    // window is fully free AND contiguous (no gap across schedule windows).
    const slotsNeeded = Math.max(1, Math.ceil(selectedService.duration_minutes / 30));
    const bookable: typeof rawSlots = [];
    for (let i = 0; i <= rawSlots.length - slotsNeeded; i++) {
      const window = rawSlots.slice(i, i + slotsNeeded);
      if (!window.every((s) => s.status === "free")) continue;
      let contiguous = true;
      for (let j = 0; j < window.length - 1; j++) {
        if (window[j]!.end.getTime() !== window[j + 1]!.start.getTime()) {
          contiguous = false;
          break;
        }
      }
      if (contiguous) bookable.push(window[0]!);
    }
    return bookable;
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
      notes: "",
    });
    setDialogOpen(true);
  }

  async function handleCreateClient(query: string) {
    const result = await createClientInline(query);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setExtraClients((prev) =>
      prev.some((c) => c.id === result.id)
        ? prev
        : [...prev, { id: result.id, name: result.name, phone: "" }],
    );
    form.setValue("client_id", result.id, { shouldValidate: true });
    form.setValue("pet_id", "", { shouldValidate: false });
    toast.success(`Tutor "${result.name}" cadastrado`);
  }

  async function handleCreatePet(query: string) {
    const clientId = form.getValues("client_id");
    if (!clientId) {
      toast.error("Selecione ou cadastre o tutor antes do pet.");
      return;
    }
    const result = await createPetInline(query, clientId, "dog");
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setExtraPets((prev) =>
      prev.some((p) => p.id === result.id)
        ? prev
        : [
            ...prev,
            { id: result.id, name: result.name, client_id: clientId, species: "dog" },
          ],
    );
    form.setValue("pet_id", result.id, { shouldValidate: true });
    toast.success(`Pet "${result.name}" cadastrado · edite a espécie em /app/pets`);
  }

  function onSubmit(values: FormValues) {
    const service = servicesForArea.find((s) => s.id === values.service_id);
    if (!service) {
      toast.error("Selecione um serviço.");
      return;
    }
    // Appointments are fixed 30-min slots. The service is metadata for the work
    // performed in that slot; its duration drives pricing/reporting but does not
    // expand the time block. Tenants who need longer services book consecutive
    // slots manually.
    const startDate = new Date(values.starts_at);
    const endDate = new Date(startDate.getTime() + 30 * 60_000);

    const fd = new FormData();
    fd.set("calendar_id", activeCalendarId);
    fd.set("service_id", values.service_id);
    fd.set("client_id", values.client_id);
    fd.set("pet_id", values.pet_id);
    fd.set("starts_at", startDate.toISOString());
    fd.set("ends_at", endDate.toISOString());
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

  function handleAdvance(apptId: string, current: AppointmentStatus, appt: ApptSummary) {
    const target = nextStatus(current);
    if (!target) return;
    // Grooming-only intercept: the checked_in → in_progress step opens the
    // checklist dialog instead of advancing directly. saveChecklist on the
    // server will atomically save the row AND move status to in_progress.
    if (
      activeArea === "grooming" &&
      current === "checked_in" &&
      target === "in_progress"
    ) {
      setChecklist({
        apptId,
        title: `${appt.service_name ?? "Atendimento"} — ${appt.pet_name ?? appt.tutor_name ?? "Pet"}`,
        submitLabel: "Salvar e iniciar",
      });
      return;
    }
    // Veterinary intercept: opens prontuário at the same lifecycle moment.
    if (
      activeArea === "veterinary" &&
      current === "checked_in" &&
      target === "in_progress"
    ) {
      setRecord({
        apptId,
        title: `${appt.service_name ?? "Atendimento"} — ${appt.pet_name ?? appt.tutor_name ?? "Pet"}`,
        submitLabel: "Salvar e iniciar",
      });
      return;
    }
    startTransition(async () => {
      const result = await updateAppointmentStatus(apptId, target);
      if (result.ok) {
        toast.success("Status atualizado");
        router.refresh();
      } else {
        toast.error(result.error ?? "Erro ao atualizar status");
      }
    });
  }

  function openChecklistRead(appt: ApptSummary) {
    setChecklist({
      apptId: appt.id,
      title: `${appt.service_name ?? "Atendimento"} — ${appt.pet_name ?? appt.tutor_name ?? "Pet"}`,
      submitLabel: "Salvar",
    });
  }

  function openRecordRead(appt: ApptSummary) {
    setRecord({
      apptId: appt.id,
      title: `${appt.service_name ?? "Atendimento"} — ${appt.pet_name ?? appt.tutor_name ?? "Pet"}`,
      submitLabel: "Salvar",
    });
  }

  function handleUndo(apptId: string, current: AppointmentStatus) {
    const target = prevStatus(current);
    if (!target) return;
    startTransition(async () => {
      const result = await updateAppointmentStatus(apptId, target);
      if (result.ok) {
        toast.success("Status revertido");
        router.refresh();
      } else {
        toast.error(result.error ?? "Erro ao reverter status");
      }
    });
  }

  function handleNoShow(apptId: string) {
    if (!confirm("Marcar como não compareceu?")) return;
    startTransition(async () => {
      const result = await updateAppointmentStatus(apptId, "no_show");
      if (result.ok) {
        toast.success("Marcado como não compareceu");
        router.refresh();
      } else {
        toast.error(result.error ?? "Erro ao marcar");
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
                      </div>
                      {activeArea === "grooming" &&
                      (a.status === "in_progress" || a.status === "finished") ? (
                        <button
                          onClick={() => openChecklistRead(a)}
                          className="mt-2 inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[0.6875rem] font-medium text-zinc-700 transition hover:bg-zinc-50"
                        >
                          <ClipboardList className="size-3" />
                          Ver checklist
                        </button>
                      ) : null}
                      {activeArea === "veterinary" &&
                      (a.status === "in_progress" || a.status === "finished") ? (
                        <button
                          onClick={() => openRecordRead(a)}
                          className="mt-2 inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[0.6875rem] font-medium text-zinc-700 transition hover:bg-zinc-50"
                        >
                          <ClipboardList className="size-3" />
                          Ver prontuário
                        </button>
                      ) : null}
                      {(() => {
                        // wa.me link prefers the tutor's WhatsApp number, falls
                        // back to phone. Disabled when neither is on file.
                        const waUrl = buildWhatsappUrl(
                          a.tutor_whatsapp ?? a.tutor_phone,
                          buildConfirmationMessage({
                            tutorName: a.tutor_name,
                            petName: a.pet_name,
                            serviceName: a.service_name,
                            startIso: a.startIso,
                            petshopName,
                          }),
                        );
                        return waUrl ? (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[0.6875rem] font-medium text-emerald-800 transition hover:bg-emerald-100"
                          >
                            <MessageCircle className="size-3" />
                            WhatsApp confirmação
                          </a>
                        ) : null;
                      })()}
                      {isTerminal(a.status) ? null : (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {(() => {
                            const advanceLabel = forwardLabel(a.status);
                            return advanceLabel ? (
                              <button
                                onClick={() => handleAdvance(a.id, a.status, a)}
                                disabled={pending}
                                className="inline-flex items-center gap-1 rounded-md bg-zinc-950 px-2 py-1 text-[0.6875rem] font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60"
                              >
                                <ChevronAdvance className="size-3" />
                                {advanceLabel}
                              </button>
                            ) : null;
                          })()}
                          {prevStatus(a.status) ? (
                            <button
                              onClick={() => handleUndo(a.id, a.status)}
                              disabled={pending}
                              className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[0.6875rem] font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
                              aria-label="Voltar status"
                            >
                              <Undo2 className="size-3" />
                              Voltar
                            </button>
                          ) : null}
                          {a.status !== "finished" ? (
                            <button
                              onClick={() => handleNoShow(a.id)}
                              disabled={pending}
                              className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-white px-2 py-1 text-[0.6875rem] font-medium text-amber-800 transition hover:bg-amber-50 disabled:opacity-60"
                            >
                              <UserX className="size-3" />
                              Não veio
                            </button>
                          ) : null}
                          {a.status !== "finished" ? (
                            <button
                              onClick={() => handleCancel(a.id)}
                              disabled={pending}
                              className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-white px-2 py-1 text-[0.6875rem] font-medium text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
                            >
                              <Ban className="size-3" />
                              Cancelar
                            </button>
                          ) : null}
                        </div>
                      )}
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

          {servicesForArea.length === 0 ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              Nenhum serviço cadastrado para {AREA_LABEL[activeArea].toLowerCase()}.{" "}
              <Link href="/app/servicos" className="font-medium underline underline-offset-2">
                Cadastrar serviços
              </Link>
            </div>
          ) : (
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-4 sm:grid-cols-2"
          >
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="service_id">Serviço</Label>
              <Combobox
                id="service_id"
                options={servicesForArea.map((s) => ({
                  id: s.id,
                  label: s.name,
                  sublabel: `${s.duration_minutes} min · R$ ${(s.price_cents / 100).toFixed(2).replace(".", ",")}`,
                }))}
                value={form.watch("service_id") ?? ""}
                onChange={(id) => {
                  form.setValue("service_id", id, { shouldValidate: true });
                  // Reset selected slot — duration may have changed.
                  form.setValue("starts_at", "", { shouldValidate: false });
                }}
                placeholder="Escolha o serviço"
                emptyHint="Sem serviços cadastrados."
              />
              {form.formState.errors.service_id ? (
                <p className="text-xs text-rose-600">
                  {form.formState.errors.service_id.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="starts_at">Horário disponível</Label>
              <Combobox
                id="starts_at"
                options={availableSlots.map((slot) => {
                  const iso = slot.start.toISOString();
                  // Always render slots as 30-min anchors regardless of service
                  // duration. The engine already validated that the full service
                  // duration fits without overlap; the user picks a start anchor.
                  const anchorEnd = new Date(slot.start.getTime() + 30 * 60_000);
                  return {
                    id: iso,
                    label: `${formatHHmm(iso)} às ${formatHHmm(anchorEnd.toISOString())}`,
                  };
                })}
                value={form.watch("starts_at") ?? ""}
                onChange={(id) =>
                  form.setValue("starts_at", id, { shouldValidate: true })
                }
                disabled={!selectedService}
                placeholder={
                  selectedService
                    ? availableSlots.length > 0
                      ? "Escolha o horário"
                      : "Sem horário livre nesse dia"
                    : "Selecione o serviço primeiro"
                }
                emptyHint="Sem horários livres."
              />
              {form.formState.errors.starts_at ? (
                <p className="text-xs text-rose-600">
                  {form.formState.errors.starts_at.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="client_id">Tutor</Label>
              <Combobox
                id="client_id"
                options={mergedClients.map((c) => ({
                  id: c.id,
                  label: c.name,
                  sublabel: c.phone || undefined,
                }))}
                value={form.watch("client_id") ?? ""}
                onChange={(id) => {
                  form.setValue("client_id", id, { shouldValidate: true });
                  form.setValue("pet_id", "", { shouldValidate: false });
                }}
                onCreate={handleCreateClient}
                createLabel={(q) => `Cadastrar tutor "${q}"`}
                placeholder="Buscar ou cadastrar tutor"
                emptyHint="Digite o nome do tutor para buscar ou cadastrar."
              />
              {form.formState.errors.client_id ? (
                <p className="text-xs text-rose-600">
                  {form.formState.errors.client_id.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="pet_id">Pet</Label>
              <Combobox
                id="pet_id"
                options={petsForClient.map((p) => ({
                  id: p.id,
                  label: p.name,
                  sublabel: p.species,
                }))}
                value={form.watch("pet_id") ?? ""}
                onChange={(id) =>
                  form.setValue("pet_id", id, { shouldValidate: true })
                }
                onCreate={handleCreatePet}
                createLabel={(q) => `Cadastrar pet "${q}"`}
                disabled={!watchedClient}
                placeholder={watchedClient ? "Buscar ou cadastrar pet" : "Selecione o tutor primeiro"}
                emptyHint="Digite o nome do pet para buscar ou cadastrar."
              />
              {form.formState.errors.pet_id ? (
                <p className="text-xs text-rose-600">
                  {form.formState.errors.pet_id.message}
                </p>
              ) : null}
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
          )}
        </DialogContent>
      </Dialog>

      <ChecklistDialog
        appointmentId={checklist?.apptId ?? null}
        title={checklist?.title ?? ""}
        open={checklist !== null}
        onOpenChange={(o) => {
          if (!o) setChecklist(null);
        }}
        submitLabel={checklist?.submitLabel}
        onSaved={() => router.refresh()}
      />

      <RecordDialog
        appointmentId={record?.apptId ?? null}
        title={record?.title ?? ""}
        open={record !== null}
        onOpenChange={(o) => {
          if (!o) setRecord(null);
        }}
        submitLabel={record?.submitLabel}
        onSaved={() => router.refresh()}
      />
    </motion.div>
  );
}
