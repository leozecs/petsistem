"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DayPicker } from "react-day-picker";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Ban, CalendarClock, CheckCircle2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { StatusPill } from "@/components/shared/status-pill";
import { SectionHeading } from "@/components/app/section-heading";
import { cancelAppointment, saveAppointment } from "@/app/app/calendarios/actions";
import type { Database } from "@/lib/supabase/database.types";
import "react-day-picker/style.css";

type ServiceArea = Database["public"]["Enums"]["service_area"];
type CalendarRow = Database["public"]["Tables"]["calendars"]["Row"];
type ServiceRow = Database["public"]["Tables"]["services"]["Row"];

type SlotProp = {
  startIso: string;
  endIso: string;
  status: "free" | "occupied" | "outside_hours";
  appointment: {
    id: string;
    status: string;
    pet_name: string | null;
    service_name: string | null;
    professional_name: string | null;
    tutor_name: string | null;
  } | null;
};

type Props = {
  areas: ServiceArea[];
  activeArea: ServiceArea;
  calendars: CalendarRow[];
  activeCalendarId: string;
  activeDateIso: string;
  services: ServiceRow[];
  veterinarians: { id: string; name: string }[];
  employees: { id: string; name: string }[];
  clients: { id: string; name: string; phone: string }[];
  pets: { id: string; name: string; client_id: string; species: string }[];
  slots: SlotProp[];
};

const areaLabel = (a: ServiceArea) => (a === "grooming" ? "Banho e Tosa" : "Veterinária");

const formSchema = z.object({
  service_id: z.string().uuid("Serviço obrigatório"),
  starts_at: z.string().min(1, "Início obrigatório"),
  client_id: z.string().uuid().optional().or(z.literal("")),
  pet_id: z.string().uuid().optional().or(z.literal("")),
  veterinarian_id: z.string().uuid().optional().or(z.literal("")),
  employee_id: z.string().uuid().optional().or(z.literal("")),
  tutor_name: z.string().trim().optional(),
  tutor_phone: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});
type FormValues = z.infer<typeof formSchema>;

function statusLabel(status: string): string {
  switch (status) {
    case "pending": return "Pendente";
    case "confirmed": return "Confirmado";
    case "checked_in": return "Check-in";
    case "in_progress": return "Em atendimento";
    case "finished": return "Finalizado";
    case "cancelled": return "Cancelado";
    case "no_show": return "Não compareceu";
    default: return status;
  }
}

function statusTone(status: string): "success" | "warning" | "neutral" | "danger" {
  if (status === "in_progress" || status === "finished" || status === "confirmed") return "success";
  if (status === "pending" || status === "checked_in") return "warning";
  if (status === "cancelled" || status === "no_show") return "danger";
  return "neutral";
}

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

function formatIsoTime(iso: string) {
  return HHMM.format(new Date(iso));
}

