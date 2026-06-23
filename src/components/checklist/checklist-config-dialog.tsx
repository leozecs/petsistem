"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Pencil, Plus, Settings2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { createChecklistStep, deleteChecklistStep, updateChecklistStep } from "@/app/app/checklist/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type ChecklistTemplate = {
  serviceId: string;
  serviceName: string;
  steps: Array<{ id: string; label: string; position: number }>;
};

export function ChecklistConfigDialog({ templates }: { templates: ChecklistTemplate[] }) {
  const [serviceId, setServiceId] = useState(templates[0]?.serviceId ?? "");
  const [newLabel, setNewLabel] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const [pending, startTransition] = useTransition();
  const selected = useMemo(() => templates.find((item) => item.serviceId === serviceId), [templates, serviceId]);
  const items = useMemo(() => Object.fromEntries(templates.map((item) => [item.serviceId, item.serviceName])), [templates]);

  const add = () => {
    if (!serviceId || !newLabel.trim()) return;
    startTransition(async () => {
      const result = await createChecklistStep({ service_id: serviceId, label: newLabel.trim() });
      if (!result.ok) { toast.error(result.error); return; }
      setNewLabel("");
      toast.success("Etapa adicionada.");
    });
  };

  const save = (id: string) => startTransition(async () => {
    const result = await updateChecklistStep({ id, service_id: serviceId, label: editingLabel.trim() });
    if (!result.ok) { toast.error(result.error); return; }
    setEditingId(null);
    toast.success("Etapa atualizada.");
  });

  const remove = (id: string, label: string) => {
    if (!confirm(`Remover a etapa "${label}" deste fluxo?`)) return;
    startTransition(async () => {
      const result = await deleteChecklistStep({ id, service_id: serviceId });
      if (!result.ok) { toast.error(result.error); return; }
      toast.success("Etapa removida do fluxo.");
    });
  };

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}><Settings2 className="size-4" /> Configurar etapas</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Fluxo do checklist</DialogTitle></DialogHeader>
        {templates.length === 0 ? <p className="text-sm text-zinc-600">Cadastre um serviço antes de configurar etapas.</p> : <div className="space-y-5">
          <div className="space-y-2">
            <Label>Serviço</Label>
            <Select items={items} value={serviceId} onValueChange={(value) => { setServiceId(String(value ?? "")); setEditingId(null); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{templates.map((item) => <SelectItem key={item.serviceId} value={item.serviceId}>{item.serviceName}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Input value={newLabel} onChange={(event) => setNewLabel(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); add(); } }} placeholder="Ex: Banho concluído" maxLength={120} disabled={pending} />
            <Button onClick={add} disabled={pending || !newLabel.trim()}><Plus className="size-4" /> Adicionar</Button>
          </div>
          <ol className="divide-y divide-zinc-100 rounded-lg border border-zinc-200">
            {(selected?.steps ?? []).map((step, index) => <li key={step.id} className="flex items-center gap-2 p-3">
              <span className="w-6 font-mono text-xs text-zinc-400">{index + 1}.</span>
              {editingId === step.id ? <>
                <Input value={editingLabel} onChange={(event) => setEditingLabel(event.target.value)} maxLength={120} disabled={pending} autoFocus />
                <Button size="sm" onClick={() => save(step.id)} disabled={pending || !editingLabel.trim()}><Check className="size-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="size-4" /></Button>
              </> : <>
                <span className="flex-1 text-sm text-zinc-900">{step.label}</span>
                <Button size="sm" variant="ghost" onClick={() => { setEditingId(step.id); setEditingLabel(step.label); }}><Pencil className="size-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => remove(step.id, step.label)} disabled={pending}><Trash2 className="size-4 text-rose-600" /></Button>
              </>}
            </li>)}
          </ol>
          {(selected?.steps.length ?? 0) === 0 ? <p className="text-center text-sm text-zinc-500">Nenhuma etapa nesse serviço.</p> : null}
        </div>}
      </DialogContent>
    </Dialog>
  );
}
