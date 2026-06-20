"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarCheck, Copy, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { SectionHeading } from "@/components/app/section-heading";
import {
  saveSchedules,
  type WeekdayEntry,
} from "@/app/app/configuracoes/horarios/actions";

type CalendarLite = {
  id: string;
  name: string;
  area: "grooming" | "veterinary";
  active: boolean;
};

export type CalendarSchedules = {
  calendar: CalendarLite;
  entries: WeekdayEntry[];
};

const WEEKDAYS = [
  { id: 0, label: "Domingo" },
  { id: 1, label: "Segunda" },
  { id: 2, label: "Terça" },
  { id: 3, label: "Quarta" },
  { id: 4, label: "Quinta" },
  { id: 5, label: "Sexta" },
  { id: 6, label: "Sábado" },
];

const AREA_LABEL = {
  grooming: "Banho e Tosa",
  veterinary: "Veterinária",
} as const;

export function HorariosView({ calendars }: { calendars: CalendarSchedules[] }) {
  const router = useRouter();
  const [activeId, setActiveId] = useState<string>(calendars[0]?.calendar.id ?? "");
  const [state, setState] = useState<Record<string, WeekdayEntry[]>>(() => {
    const init: Record<string, WeekdayEntry[]> = {};
    for (const c of calendars) init[c.calendar.id] = c.entries;
    return init;
  });
  const [pending, startTransition] = useTransition();

  const active = calendars.find((c) => c.calendar.id === activeId);
  const entries = state[activeId] ?? [];

  function updateEntry(weekday: number, patch: Partial<WeekdayEntry>) {
    setState((prev) => ({
      ...prev,
      [activeId]: prev[activeId]!.map((e) =>
        e.weekday === weekday ? { ...e, ...patch } : e,
      ),
    }));
  }

  function applyToWeekdays() {
    const monday = entries.find((e) => e.weekday === 1);
    if (!monday) return;
    setState((prev) => ({
      ...prev,
      [activeId]: prev[activeId]!.map((e) =>
        e.weekday >= 1 && e.weekday <= 5
          ? {
              weekday: e.weekday,
              open: monday.open,
              starts_at: monday.starts_at,
              ends_at: monday.ends_at,
            }
          : e,
      ),
    }));
    toast.success("Segunda aplicada de seg a sex");
  }

  function handleSave() {
    if (!active) return;
    startTransition(async () => {
      const result = await saveSchedules(active.calendar.id, entries);
      if (result.ok) {
        toast.success("Horários salvos");
        router.refresh();
      } else {
        toast.error(result.error ?? "Erro ao salvar");
      }
    });
  }

  if (calendars.length === 0) {
    return (
      <div>
        <SectionHeading title="Horários" description="Defina o funcionamento por calendário." />
        <Card className="rounded-lg border-amber-200 bg-amber-50 shadow-none">
          <CardContent className="p-6 text-sm text-amber-900">
            Nenhum calendário ativo. Crie um em /app/configuracoes antes.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <SectionHeading
        title="Horários"
        description="Defina o funcionamento por calendário. Dias sem configuração herdam o padrão (seg-sáb 08:00-18:00)."
      />

      {/* Calendar tabs */}
      <div className="mb-4 inline-flex flex-wrap gap-1 rounded-md border border-zinc-200 bg-white p-1">
        {calendars.map((c) => {
          const isActive = c.calendar.id === activeId;
          return (
            <button
              key={c.calendar.id}
              type="button"
              onClick={() => setActiveId(c.calendar.id)}
              className={
                "rounded-md px-3 py-1.5 text-sm font-medium transition " +
                (isActive
                  ? "bg-zinc-950 text-white shadow-sm"
                  : "text-zinc-600 hover:bg-zinc-100")
              }
            >
              <CalendarCheck className="mr-1 inline size-3.5" />
              {c.calendar.name}{" "}
              <span className="ml-1 text-[0.6875rem] opacity-70">
                {AREA_LABEL[c.calendar.area]}
              </span>
            </button>
          );
        })}
      </div>

      <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
        <CardContent className="space-y-3 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-zinc-600">
              Marque os dias abertos e ajuste o horário de cada um.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-md border-zinc-300 bg-white"
              onClick={applyToWeekdays}
            >
              <Copy className="size-4" />
              Aplicar segunda em seg-sex
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500">
                  <th className="py-2 pr-4 text-left font-medium">Dia</th>
                  <th className="py-2 pr-4 text-left font-medium">Aberto</th>
                  <th className="py-2 pr-4 text-left font-medium">Início</th>
                  <th className="py-2 text-left font-medium">Fim</th>
                </tr>
              </thead>
              <tbody>
                {WEEKDAYS.map((wd) => {
                  const entry = entries.find((e) => e.weekday === wd.id);
                  if (!entry) return null;
                  return (
                    <tr key={wd.id} className="border-b border-zinc-100">
                      <td className="py-3 pr-4 font-medium text-zinc-900">{wd.label}</td>
                      <td className="py-3 pr-4">
                        <label className="inline-flex cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            checked={entry.open}
                            onChange={(e) => updateEntry(wd.id, { open: e.target.checked })}
                            className="size-4 rounded border-zinc-300 accent-zinc-950"
                          />
                          <span className="text-xs text-zinc-600">
                            {entry.open ? "Sim" : "Fechado"}
                          </span>
                        </label>
                      </td>
                      <td className="py-3 pr-4">
                        <input
                          type="time"
                          value={entry.starts_at}
                          disabled={!entry.open}
                          onChange={(e) => updateEntry(wd.id, { starts_at: e.target.value })}
                          className="h-9 rounded-md border border-zinc-200 bg-white px-2 text-sm disabled:bg-zinc-100 disabled:opacity-60"
                        />
                      </td>
                      <td className="py-3">
                        <input
                          type="time"
                          value={entry.ends_at}
                          disabled={!entry.open}
                          onChange={(e) => updateEntry(wd.id, { ends_at: e.target.value })}
                          className="h-9 rounded-md border border-zinc-200 bg-white px-2 text-sm disabled:bg-zinc-100 disabled:opacity-60"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="button"
              onClick={handleSave}
              disabled={pending}
              className="rounded-md bg-zinc-950 text-white hover:bg-zinc-800"
            >
              <Save className="size-4" />
              {pending ? "Salvando…" : "Salvar horários"}
            </Button>
          </div>

          <Label className="text-xs text-zinc-500">
            Dica: dias com fechado=Sim ficam sem agenda; demais usam a janela definida.
            Janelas com almoço (ex: 08-12 / 14-18) virão em uma próxima versão.
          </Label>
        </CardContent>
      </Card>
    </div>
  );
}
