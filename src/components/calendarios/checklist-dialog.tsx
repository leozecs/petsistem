"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  getChecklist,
  saveChecklist,
  type ChecklistRow,
} from "@/app/app/calendarios/actions";

const ARRIVAL_OPTIONS = [
  "Limpo",
  "Sujo",
  "Muito sujo",
  "Com pulgas/carrapatos",
  "Calmo",
  "Agressivo",
  "Assustado",
];

type Props = {
  appointmentId: string | null;
  /** Display headline (e.g. "Banho — Rex"). */
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after successful save so the parent can refresh state. */
  onSaved?: () => void;
  /** Submit-button label. Default: "Salvar e iniciar". */
  submitLabel?: string;
};

export function ChecklistDialog({
  appointmentId,
  title,
  open,
  onOpenChange,
  onSaved,
  submitLabel = "Salvar e iniciar",
}: Props) {
  const [products, setProducts] = useState<string[]>([]);
  const [arrival, setArrival] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [productDraft, setProductDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();

  // Load existing checklist whenever the dialog opens with a new appointment.
  useEffect(() => {
    if (!open || !appointmentId) return;
    let cancelled = false;
    setLoading(true);
    setProducts([]);
    setArrival("");
    setNotes("");
    setProductDraft("");
    void getChecklist(appointmentId).then((res) => {
      if (cancelled) return;
      if (res.ok && res.data) {
        const d: ChecklistRow = res.data;
        setProducts(d.products ?? []);
        setArrival(d.arrival_condition ?? "");
        setNotes(d.notes ?? "");
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, appointmentId]);

  function addProduct() {
    const v = productDraft.trim();
    if (!v) return;
    if (products.some((p) => p.toLowerCase() === v.toLowerCase())) {
      setProductDraft("");
      return;
    }
    setProducts((prev) => [...prev, v]);
    setProductDraft("");
  }

  function removeProduct(p: string) {
    setProducts((prev) => prev.filter((x) => x !== p));
  }

  function handleSubmit() {
    if (!appointmentId) return;
    startTransition(async () => {
      const result = await saveChecklist(
        appointmentId,
        products,
        arrival || null,
        notes || null,
      );
      if (result.ok) {
        toast.success("Checklist salvo");
        onOpenChange(false);
        onSaved?.();
      } else {
        toast.error(result.error ?? "Erro ao salvar checklist");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-xl border-zinc-200 bg-white sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Checklist do atendimento</DialogTitle>
          <DialogDescription>{title}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="py-6 text-center text-sm text-zinc-500">Carregando…</p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ck_products">Produtos usados</Label>
              <div className="flex gap-2">
                <input
                  id="ck_products"
                  value={productDraft}
                  onChange={(e) => setProductDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addProduct();
                    }
                  }}
                  placeholder="Ex: Shampoo neutro"
                  className="h-9 flex-1 rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-md border-zinc-300 bg-white"
                  onClick={addProduct}
                  disabled={!productDraft.trim()}
                >
                  <Plus className="size-4" />
                  Adicionar
                </Button>
              </div>
              {products.length > 0 ? (
                <ul className="flex flex-wrap gap-1.5">
                  {products.map((p) => (
                    <li
                      key={p}
                      className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs text-zinc-800"
                    >
                      {p}
                      <button
                        type="button"
                        onClick={() => removeProduct(p)}
                        className="text-zinc-500 hover:text-rose-700"
                        aria-label={`Remover ${p}`}
                      >
                        <X className="size-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-zinc-500">Nenhum produto adicionado.</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ck_arrival">Condição de chegada</Label>
              <Select
                value={arrival || undefined}
                onValueChange={(v) => setArrival(String(v ?? ""))}
              >
                <SelectTrigger id="ck_arrival" className="rounded-md">
                  <SelectValue placeholder="Selecione (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {ARRIVAL_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ck_notes">Observações</Label>
              <Textarea
                id="ck_notes"
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Hidratação aplicada, comportamento, recomendações ao tutor…"
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
