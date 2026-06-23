"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { addDays, format, isSameDay, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  HeartPulse,
  Loader2,
  LogIn,
  MapPin,
  PawPrint,
  Phone,
  Scissors,
  Send,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import { isPetshopAcceptingBookings } from "@/lib/petshop-status";
import { cn } from "@/lib/utils";
import {
  createPublicBooking,
  getPublicSlots,
} from "@/app/loja/[slug]/actions";

const ROOT_DOMAIN =
  process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "petsistem.com.br";
const LOGIN_URL = `https://${ROOT_DOMAIN}/login`;

export type BookingService = {
  id: string;
  name: string;
  area: "grooming" | "veterinary";
  durationMinutes: number;
  priceCents: number;
  description: string | null;
};

type Props = {
  slug: string;
  storeName: string;
  storeStatus: string;
  services: BookingService[];
  address: string | null;
  phone: string | null;
  logoUrl: string | null;
};

const SPECIES_OPTIONS = ["Cachorro", "Gato", "Pássaro", "Roedor", "Réptil", "Outro"];

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function bookableDays(): Date[] {
  return Array.from({ length: 60 }, (_, i) => addDays(startOfDay(new Date()), i + 1));
}

function slotEndHHmm(iso: string): string {
  const hhmm = iso.split("T")[1] ?? "";
  const [h, m] = hhmm.split(":").map(Number);
  const total = (h ?? 0) * 60 + (m ?? 0) + 30;
  const nh = String(Math.floor(total / 60)).padStart(2, "0");
  const nm = String(total % 60).padStart(2, "0");
  return `${nh}:${nm}`;
}

