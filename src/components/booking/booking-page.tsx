"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { addDays, format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarCheck, HeartPulse, LogIn, PawPrint, Scissors } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { tenant } from "@/lib/data/demo";
import { cn } from "@/lib/utils";

const groomingServices = ["Banho", "Tosa", "Banho + Tosa", "Hidratação", "Corte de Unhas", "Escovação"];
const veterinaryServices = ["Consulta", "Retorno", "Vacinação", "Exames", "Procedimentos"];
const times = ["08:30", "09:15", "10:40", "13:30", "14:10", "15:20", "16:00"];

function availableDays() {
  const today = new Date();
  return Array.from({ length: 16 }, (_, index) => addDays(today, index + 1)).filter((date) => date.getDay() !== 0);
}

export function BookingPage({ storeName = tenant.name }: { storeName?: string }) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [open, setOpen] = useState(false);
  const days = useMemo(() => availableDays(), []);

  function chooseDay(day?: Date) {
    if (!day) return;
    setSelectedDate(day);
    setOpen(true);
  }

  return (
    <main className="min-h-[100dvh] bg-[#f5f7f1] px-4 py-5 text-zinc-950 sm:px-6 lg:px-8">
      <section className="mx-auto flex max-w-6xl flex-col">
        <header className="flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-zinc-950 text-sm font-bold text-white">
              PS
            </div>
            <div>
              <p className="text-sm font-semibold">{storeName}</p>
              <p className="text-xs text-zinc-500">Agendamento online</p>
            </div>
          </Link>
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: "outline" }), "rounded-md border-zinc-300 bg-white")}
          >
            <LogIn className="size-4" />
            Entrar
          </Link>
        </header>

        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center py-10 sm:py-14">
          <div className="mb-7 text-center">
            <p className="text-sm font-semibold text-zinc-600">{storeName}</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl">
              Agende o cuidado do seu pet
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-zinc-600 sm:text-base">
              Escolha o tipo de atendimento, selecione um dia disponível no calendário e confirme um horário no popup.
            </p>
          </div>

          <Card className="rounded-xl border-zinc-200 bg-white shadow-sm shadow-zinc-900/5">
            <CardContent className="p-4 sm:p-6">
              <Tabs defaultValue="grooming" className="space-y-6">
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

                <TabsContent value="grooming">
                  <BookingForm
                    type="grooming"
                    services={groomingServices}
                    selectedDate={selectedDate}
                    selectedTime={selectedTime}
                    days={days}
                    onSelectDay={chooseDay}
                  />
                </TabsContent>
                <TabsContent value="veterinary">
                  <BookingForm
                    type="veterinary"
                    services={veterinaryServices}
                    selectedDate={selectedDate}
                    selectedTime={selectedTime}
                    days={days}
                    onSelectDay={chooseDay}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <div className="mt-6 flex flex-col items-center justify-center gap-3 rounded-lg border border-zinc-200 bg-white/70 p-4 text-center sm:flex-row">
            <p className="text-sm text-zinc-600">É atendente ou faz parte da equipe?</p>
            <Link href="/login" className="text-sm font-semibold text-zinc-950 underline underline-offset-4">
              Logue aqui para acessar o sistema
            </Link>
          </div>
        </div>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-xl">
          <DialogHeader>
            <DialogTitle>
              {selectedDate ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR }) : "Escolha um horário"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {times.map((time) => (
              <Button
                key={time}
                variant={selectedTime === time ? "default" : "outline"}
                className="h-11 rounded-md"
                onClick={() => {
                  setSelectedTime(time);
                  setOpen(false);
                }}
              >
                {time}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function BookingForm({
  type,
  services,
  selectedDate,
  selectedTime,
  days,
  onSelectDay,
}: {
  type: "grooming" | "veterinary";
  services: string[];
  selectedDate?: Date;
  selectedTime: string;
  days: Date[];
  onSelectDay: (day?: Date) => void;
}) {
  return (
    <form className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Nome do tutor</Label>
          <Input className="rounded-md" placeholder="Nome completo" />
        </div>
        <div className="space-y-2">
          <Label>WhatsApp</Label>
          <Input className="rounded-md" placeholder="(00) 00000-0000" />
        </div>
        <div className="space-y-2">
          <Label>Nome do pet</Label>
          <Input className="rounded-md" placeholder="Ex: Luna" />
        </div>
        <div className="space-y-2">
          <Label>Serviço</Label>
          <Select>
            <SelectTrigger className="rounded-md">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {services.map((service) => (
                <SelectItem key={service} value={service}>
                  {service}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Espécie</Label>
          <Select>
            <SelectTrigger className="rounded-md">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dog">Cachorro</SelectItem>
              <SelectItem value="cat">Gato</SelectItem>
              <SelectItem value="other">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Raça</Label>
          <Input className="rounded-md" placeholder="Raça ou SRD" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
          <div className="mb-3 flex items-center gap-2">
            <CalendarCheck className="size-4 text-zinc-600" />
            <p className="text-sm font-semibold">Escolha o dia</p>
          </div>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={onSelectDay}
            locale={ptBR}
            disabled={(day) => !days.some((available) => isSameDay(available, day))}
            className="mx-auto rounded-lg bg-white"
          />
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex items-center gap-2">
              <PawPrint className="size-4 text-zinc-600" />
              <p className="text-sm font-semibold">Resumo</p>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-zinc-500">Dia</span>
                <strong className="text-right">
                  {selectedDate ? format(selectedDate, "dd/MM/yyyy") : "Selecione no calendário"}
                </strong>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-zinc-500">Horário</span>
                <strong>{selectedTime || "Escolha no popup"}</strong>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-zinc-500">Tipo</span>
                <strong>{type === "grooming" ? "Banho e Tosa" : "Veterinário"}</strong>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{type === "grooming" ? "Observações para a equipe" : "Motivo da consulta"}</Label>
            <Textarea
              className="min-h-28 rounded-md"
              placeholder={
                type === "grooming"
                  ? "Alergias, comportamento, preferências de tosa..."
                  : "Sintomas, retorno, vacina ou procedimento necessário..."
              }
            />
          </div>
          <Button className="h-11 w-full rounded-md bg-zinc-950 text-white hover:bg-zinc-800">
            Confirmar agendamento
          </Button>
        </div>
      </div>
    </form>
  );
}
