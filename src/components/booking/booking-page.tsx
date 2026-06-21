"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { addDays, format, isSameDay, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  CalendarCheck,
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
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { PetsistemLogo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import {
  createPublicBooking,
  getPublicSlots,
} from "@/app/loja/[slug]/actions";

// O subdomínio (slug.petsistem.com.br) é reescrito pra /loja/<slug>, então /login
// nele resolveria pra /loja/<slug>/login (404). Apontamos o link absoluto pro
// domínio raiz onde a página de login realmente vive. Variável publica via
// NEXT_PUBLIC_ROOT_DOMAIN — fallback pra petsistem.com.br pra browsers velhos.
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
  primaryColor: string;
  services: BookingService[];
  address: string | null;
  phone: string | null;
};

const SPECIES_OPTIONS = ["Cachorro", "Gato", "Pássaro", "Roedor", "Réptil", "Outro"];

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function bookableDays(): Date[] {
  // Próximos 60 dias a partir de amanhã. Domingo segue habilitado caso o
  // schedule explícito permita; o filtro real ocorre no servidor via slots.
  return Array.from({ length: 60 }, (_, i) => addDays(startOfDay(new Date()), i + 1));
}

export function BookingPage({
  slug,
  storeName,
  storeStatus,
  primaryColor,
  services,
  address,
  phone,
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
  const selectedService = servicesForArea.find((s) => s.id === serviceId);

  // Reset slot quando muda data/serviço.
  useEffect(() => {
    setSelectedSlot("");
  }, [selectedDate, serviceId, activeArea]);

  // Buscar slots quando service+data selecionados.
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

  // Reset service ao trocar de aba.
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
      if (result.ok) {
        setSubmitted(true);
      } else {
        toast.error(result.error || "Erro ao agendar.");
      }
    });
  }

  if (storeStatus !== "active") {
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-zinc-50 px-4">
        <div className="max-w-md rounded-xl border border-amber-200 bg-amber-50 p-6 text-center text-amber-900">
          <h1 className="text-lg font-semibold">{storeName}</h1>
          <p className="mt-2 text-sm">
            Esta loja não está aceitando agendamentos no momento.
          </p>
        </div>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-zinc-50 px-4">
        <Card className="max-w-md rounded-xl border-emerald-200 bg-white shadow-lg shadow-emerald-900/5">
          <CardContent className="space-y-3 p-8 text-center">
            <div
              className="mx-auto flex size-14 items-center justify-center rounded-full"
              style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
            >
              <CheckCircle2 className="size-8" />
            </div>
            <h1 className="text-2xl font-semibold text-zinc-950">
              Solicitação enviada!
            </h1>
            <p className="text-sm leading-6 text-zinc-600">
              Recebemos o pedido. A equipe da <strong>{storeName}</strong> vai
              confirmar o agendamento e entrar em contato pelo WhatsApp em
              instantes.
            </p>
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
              className="rounded-md"
              style={{ backgroundColor: primaryColor, color: "white" }}
            >
              Fazer outro agendamento
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-zinc-50 text-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-28 items-center overflow-hidden sm:w-32">
              <PetsistemLogo tone="dark" className="w-28 sm:w-32" />
            </div>
            <span
              className="hidden h-6 w-px sm:block"
              style={{ backgroundColor: "#e4e4e7" }}
            />
            <div className="hidden sm:block">
              <p
                className="text-sm font-semibold"
                style={{ color: primaryColor }}
              >
                {storeName}
              </p>
              <p className="text-xs text-zinc-500">Agendamento online</p>
            </div>
          </div>
          <a
            href={LOGIN_URL}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "rounded-md border-zinc-300 bg-white",
            )}
          >
            <LogIn className="size-4" />
            Entrar
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-8 text-center sm:mb-10">
          <p
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: primaryColor }}
          >
            {storeName}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 sm:text-5xl">
            Agende o cuidado do seu pet
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-zinc-600 sm:text-base">
            Em poucos toques. Escolha o serviço, o dia e o horário disponível —
            confirmamos pelo WhatsApp.
          </p>
        </div>

        <Card className="rounded-2xl border-zinc-200 bg-white shadow-md shadow-zinc-900/5">
          <CardContent className="space-y-6 p-5 sm:p-7">
            <Tabs
              value={activeArea}
              onValueChange={(v) => setActiveArea(v as "grooming" | "veterinary")}
            >
              <TabsList className="grid h-11 w-full grid-cols-2 rounded-lg bg-zinc-100 p-1">
                <TabsTrigger value="grooming" className="rounded-md">
                  <Scissors className="size-4" />
                  Banho e Tosa
                </TabsTrigger>
                <TabsTrigger value="veterinary" className="rounded-md">
                  <HeartPulse className="size-4" />
                  Veterinário
                </TabsTrigger>
              </TabsList>

              <TabsContent value="grooming" className="mt-6" />
              <TabsContent value="veterinary" className="mt-6" />
            </Tabs>

            <form onSubmit={onSubmit} className="space-y-6">
              {/* Tutor + Pet */}
              <fieldset className="space-y-4">
                <legend className="text-sm font-semibold text-zinc-950">
                  Tutor e pet
                </legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="tutor">Nome do tutor</Label>
                    <Input
                      id="tutor"
                      value={tutorName}
                      onChange={(e) => setTutorName(e.target.value)}
                      placeholder="Nome completo"
                      required
                      autoComplete="name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp">WhatsApp</Label>
                    <Input
                      id="whatsapp"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="(11) 99999-9999"
                      required
                      autoComplete="tel"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pet">Nome do pet</Label>
                    <Input
                      id="pet"
                      value={petName}
                      onChange={(e) => setPetName(e.target.value)}
                      placeholder="Ex: Luna"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="species">Espécie</Label>
                      <Select value={species} onValueChange={(v) => setSpecies(String(v ?? "Cachorro"))}>
                        <SelectTrigger id="species" className="rounded-md">
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
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="breed">Raça</Label>
                      <Input
                        id="breed"
                        value={breed}
                        onChange={(e) => setBreed(e.target.value)}
                        placeholder="Opcional"
                      />
                    </div>
                  </div>
                </div>
              </fieldset>

              {/* Serviço */}
              <fieldset className="space-y-4">
                <legend className="text-sm font-semibold text-zinc-950">Serviço</legend>
                {servicesForArea.length === 0 ? (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    Nenhum serviço disponível nessa área no momento.
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Combobox
                      options={servicesForArea.map((s) => ({
                        id: s.id,
                        label: s.name,
                        sublabel: `${s.durationMinutes} min · ${formatBRL(s.priceCents)}`,
                      }))}
                      value={serviceId}
                      onChange={setServiceId}
                      placeholder="Escolha o serviço"
                      emptyHint="Nenhum serviço disponível."
                    />
                    {selectedService?.description ? (
                      <p className="text-xs text-zinc-500">
                        {selectedService.description}
                      </p>
                    ) : null}
                  </div>
                )}
              </fieldset>

              {/* Data + Hora */}
              <fieldset className="grid gap-6 lg:grid-cols-[1fr_320px]">
                <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <CalendarCheck
                      className="size-4"
                      style={{ color: primaryColor }}
                    />
                    <p className="text-sm font-semibold">Escolha o dia</p>
                  </div>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    locale={ptBR}
                    disabled={(day) =>
                      !bookableDays().some((avail) => isSameDay(avail, day))
                    }
                    className="mx-auto rounded-lg bg-white"
                  />
                </div>

                <div className="flex flex-col gap-4">
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Clock className="size-4" style={{ color: primaryColor }} />
                      <p className="text-sm font-semibold">Horário</p>
                    </div>
                    {!selectedDate ? (
                      <p className="text-xs text-zinc-500">
                        Escolha um dia primeiro.
                      </p>
                    ) : !serviceId ? (
                      <p className="text-xs text-zinc-500">
                        Selecione o serviço para ver os horários disponíveis.
                      </p>
                    ) : slotsLoading ? (
                      <p className="flex items-center gap-2 text-xs text-zinc-500">
                        <Loader2 className="size-3 animate-spin" />
                        Buscando horários disponíveis…
                      </p>
                    ) : slots.length === 0 ? (
                      <p className="text-xs text-zinc-500">
                        Nenhum horário disponível para esse dia. Tente outro.
                      </p>
                    ) : (
                      <Combobox
                        options={slots.map((iso) => {
                          const hhmm = iso.split("T")[1] ?? iso;
                          const next = (() => {
                            const [h, m] = hhmm.split(":").map(Number);
                            const total = (h ?? 0) * 60 + (m ?? 0) + 30;
                            const nh = String(Math.floor(total / 60)).padStart(2, "0");
                            const nm = String(total % 60).padStart(2, "0");
                            return `${nh}:${nm}`;
                          })();
                          return { id: iso, label: `${hhmm} às ${next}` };
                        })}
                        value={selectedSlot}
                        onChange={setSelectedSlot}
                        placeholder="Escolha o horário"
                      />
                    )}
                  </div>

                  <div className="rounded-xl border border-zinc-200 bg-white p-4">
                    <div className="flex items-center gap-2">
                      <PawPrint className="size-4" style={{ color: primaryColor }} />
                      <p className="text-sm font-semibold">Resumo</p>
                    </div>
                    <div className="mt-3 space-y-2 text-sm">
                      <div className="flex justify-between gap-3">
                        <span className="text-zinc-500">Dia</span>
                        <strong className="text-right">
                          {selectedDate
                            ? format(selectedDate, "dd/MM/yyyy")
                            : "—"}
                        </strong>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-zinc-500">Horário</span>
                        <strong>
                          {selectedSlot ? selectedSlot.split("T")[1] : "—"}
                        </strong>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-zinc-500">Serviço</span>
                        <strong className="text-right">
                          {selectedService?.name ?? "—"}
                        </strong>
                      </div>
                      {selectedService ? (
                        <div className="flex justify-between gap-3 border-t border-zinc-100 pt-2">
                          <span className="text-zinc-500">Valor</span>
                          <strong style={{ color: primaryColor }}>
                            {formatBRL(selectedService.priceCents)}
                          </strong>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </fieldset>

              {/* Observações */}
              <fieldset className="space-y-2">
                <Label htmlFor="notes">
                  {activeArea === "grooming"
                    ? "Observações para a equipe"
                    : "Motivo da consulta"}
                </Label>
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
                />
              </fieldset>

              <Button
                type="submit"
                disabled={
                  pending ||
                  !selectedSlot ||
                  !serviceId ||
                  !tutorName ||
                  !whatsapp ||
                  !petName
                }
                className="h-12 w-full rounded-md text-white"
                style={{ backgroundColor: primaryColor }}
              >
                {pending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Enviando…
                  </>
                ) : (
                  <>
                    <Send className="size-4" />
                    Confirmar agendamento
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Info loja */}
        {address || phone ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {address ? (
              <div className="flex items-start gap-2 rounded-lg border border-zinc-200 bg-white p-3 text-sm text-zinc-700">
                <MapPin
                  className="mt-0.5 size-4 shrink-0"
                  style={{ color: primaryColor }}
                />
                <span className="whitespace-pre-wrap">{address}</span>
              </div>
            ) : null}
            {phone ? (
              <a
                href={`tel:${phone}`}
                className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white p-3 text-sm text-zinc-700 transition hover:bg-zinc-50"
              >
                <Phone className="size-4" style={{ color: primaryColor }} />
                {phone}
              </a>
            ) : null}
          </div>
        ) : null}

        {/* Footer */}
        <footer className="mt-10 flex flex-col items-center gap-2 text-center text-xs text-zinc-500">
          <p>
            É atendente ou faz parte da equipe?{" "}
            <a
              href={LOGIN_URL}
              className="font-semibold text-zinc-700 underline underline-offset-4 hover:text-zinc-950"
            >
              Logue aqui para acessar o sistema
            </a>
          </p>
          <p className="flex items-center gap-1">
            Powered by
            <span className="font-semibold text-zinc-700">PETSISTEM</span>
          </p>
        </footer>
      </section>
    </main>
  );
}
