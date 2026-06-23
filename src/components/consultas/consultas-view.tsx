"use client";

import { useMemo, useState, useTransition } from "react";
import { FilePlus2, Search, Stethoscope } from "lucide-react";
import { toast } from "sonner";
import { createPetClinicalEntry } from "@/app/app/consultas/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Entry = { id: string; title: string; notes: string; createdAt: string; veterinarianName: string | null };
export type ClinicalPet = { id: string; name: string; species: string; breed: string | null; tutorName: string | null; entries: Entry[] };

export function ConsultasView({ pets }: { pets: ClinicalPet[] }) {
  const now = new Date();
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [selected, setSelected] = useState<ClinicalPet | null>(null);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();
  const filtered = useMemo(() => pets.filter((pet) => pet.name.toLowerCase().includes(search.trim().toLowerCase())), [pets, search]);
  const visibleEntries = useMemo(() => (selected?.entries ?? []).filter((entry) => { const date = new Date(entry.createdAt); return date.getMonth() + 1 === Number(month) && date.getFullYear() === Number(year); }), [selected, month, year]);

  const save = () => {
    if (!selected) return;
    startTransition(async () => {
      const result = await createPetClinicalEntry({ pet_id: selected.id, title, notes });
      if (!result.ok) { toast.error(result.error); return; }
      toast.success("Informação clínica registrada.");
      setTitle(""); setNotes("");
    });
  };

  return <div className="space-y-5">
    <div><h1 className="text-2xl font-semibold tracking-tight">Consultas</h1><p className="mt-1 text-sm text-zinc-600">Histórico clínico dos pets da loja.</p></div>
    <div className="relative max-w-md"><Search className="absolute left-3 top-2.5 size-4 text-zinc-400" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar pet pelo nome" className="pl-9" /></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{filtered.map((pet) => <button key={pet.id} type="button" onClick={() => setSelected(pet)} className="text-left"><Card className="h-full rounded-xl border-zinc-200 bg-white shadow-none transition hover:border-zinc-400"><CardContent className="p-5"><div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-lg bg-zinc-100"><Stethoscope className="size-4" /></div><div><p className="font-semibold text-zinc-950">{pet.name}</p><p className="text-xs text-zinc-500">{pet.species}{pet.breed ? ` · ${pet.breed}` : ""}</p></div></div><p className="mt-4 text-xs text-zinc-500">Tutor: {pet.tutorName ?? "Não informado"}</p><p className="mt-1 text-xs font-medium text-zinc-700">{pet.entries.length} registro(s)</p></CardContent></Card></button>)}</div>
    <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{selected?.name} · histórico clínico</DialogTitle></DialogHeader>
      <div className="grid gap-3 sm:grid-cols-2"><div><Label>Mês</Label><Input type="number" min={1} max={12} value={month} onChange={(event) => setMonth(event.target.value)} /></div><div><Label>Ano</Label><Input type="number" min={2020} max={2100} value={year} onChange={(event) => setYear(event.target.value)} /></div></div>
      <div className="space-y-3">{visibleEntries.length === 0 ? <p className="rounded-lg bg-zinc-50 p-4 text-sm text-zinc-500">Sem registros nesse período.</p> : visibleEntries.map((entry) => <div key={entry.id} className="rounded-lg border border-zinc-200 p-4"><div className="flex justify-between gap-3"><p className="font-semibold">{entry.title}</p><time className="text-xs text-zinc-500">{new Date(entry.createdAt).toLocaleDateString("pt-BR")}</time></div><p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">{entry.notes}</p>{entry.veterinarianName ? <p className="mt-2 text-xs text-zinc-500">Veterinário: {entry.veterinarianName}</p> : null}</div>)}</div>
      <div className="space-y-3 border-t border-zinc-200 pt-4"><h3 className="text-sm font-semibold">Novo registro</h3><div><Label>Título</Label><Input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder="Ex: Retorno pós-operatório" /></div><div><Label>Informações</Label><Textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={6000} rows={5} placeholder="Diagnóstico, evolução, medicação e recomendações" /></div></div>
      <DialogFooter><Button onClick={save} disabled={pending || !title.trim() || !notes.trim()}><FilePlus2 className="size-4" />{pending ? "Salvando…" : "Cadastrar informação"}</Button></DialogFooter>
    </DialogContent></Dialog>
  </div>;
}