export function BookingPage({
  slug,
  storeName,
  storeStatus,
  services,
  address,
  phone,
  logoUrl,
}: Props) {
  const [activeArea, setActiveArea] = useState<"grooming" | "veterinary">(
    services.find((s) => s.area === "grooming") ? "grooming" : "veterinary",
  );
  const [serviceId, setServiceId] = useState<string>("");
  const [tutorName, setTutorName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [petName, setPetName] = useState("");
  const [species, setSpecies] = useState("Cachorro");
  const [breed, setBreed] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [pending, startTransition] = useTransition();

  const servicesForArea = useMemo(
    () => services.filter((s) => s.area === activeArea),
    [services, activeArea],
  );
  const hasGrooming = services.some((s) => s.area === "grooming");
  const hasVet = services.some((s) => s.area === "veterinary");
  const selectedService = servicesForArea.find((s) => s.id === serviceId);

  useEffect(() => {
    setSelectedSlot("");
  }, [selectedDate, serviceId, activeArea]);

  useEffect(() => {
    if (!selectedDate || !serviceId) {
      setSlots([]);
      return;
    }
    let cancelled = false;
    setSlotsLoading(true);
    const dateIso = format(selectedDate, "yyyy-MM-dd");
    void getPublicSlots({
      slug,
      area: activeArea,
      service_id: serviceId,
      date: dateIso,
    }).then((res) => {
      if (cancelled) return;
      if (res.ok) setSlots(res.slots);
      else setSlots([]);
      setSlotsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [slug, activeArea, serviceId, selectedDate]);

  useEffect(() => {
    setServiceId(servicesForArea[0]?.id ?? "");
  }, [activeArea, servicesForArea]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedService || !selectedSlot) {
      toast.error("Escolha o serviço, o dia e o horário.");
      return;
    }
    const fd = new FormData();
    fd.set("slug", slug);
    fd.set("area", activeArea);
    fd.set("service_id", selectedService.id);
    fd.set("tutor_name", tutorName);
    fd.set("whatsapp", whatsapp);
    fd.set("pet_name", petName);
    fd.set("species", species);
    fd.set("breed", breed);
    fd.set("starts_at", selectedSlot);
    fd.set("notes", notes);

    startTransition(async () => {
      const result = await createPublicBooking(fd);
      if (result.ok) setSubmitted(true);
      else toast.error(result.error || "Erro ao agendar.");
    });
  }

  // ---- ESTADOS TERMINAIS --------------------------------------------------

  if (!isPetshopAcceptingBookings(storeStatus)) {
    return (
      <main
        className="grid min-h-[100dvh] place-items-center bg-[#f7f5ef] px-5"
        style={{ fontFamily: "var(--font-hanken), ui-sans-serif, system-ui" }}
      >
        <div className="max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-7 text-center text-amber-900">
          <PawPrint className="mx-auto size-9 text-amber-600" />
          <h1
            className="mt-4 text-2xl font-medium tracking-tight"
            style={{ fontFamily: "var(--font-bricolage)" }}
          >
            {storeName}
          </h1>
          <p className="mt-2 text-sm leading-6">
            Esta loja não está aceitando agendamentos no momento. Tente em breve
            ou entre em contato direto com o petshop.
          </p>
        </div>
      </main>
    );
  }

  if (submitted) {
    const dateLabel = selectedDate
      ? format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })
      : "";
    const timeLabel = selectedSlot ? selectedSlot.split("T")[1] : "";
    return (
      <main
        className="grid min-h-[100dvh] place-items-center bg-[#f7f5ef] px-5 py-10"
        style={{ fontFamily: "var(--font-hanken), ui-sans-serif, system-ui" }}
      >
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-emerald-200 bg-white p-7 text-center shadow-sm">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-700 text-white">
              <CheckCircle2 className="size-7" strokeWidth={2.5} />
            </div>
            <h1
              className="mt-5 text-[1.85rem] font-medium leading-[1.1] tracking-tight text-zinc-950"
              style={{ fontFamily: "var(--font-bricolage)" }}
            >
              Solicitação enviada!
            </h1>
            <p className="mt-3 text-sm leading-6 text-zinc-700">
              A equipe da <strong className="text-zinc-950">{storeName}</strong>{" "}
              vai confirmar no WhatsApp em instantes.
            </p>
            {dateLabel && timeLabel ? (
              <div className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-left">
                <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                  Você pediu
                </p>
                <p className="mt-1 text-sm font-medium text-zinc-900 capitalize">
                  {dateLabel}, às {timeLabel}
                </p>
                {selectedService ? (
                  <p className="mt-0.5 text-xs text-zinc-600">
                    {selectedService.name} · {formatBRL(selectedService.priceCents)}
                  </p>
                ) : null}
              </div>
            ) : null}
            <Button
              type="button"
              onClick={() => {
                setSubmitted(false);
                setSelectedDate(undefined);
                setSelectedSlot("");
                setPetName("");
                setBreed("");
                setNotes("");
              }}
              className="mt-6 h-12 w-full rounded-lg bg-zinc-950 text-base text-white hover:bg-zinc-800"
            >
              Fazer outro agendamento
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // ---- TELA PRINCIPAL -----------------------------------------------------

  const canSubmit =
    !pending && selectedSlot && serviceId && tutorName && whatsapp && petName;

  return (
    <main
      className="min-h-[100dvh] bg-[#f7f5ef] pb-32 text-zinc-950 sm:pb-12"
      style={{ fontFamily: "var(--font-hanken), ui-sans-serif, system-ui" }}
    >
      {/* HEADER STICKY */}
      <header className="sticky top-0 z-30 border-b border-zinc-200/70 bg-[#f7f5ef]/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            {logoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={logoUrl}
                alt={`Logo ${storeName}`}
                className="size-9 shrink-0 rounded-lg object-cover"
              />
            ) : (
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-700 text-white">
                <PawPrint className="size-5" strokeWidth={2} />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold text-zinc-950">
                {storeName}
              </p>
              <p className="text-[11px] text-zinc-500">Agendamento online</p>
            </div>
          </div>
          <a
            href={LOGIN_URL}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-9 rounded-full border-zinc-300 bg-white px-3 text-[13px] font-medium",
            )}
          >
            <LogIn className="size-3.5" />
            Entrar
          </a>
        </div>
      </header>

      {/* HERO */}
      <section className="mx-auto max-w-3xl px-5 pt-10 sm:px-6 sm:pt-14">
        <p
          className="inline-flex items-center gap-2 rounded-full border border-emerald-800/15 bg-emerald-800/[0.06] px-3 py-1 text-[11px] font-medium text-emerald-900"
        >
          <span className="size-1.5 rounded-full bg-emerald-800" />
          {storeName}
        </p>
        <h1
          className="mt-5 text-[2.25rem] font-medium leading-[1.04] tracking-[-0.025em] text-zinc-950 sm:text-[3.25rem]"
          style={{
            fontFamily: "var(--font-bricolage)",
            fontVariationSettings: "'wdth' 88",
          }}
        >
          Agende um horário para{" "}
          <span
            className="italic text-emerald-800"
            style={{ fontVariationSettings: "'wdth' 78" }}
          >
            seu pet.
          </span>
        </h1>
        <p className="mt-4 max-w-xl text-[15.5px] leading-6 text-zinc-700">
          Escolha o serviço, o dia e o horário disponível. A equipe confirma
          pelo WhatsApp em instantes.
        </p>
      </section>

      {/* FORM */}
      <form
        onSubmit={onSubmit}
        className="mx-auto max-w-3xl space-y-6 px-5 py-8 sm:px-6 sm:py-10"
      >
        {/* TIPO DE ATENDIMENTO (só aparece se loja tem as duas areas) */}
        {hasGrooming && hasVet ? (
          <section>
            <SectionLabel n="1" title="Tipo de atendimento" />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <AreaButton
                icon={Scissors}
                label="Banho e Tosa"
                active={activeArea === "grooming"}
                onClick={() => setActiveArea("grooming")}
              />
              <AreaButton
                icon={HeartPulse}
                label="Veterinário"
                active={activeArea === "veterinary"}
                onClick={() => setActiveArea("veterinary")}
              />
            </div>
          </section>
        ) : null}

        {/* SERVIÇO */}
        <section>
          <SectionLabel
            n={hasGrooming && hasVet ? "2" : "1"}
            title="Escolha o serviço"
          />
          {servicesForArea.length === 0 ? (
            <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Nenhum serviço disponível nessa área no momento.
            </p>
          ) : (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {servicesForArea.map((s) => {
                const active = serviceId === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setServiceId(s.id)}
                    className={cn(
                      "group flex flex-col rounded-xl border bg-white p-4 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30",
                      active
                        ? "border-emerald-700 ring-2 ring-emerald-700/15"
                        : "border-zinc-200 hover:border-zinc-400",
                    )}
                    aria-pressed={active}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[15px] font-semibold text-zinc-950">
                        {s.name}
                      </p>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[12px] font-semibold",
                          active
                            ? "bg-emerald-700 text-white"
                            : "bg-zinc-100 text-zinc-700",
                        )}
                      >
                        {formatBRL(s.priceCents)}
                      </span>
                    </div>
                    <p className="mt-1 text-[12.5px] text-zinc-500">
                      {s.durationMinutes} min
                    </p>
                    {s.description ? (
                      <p className="mt-2 line-clamp-2 text-[12.5px] leading-5 text-zinc-600">
                        {s.description}
                      </p>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* DATA + HORA */}
        <section>
          <SectionLabel
            n={hasGrooming && hasVet ? "3" : "2"}
            title="Dia e horário"
          />
          <div className="mt-3 grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="rounded-xl border border-zinc-200 bg-white p-3 sm:p-4">
              <div className="mb-2 flex items-center gap-2 px-1">
                <CalendarDays className="size-4 text-emerald-700" />
                <p className="text-[13px] font-semibold text-zinc-800">
                  Dia
                </p>
              </div>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                locale={ptBR}
                disabled={(day) =>
                  !bookableDays().some((avail) => isSameDay(avail, day))
                }
                className="mx-auto"
              />
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-4">
              <div className="mb-3 flex items-center gap-2">
                <Clock className="size-4 text-emerald-700" />
                <p className="text-[13px] font-semibold text-zinc-800">
                  Horário
                </p>
              </div>
              {!selectedDate ? (
                <p className="text-[13px] text-zinc-500">
                  Escolha um dia primeiro pra ver os horários livres.
                </p>
              ) : !serviceId ? (
                <p className="text-[13px] text-zinc-500">
                  Selecione o serviço acima.
                </p>
              ) : slotsLoading ? (
                <p className="flex items-center gap-2 text-[13px] text-zinc-500">
                  <Loader2 className="size-3.5 animate-spin" />
                  Buscando horários…
                </p>
              ) : slots.length === 0 ? (
                <p className="text-[13px] text-zinc-500">
                  Nenhum horário livre nesse dia. Tente outro.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-3">
                  {slots.map((iso) => {
                    const hhmm = iso.split("T")[1] ?? iso;
                    const active = selectedSlot === iso;
                    return (
                      <button
                        key={iso}
                        type="button"
                        onClick={() => setSelectedSlot(iso)}
                        title={`${hhmm} às ${slotEndHHmm(iso)}`}
                        aria-pressed={active}
                        className={cn(
                          "h-11 rounded-md border text-[13.5px] font-medium tabular-nums transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30",
                          active
                            ? "border-emerald-700 bg-emerald-700 text-white"
                            : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-400",
                        )}
                      >
                        {hhmm}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* TUTOR + PET */}
        <section>
          <SectionLabel
            n={hasGrooming && hasVet ? "4" : "3"}
            title="Quem é você e o pet"
          />
          <div className="mt-3 grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Seu nome" id="tutor">
                <Input
                  id="tutor"
                  value={tutorName}
                  onChange={(e) => setTutorName(e.target.value)}
                  placeholder="Nome completo"
                  required
                  autoComplete="name"
                  className="h-12 rounded-lg border-zinc-300 px-3.5 text-[15px] focus-visible:border-emerald-700 focus-visible:ring-emerald-700/15"
                />
              </Field>
              <Field label="WhatsApp" id="whatsapp">
                <Input
                  id="whatsapp"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="(11) 99999-8888"
                  inputMode="tel"
                  required
                  autoComplete="tel"
                  className="h-12 rounded-lg border-zinc-300 px-3.5 text-[15px] focus-visible:border-emerald-700 focus-visible:ring-emerald-700/15"
                />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_140px_1fr]">
              <Field label="Nome do pet" id="pet">
                <Input
                  id="pet"
                  value={petName}
                  onChange={(e) => setPetName(e.target.value)}
                  placeholder="Ex: Mel"
                  required
                  className="h-12 rounded-lg border-zinc-300 px-3.5 text-[15px] focus-visible:border-emerald-700 focus-visible:ring-emerald-700/15"
                />
              </Field>
              <Field label="Espécie" id="species">
                <Select
                  value={species}
                  onValueChange={(v) => setSpecies(String(v ?? "Cachorro"))}
                >
                  <SelectTrigger
                    id="species"
                    className="h-12 rounded-lg border-zinc-300 text-[15px] focus:ring-emerald-700/15"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SPECIES_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Raça" id="breed" optional>
                <Input
                  id="breed"
                  value={breed}
                  onChange={(e) => setBreed(e.target.value)}
                  placeholder="Opcional"
                  className="h-12 rounded-lg border-zinc-300 px-3.5 text-[15px] focus-visible:border-emerald-700 focus-visible:ring-emerald-700/15"
                />
              </Field>
            </div>
            <Field
              label={
                activeArea === "grooming"
                  ? "Observações pra equipe"
                  : "Motivo da consulta"
              }
              id="notes"
              optional
            >
              <Textarea
                id="notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={
                  activeArea === "grooming"
                    ? "Alergias, comportamento, preferências de tosa…"
                    : "Sintomas, retorno, vacina ou procedimento necessário…"
                }
                className="rounded-lg border-zinc-300 px-3.5 py-2.5 text-[15px] focus-visible:border-emerald-700 focus-visible:ring-emerald-700/15"
              />
            </Field>
          </div>
        </section>

        {/* SUBMIT DESKTOP */}
        <div className="hidden sm:block">
          <Button
            type="submit"
            disabled={!canSubmit}
            className="h-13 w-full rounded-lg bg-emerald-800 text-base font-semibold text-[#f7f5ef] shadow-sm hover:bg-emerald-900 disabled:opacity-60"
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Enviando solicitação…
              </>
            ) : (
              <>
                <Send className="size-4" />
                Confirmar agendamento
              </>
            )}
          </Button>
          {!canSubmit && !pending ? (
            <p className="mt-2 text-center text-xs text-zinc-500">
              Preencha serviço, dia, horário, tutor, WhatsApp e pet pra
              continuar.
            </p>
          ) : null}
        </div>

        {/* INFO LOJA */}
        {address || phone ? (
          <div className="grid gap-2 pt-2 sm:grid-cols-2">
            {address ? (
              <div className="flex items-start gap-2.5 rounded-lg border border-zinc-200 bg-white p-3.5 text-[13.5px] text-zinc-700">
                <MapPin className="mt-0.5 size-4 shrink-0 text-emerald-700" />
                <span className="whitespace-pre-wrap">{address}</span>
              </div>
            ) : null}
            {phone ? (
              <a
                href={`tel:${phone}`}
                className="flex items-center gap-2.5 rounded-lg border border-zinc-200 bg-white p-3.5 text-[13.5px] text-zinc-700 transition hover:bg-zinc-50"
              >
                <Phone className="size-4 shrink-0 text-emerald-700" />
                {phone}
                <ArrowUpRight className="ml-auto size-3.5 text-zinc-400" />
              </a>
            ) : null}
          </div>
        ) : null}

        <footer className="flex flex-col items-center gap-2 pt-6 text-center text-xs text-zinc-500">
          <p>
            É da equipe?{" "}
            <a
              href={LOGIN_URL}
              className="font-semibold text-zinc-700 underline underline-offset-4 hover:text-zinc-950"
            >
              Entrar no painel
            </a>
          </p>
          <p className="flex items-center gap-1.5">
            Powered by{" "}
            <span
              className="font-semibold tracking-tight text-zinc-700"
              style={{ fontFamily: "var(--font-bricolage)" }}
            >
              PETSISTEM
            </span>
          </p>
        </footer>

        {/* STICKY MOBILE CTA */}
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-[#f7f5ef]/95 px-4 py-3 backdrop-blur sm:hidden">
          {selectedSlot && selectedService && selectedDate ? (
            <div className="mb-2 flex items-center justify-between text-[12.5px]">
              <div className="min-w-0">
                <p className="truncate font-medium text-zinc-900">
                  {format(selectedDate, "dd/MM")} às {selectedSlot.split("T")[1]}
                </p>
                <p className="truncate text-[11.5px] text-zinc-500">
                  {selectedService.name}
                </p>
              </div>
              <p className="ml-3 shrink-0 font-mono text-sm font-semibold tabular-nums text-emerald-800">
                {formatBRL(selectedService.priceCents)}
              </p>
            </div>
          ) : null}
          <Button
            type="submit"
            disabled={!canSubmit}
            className="h-12 w-full rounded-lg bg-emerald-800 text-[15px] font-semibold text-[#f7f5ef] shadow-sm hover:bg-emerald-900 disabled:opacity-60"
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Enviando…
              </>
            ) : (
              "Confirmar agendamento"
            )}
          </Button>
        </div>
      </form>
    </main>
  );
}

function SectionLabel({ n, title }: { n: string; title: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-6 items-center justify-center rounded-full bg-emerald-800 text-[12px] font-semibold text-white tabular-nums">
        {n}
      </span>
      <h2
        className="text-[1.05rem] font-medium tracking-tight text-zinc-950"
        style={{ fontFamily: "var(--font-bricolage)" }}
      >
        {title}
      </h2>
    </div>
  );
}

function Field({
  label,
  id,
  optional,
  children,
}: {
  label: string;
  id: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="flex items-baseline gap-2 text-[13px] font-medium text-zinc-800">
        {label}
        {optional ? (
          <span className="text-[11px] font-normal text-zinc-400">opcional</span>
        ) : null}
      </Label>
      {children}
    </div>
  );
}

function AreaButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex h-14 items-center justify-center gap-2.5 rounded-xl border text-[14px] font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/30",
        active
          ? "border-emerald-700 bg-emerald-700 text-white"
          : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400",
      )}
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}
