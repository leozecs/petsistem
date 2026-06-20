"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { getRecord, saveRecord, type RecordRow } from "@/app/app/calendarios/actions";

type Props = {
  appointmentId: string | null;
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
  submitLabel?: string;
};

const EMPTY = {
  chief_complaint: "",
  anamnesis: "",
  physical_exam: "",
  diagnosis: "",
  plan: "",
};

export function RecordDialog({
  appointmentId,
  title,
  open,
  onOpenChange,
  onSaved,
  submitLabel = "Salvar e iniciar",
}: Props) {
  const [fields, setFields] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !appointmentId) return;
    let cancelled = false;
    setLoading(true);
    setFields(EMPTY);
    void getRecord(appointmentId).then((res) => {
      if (cancelled) return;
      if (res.ok && res.data) {
        const d: RecordRow = res.data;
        setFields({
          chief_complaint: d.chief_complaint ?? "",
          anamnesis: d.anamnesis ?? "",
          physical_exam: d.physical_exam ?? "",
          diagnosis: d.diagnosis ?? "",
          plan: d.plan ?? "",
        });
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, appointmentId]);

  function update<K extends keyof typeof fields>(key: K, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit() {
    if (!appointmentId) return;
    startTransition(async () => {
      const result = await saveRecord(appointmentId, {
        chief_complaint: fields.chief_complaint || null,
        anamnesis: fields.anamnesis || null,
        physical_exam: fields.physical_exam || null,
        diagnosis: fields.diagnosis || null,
        plan: fields.plan || null,
      });
      if (result.ok) {
        toast.success("Prontuário salvo");
        onOpenChange(false);
        onSaved?.();
      } else {
        toast.error(result.error ?? "Erro ao salvar prontuário");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-xl border-zinc-200 bg-white sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="size-4 text-zinc-700" />
            Prontuário veterinário
          </DialogTitle>
          <DialogDescription>{title}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="py-6 text-center text-sm text-zinc-500">Carregando…</p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="r_chief">Queixa principal</Label>
              <Textarea
                id="r_chief"
                rows={2}
                value={fields.chief_complaint}
                onChange={(e) => update("chief_complaint", e.target.value)}
                placeholder="Motivo da consulta relatado pelo tutor"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="r_anamnesis">Anamnese</Label>
              <Textarea
                id="r_anamnesis"
                rows={4}
                value={fields.anamnesis}
                onChange={(e) => update("anamnesis", e.target.value)}
                placeholder="Histórico, sintomas, alimentação, vacinação, comportamento"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="r_exam">Exame físico</Label>
              <Textarea
                id="r_exam"
                rows={3}
                value={fields.physical_exam}
                onChange={(e) => update("physical_exam", e.target.value)}
                placeholder="Peso, FC, FR, T°C, achados gerais"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="r_dx">Diagnóstico / Suspeita</Label>
              <Textarea
                id="r_dx"
                rows={2}
                value={fields.diagnosis}
                onChange={(e) => update("diagnosis", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="r_plan">Conduta / Prescrição</Label>
              <Textarea
                id="r_plan"
                rows={4}
                value={fields.plan}
                onChange={(e) => update("plan", e.target.value)}
                placeholder="Medicamentos, dose/via/duração, retorno, exames complementares"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="rounded-md border-zinc-300 bg-white"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            className="rounded-md bg-zinc-950 text-white hover:bg-zinc-800"
            onClick={handleSubmit}
            disabled={pending || loading}
          >
            {pending ? "Salvando…" : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