function isoDateOnly(d: Date): string {
  // Day picked from DayPicker is a wall-clock Date in the user's browser TZ.
  // We treat the visible year/month/day as the intended petshop-TZ date.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function CalendariosView({
  areas,
  activeArea,
  calendars,
  activeCalendarId,
  activeDateIso,
  services,
  veterinarians,
  employees,
  clients,
  pets,
  slots,
}: Props) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSlotStart, setSelectedSlotStart] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const activeDate = useMemo(() => {
    const [y, m, d] = activeDateIso.split("-").map(Number);
    return new Date(y!, (m ?? 1) - 1, d ?? 1);
  }, [activeDateIso]);

  const servicesForArea = useMemo(() => services.filter((s) => s.area === activeArea), [services, activeArea]);

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
  const petsForClient = useMemo(
    () => (watchedClient ? pets.filter((p) => p.client_id === watchedClient) : []),
    [watchedClient, pets],
  );
  const selectedService = useMemo(
    () => servicesForArea.find((s) => s.id === watchedService) ?? null,
    [servicesForArea, watchedService],
  );

  function openCreate(slotStartIso: string) {
    setSelectedSlotStart(slotStartIso);
    form.reset({
      service_id: servicesForArea[0]?.id ?? "",
      starts_at: slotStartIso,
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

  function navigateTo(area: ServiceArea, date: Date) {
    const url = new URL(window.location.href);
    url.searchParams.set("area", area);
    url.searchParams.set("date", isoDateOnly(date));
    router.push(`${url.pathname}?${url.searchParams.toString()}`);
  }

  function onSubmit(values: FormValues) {
    if (!selectedSlotStart) return;
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

  return (
    <div>
      <SectionHeading
        title="Calendários"
        description="Mensal por área. Clique em um dia para ver e gerenciar os slots."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {areas.map((a) => {
          const isActive = a === activeArea;
          const href = `/app/calendarios?area=${a}&date=${activeDateIso}`;
          return (
            <Link
              key={a}
              href={href}
              className={
                "rounded-md px-4 py-2 text-sm font-medium transition " +
                (isActive
                  ? "bg-zinc-950 text-white hover:bg-zinc-800"
                  : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50")
              }
            >
              {areaLabel(a)}
            </Link>
          );
        })}
        {calendars.filter((c) => c.area === activeArea).length > 1 ? (
          <div className="ml-2 flex items-center gap-2 text-sm text-zinc-500">
            <CalendarClock className="size-4" />
            {calendars.filter((c) => c.area === activeArea).length} calendários
          </div>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Selecionar dia</CardTitle>
          </CardHeader>
          <CardContent>
            <DayPicker
              mode="single"
              selected={activeDate}
              onSelect={(day) => {
                if (day) navigateTo(activeArea, day);
              }}
              showOutsideDays
              classNames={{
                root: "rdp text-sm",
                day: "rdp-day rounded-md",
                today: "border border-blue-500",
                selected: "bg-zinc-950 text-white",
              }}
            />
          </CardContent>
        </Card>

        <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
          <CardHeader>
            <CardTitle className="text-base">
              {LONG_DATE.format(activeDate)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {slots.length === 0 ? (
              <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-6 text-sm text-zinc-500">
                Sem horário de funcionamento configurado para este dia. Cadastre <code>schedules</code> em Configurações.
              </div>
            ) : (
              <div className="grid gap-2">
                {slots.map((slot) => {
                  const isFree = slot.status === "free";
                  return (
                    <div
                      key={slot.startIso}
                      className={
                        "flex items-center justify-between gap-3 rounded-md border p-3 text-sm " +
                        (isFree
                          ? "border-zinc-200 bg-white hover:bg-zinc-50"
                          : "border-zinc-300 bg-zinc-50")
                      }
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-medium text-zinc-700">
                          {formatIsoTime(slot.startIso)} – {formatIsoTime(slot.endIso)}
                        </span>
                        {slot.appointment ? (
                          <div className="flex flex-col">
                            <span className="font-medium text-zinc-950">
                              {slot.appointment.service_name ?? "Serviço"} ·{" "}
                              {slot.appointment.pet_name ?? slot.appointment.tutor_name ?? "—"}
                            </span>
                            <span className="text-xs text-zinc-500">
                              {slot.appointment.professional_name ?? "Sem profissional"}
                            </span>
                          </div>
                        ) : (
                          <span className="text-zinc-500">Horário disponível</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {slot.appointment ? (
                          <>
                            <StatusPill tone={statusTone(slot.appointment.status)}>
                              {statusLabel(slot.appointment.status)}
                            </StatusPill>
                            {slot.appointment.status !== "cancelled" &&
                            slot.appointment.status !== "finished" &&
                            slot.appointment.status !== "no_show" ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-md border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
                                onClick={() => handleCancel(slot.appointment!.id)}
                                disabled={pending}
                              >
                                <Ban className="size-4" />
                                Cancelar
                              </Button>
                            ) : (
                              <span className="text-xs text-zinc-500">
                                <CheckCircle2 className="mr-1 inline size-3" />
                                fechado
                              </span>
                            )}
                          </>
                        ) : (
                          <Button
                            size="sm"
                            className="rounded-md bg-zinc-950 text-white hover:bg-zinc-800"
                            onClick={() => openCreate(slot.startIso)}
                            disabled={pending || servicesForArea.length === 0}
                          >
                            <Plus className="size-4" />
                            Agendar
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-xl border-zinc-200 bg-white sm:max-w-[620px]">
          <DialogHeader>
            <DialogTitle>Novo agendamento</DialogTitle>
            <DialogDescription>
              {selectedSlotStart
                ? `Início: ${LONG_DATE.format(new Date(selectedSlotStart))} às ${formatIsoTime(selectedSlotStart)}.`
                : "Selecione um horário."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
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
                      {s.name} · {s.duration_minutes} min · R$ {(s.price_cents / 100).toFixed(2).replace(".", ",")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.service_id ? (
                <p className="text-xs text-rose-600">{form.formState.errors.service_id.message}</p>
              ) : null}
              {selectedService ? (
                <p className="text-xs text-zinc-500">
                  Janela: {selectedSlotStart ? formatIsoTime(selectedSlotStart) : "—"} →{" "}
                  {selectedSlotStart
                    ? formatIsoTime(
                        new Date(
                          new Date(selectedSlotStart).getTime() + selectedService.duration_minutes * 60_000,
                        ).toISOString(),
                      )
                    : "—"}
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
                  <SelectValue placeholder="Selecione" />
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
                  <SelectValue placeholder={watchedClient ? "Selecione" : "Selecione o tutor"} />
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
              <Label htmlFor="tutor_name">Tutor avulso (sem cadastro)</Label>
              <Input id="tutor_name" placeholder="Nome do tutor" {...form.register("tutor_name")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tutor_phone">Telefone avulso</Label>
              <Input id="tutor_phone" placeholder="(19) 99999-0000" {...form.register("tutor_phone")} />
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
                {pending ? "Salvando…" : "Criar agendamento"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
