"use client";

import { useMemo, useState, useTransition } from "react";
import { CalendarDays, FilePlus2, PawPrint, Search, Stethoscope, UserRound } from "lucide-react";
import { toast } from "sonner";
import { createPetClinicalEntry } from "@/app/app/consultas/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Entry = { id: string; title: string; notes: string; createdAt: string; veterinarianName: string | null };
type Appointment = { id: string; startsAt: string; status: string; serviceName: string; area: "grooming" | "veterinary"; diagnosis: string | null; complaint: string | null; plan: string | null };
export type ClinicalPet = { id: string; name: string; species: string; breed: string | null; sex: string | null; weightKg: number | null; ageLabel: string | null; notes: string | null; tutorName: string | null; tutorWhatsapp: string | null; entries: Entry[]; appointments: Appointment[] };

const STATUS: Record<string, string> = { pending: "Pendente", confirmed: "Confirmado", checked_in: "Chegou", in_progress: "Em atendimento", finished: "Finalizado", cancelled: "Cancelado", no_show: "Não compareceu" };

export function ConsultasView({ pets }: { pets: ClinicalPet[] }) {
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState("all");
  const [year, setYear] = useState("all");
  const [selected, setSelected] = useState<ClinicalPet | null>(null);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();
  const availableYears = useMemo(() => Array.from(new Set(pets.flatMap((pet) => [
    ...pet.entries.map((entry) => new Date(entry.createdAt).getFullYear()),
    ...pet.appointments.map((appointment) => new Date(appointment.startsAt).getFullYear()),
  ]))).sort((a, b) => b - a), [pets]);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return pets.filter((pet) => {
      const matchesSearch = !query || [pet.name, pet.tutorName, pet.breed, pet.species].some((value) => value?.toLowerCase().includes(query));
      if (!matchesSearch || (month === "all" && year === "all")) return matchesSearch;
      const dates = [...pet.entries.map((entry) => entry.createdAt), ...pet.appointments.map((appointment) => appointment.startsAt)];
      return dates.some((value) => {
        const date = new Date(value);
        return (month === "all" || date.getMonth() + 1 === Number(month)) && (year === "all" || date.getFullYear() === Number(year));
      });
    });
  }, [pets, search, month, year]);
  const selectedTimeline = useMemo(() => {
    if (!selected) return [];
    const clinical = selected.entries.map((entry) => ({ id: `entry-${entry.id}`, date: entry.createdAt, kind: "clinical" as const, entry }));
    const appointments = selected.appointments.map((appointment) => ({ id: `appointment-${appointment.id}`, date: appointment.startsAt, kind: "appointment" as const, appointment }));
    return [...clinical, ...appointments].filter((item) => { const date = new Date(item.date); return (month === "all" || date.getMonth() + 1 === Number(month)) && (year === "all" || date.getFullYear() === Number(year)); }).sort((a, b) => b.date.localeCompare(a.date));
  }, [selected, month, year]);

  const save = () => {
    if (!selected) return;
    startTransition(async () => {
      const result = await createPetClinicalEntry({ pet_id: selected.id, title, notes });
      if (!result.ok) { toast.error(result.error); return; }
      toast.success("Informação clínica registrada."); setTitle(""); setNotes("");
    });
  };

  return <div className="space-y-5">
    <div><h1 className="text-2xl font-semibold tracking-tight">Consultas</h1><p className="mt-1 text-sm text-zinc-600">Ficha completa, atendimentos e histórico clínico de cada pet.</p></div>
    <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_10rem_8rem]">
      <div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar pet, tutor, espécie ou raça" className="pl-9" /></div>
      <select aria-label="Filtrar por mês" value={month} onChange={(event) => setMonth(event.target.value)} className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-base outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 lg:h-9 lg:text-sm"><option value="all">Todos os meses</option><option value="1">Janeiro</option><option value="2">Fevereiro</option><option value="3">Março</option><option value="4">Abril</option><option value="5">Maio</option><option value="6">Junho</option><option value="7">Julho</option><option value="8">Agosto</option><option value="9">Setembro</option><option value="10">Outubro</option><option value="11">Novembro</option><option value="12">Dezembro</option></select>
      <select aria-label="Filtrar por ano" value={year} onChange={(event) => setYear(event.target.value)} className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-base outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 lg:h-9 lg:text-sm"><option value="all">Todos os anos</option>{availableYears.map((value) => <option key={value} value={value}>{value}</option>)}</select>
    </div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{filtered.map((pet) => <button key={pet.id} type="button" onClick={() => setSelected(pet)} className="text-left"><Card className="h-full border-zinc-200 bg-white shadow-none transition hover:border-zinc-400"><CardContent className="p-5"><div className="flex items-center gap-3"><div className="flex size-11 items-center justify-center rounded-lg bg-zinc-100"><PawPrint className="size-5" /></div><div className="grid min-w-0 flex-1 grid-cols-2 gap-3"><div className="min-w-0"><p className="text-[0.65rem] font-medium uppercase tracking-wide text-zinc-400">Pet</p><p className="truncate font-semibold">{pet.name}</p></div><div className="min-w-0 border-l border-zinc-100 pl-3"><p className="text-[0.65rem] font-medium uppercase tracking-wide text-zinc-400">Tutor</p><p className="truncate text-sm font-medium">{pet.tutorName ?? "Não informado"}</p></div></div></div><p className="mt-2 truncate text-xs text-zinc-500">{pet.species}{pet.breed ? ` · ${pet.breed}` : ""}</p><div className="mt-4 grid grid-cols-2 gap-2 text-xs"><span className="rounded-md bg-zinc-50 p-2">{pet.appointments.length} atendimentos</span><span className="rounded-md bg-zinc-50 p-2">{pet.entries.length} registros</span></div></CardContent></Card></button>)}</div>

    <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle>{selected?.name} · ficha do pet</DialogTitle></DialogHeader>{selected ? <>
      <div className="grid gap-3 rounded-xl bg-zinc-50 p-4 sm:grid-cols-3"><Info icon={PawPrint} label="Pet" value={[selected.species, selected.breed, selected.ageLabel].filter(Boolean).join(" · ") || "Não informado"} /><Info icon={Stethoscope} label="Dados" value={[selected.weightKg ? `${selected.weightKg} kg` : null, selected.sex === "male" ? "Macho" : selected.sex === "female" ? "Fêmea" : null].filter(Boolean).join(" · ") || "Não informado"} /><Info icon={UserRound} label="Tutor" value={selected.tutorName ?? "Não informado"} /></div>
      {selected.notes ? <div className="rounded-lg border border-zinc-200 p-3 text-sm text-zinc-700"><strong>Observações:</strong> {selected.notes}</div> : null}
      <div className="space-y-3"><h3 className="text-sm font-semibold">Linha do tempo</h3>{selectedTimeline.length === 0 ? <p className="rounded-lg bg-zinc-50 p-4 text-sm text-zinc-500">Sem dados nesse período.</p> : selectedTimeline.map((item) => item.kind === "clinical" ? <div key={item.id} className="border-l-2 border-emerald-500 pl-4"><div className="flex justify-between gap-3"><p className="font-semibold">{item.entry.title}</p><time className="text-xs text-zinc-500">{new Date(item.date).toLocaleDateString("pt-BR")}</time></div><p className="mt-1 whitespace-pre-wrap text-sm text-zinc-700">{item.entry.notes}</p>{item.entry.veterinarianName ? <p className="mt-1 text-xs text-zinc-500">Veterinário: {item.entry.veterinarianName}</p> : null}</div> : <div key={item.id} className="border-l-2 border-sky-500 pl-4"><div className="flex justify-between gap-3"><p className="font-semibold">{item.appointment.serviceName}</p><time className="text-xs text-zinc-500">{new Date(item.date).toLocaleDateString("pt-BR")}</time></div><p className="text-xs text-zinc-500">{STATUS[item.appointment.status] ?? item.appointment.status}</p>{item.appointment.complaint ? <p className="mt-2 text-sm"><strong>Queixa:</strong> {item.appointment.complaint}</p> : null}{item.appointment.diagnosis ? <p className="mt-1 text-sm"><strong>Diagnóstico:</strong> {item.appointment.diagnosis}</p> : null}{item.appointment.plan ? <p className="mt-1 text-sm"><strong>Conduta:</strong> {item.appointment.plan}</p> : null}</div>)}</div>
      <div className="space-y-3 border-t pt-4"><h3 className="text-sm font-semibold">Novo registro clínico</h3><div><Label>Título</Label><Input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} /></div><div><Label>Informações</Label><Textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={6000} rows={4} /></div></div>
      <DialogFooter><Button onClick={save} disabled={pending || !title.trim() || !notes.trim()}><FilePlus2 className="size-4" />{pending ? "Salvando…" : "Cadastrar informação"}</Button></DialogFooter>
    </> : null}</DialogContent></Dialog>
  </div>;
}

function Info({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: string }) { return <div className="flex gap-2"><Icon className="mt-0.5 size-4 shrink-0 text-zinc-500" /><div><p className="text-xs font-medium text-zinc-500">{label}</p><p className="mt-0.5 text-sm font-medium text-zinc-900">{value}</p></div></div>; }
