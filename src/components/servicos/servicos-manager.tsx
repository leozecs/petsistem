"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { PenLine, Plus, Scissors, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusPill } from "@/components/shared/status-pill";
import { SectionHeading } from "@/components/app/section-heading";
import { deleteService, saveService } from "@/app/app/servicos/actions";
import type { Database } from "@/lib/supabase/database.types";

type ServiceRow = Database["public"]["Tables"]["services"]["Row"];

const serviceFormSchema = z.object({
  area: z.enum(["grooming", "veterinary"]),
  name: z.string().trim().min(1, "Nome obrigatório"),
  description: z.string().trim().optional(),
  duration_minutes: z
    .string()
    .trim()
    .min(1, "Duração obrigatória")
    .refine((v) => /^\d+$/.test(v) && Number(v) > 0, "Duração inválida"),
  price_brl: z.string().trim().min(1, "Preço obrigatório"),
  active: z.boolean(),
});

type ServiceFormValues = z.infer<typeof serviceFormSchema>;

const emptyValues: ServiceFormValues = {
  area: "grooming",
  name: "",
  description: "",
  duration_minutes: "45",
  price_brl: "",
  active: true,
};

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function areaLabel(area: string) {
  if (area === "grooming") return "Banho e Tosa";
  if (area === "veterinary") return "Veterinária";
  return area;
}

function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

export function ServicosManager({
  initialServices,
  canManage,
}: {
  initialServices: ServiceRow[];
  canManage: boolean;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceRow | null>(null);
  const [pending, startTransition] = useTransition();

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: emptyValues,
  });

  function openCreate() {
    setEditing(null);
    form.reset(emptyValues);
    setDialogOpen(true);
  }

  function openEdit(svc: ServiceRow) {
    setEditing(svc);
    form.reset({
      area: svc.area,
      name: svc.name,
      description: svc.description ?? "",
      duration_minutes: String(svc.duration_minutes),
      price_brl: centsToInput(svc.price_cents),
      active: svc.active,
    });
    setDialogOpen(true);
  }

  async function onSubmit(values: ServiceFormValues) {
    const fd = new FormData();
    if (editing) fd.set("id", editing.id);
    fd.set("area", values.area);
    fd.set("name", values.name);
    fd.set("description", values.description ?? "");
    fd.set("duration_minutes", String(values.duration_minutes));
    fd.set("price_brl", values.price_brl);
    fd.set("active", String(values.active));

    startTransition(async () => {
      const result = await saveService({ ok: false }, fd);
      if (result.ok) {
        toast.success(editing ? "Serviço atualizado" : "Serviço cadastrado");
        setDialogOpen(false);
      } else if (result.fieldErrors) {
        for (const [key, msg] of Object.entries(result.fieldErrors)) {
          const fieldKey = key === "price_cents" ? "price_brl" : key;
          form.setError(fieldKey as keyof ServiceFormValues, { message: msg });
        }
      } else if (result.error) {
        toast.error(result.error);
      }
    });
  }

  function handleDelete(svc: ServiceRow) {
    if (!confirm(`Excluir ${svc.name}?`)) return;
    startTransition(async () => {
      const result = await deleteService(svc.id);
      if (result.ok) toast.success("Serviço excluído");
      else toast.error(result.error ?? "Erro ao excluir");
    });
  }

  return (
    <div>
      <SectionHeading
        title="Serviços"
        description="Catálogo de serviços de Banho e Tosa e Veterinária com duração e preço."
        action={
          canManage ? (
            <Button onClick={openCreate} className="rounded-md bg-zinc-950 text-white hover:bg-zinc-800">
              <Plus className="size-4" />
              Novo serviço
            </Button>
          ) : null
        }
      />

      <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
        <CardContent className="p-0">
          {initialServices.length === 0 ? (
            <div className="p-10">
              <EmptyState
                icon={Scissors}
                title="Sem serviços ainda"
                description="Cadastre o catálogo de banho/tosa e veterinária."
                action={
                  canManage ? (
                    <Button onClick={openCreate} className="rounded-md bg-zinc-950 text-white hover:bg-zinc-800">
                      <Plus className="size-4" />
                      Novo serviço
                    </Button>
                  ) : null
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[760px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Serviço</TableHead>
                    <TableHead>Área</TableHead>
                    <TableHead>Duração</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Status</TableHead>
                    {canManage ? <TableHead className="text-right">Ações</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {initialServices.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">
                        {s.name}
                        {s.description ? (
                          <p className="mt-0.5 text-xs text-zinc-500">{s.description}</p>
                        ) : null}
                      </TableCell>
                      <TableCell>{areaLabel(s.area)}</TableCell>
                      <TableCell>{s.duration_minutes} min</TableCell>
                      <TableCell className="font-semibold">{brl.format(s.price_cents / 100)}</TableCell>
                      <TableCell>
                        <StatusPill tone={s.active ? "success" : "neutral"}>
                          {s.active ? "Ativo" : "Inativo"}
                        </StatusPill>
                      </TableCell>
                      {canManage ? (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-md border-zinc-300 bg-white"
                              onClick={() => openEdit(s)}
                            >
                              <PenLine className="size-4" />
                              Editar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-md border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
                              onClick={() => handleDelete(s)}
                              disabled={pending}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-xl border-zinc-200 bg-white sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar serviço" : "Novo serviço"}</DialogTitle>
            <DialogDescription>
              {editing ? "Atualize o serviço." : "Cadastre um novo serviço no catálogo."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="area">Área</Label>
              <Select
                value={form.watch("area")}
                onValueChange={(v) => {
                  const value = String(v ?? "");
                  if (value === "grooming" || value === "veterinary") {
                    form.setValue("area", value, { shouldValidate: true });
                  }
                }}
              >
                <SelectTrigger id="area" className="rounded-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="grooming">Banho e Tosa</SelectItem>
                  <SelectItem value="veterinary">Veterinária</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" {...form.register("name")} />
              {form.formState.errors.name ? (
                <p className="text-xs text-rose-600">{form.formState.errors.name.message}</p>
              ) : null}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea id="description" rows={2} {...form.register("description")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration_minutes">Duração (minutos)</Label>
              <Input id="duration_minutes" type="number" min={1} {...form.register("duration_minutes")} />
              {form.formState.errors.duration_minutes ? (
                <p className="text-xs text-rose-600">{form.formState.errors.duration_minutes.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="price_brl">Preço (R$)</Label>
              <Input id="price_brl" placeholder="140,00" inputMode="decimal" {...form.register("price_brl")} />
              {form.formState.errors.price_brl ? (
                <p className="text-xs text-rose-600">{form.formState.errors.price_brl.message}</p>
              ) : null}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="active" className="flex items-center justify-between gap-3 rounded-md border border-zinc-200 p-3">
                <span>Ativo</span>
                <Switch
                  id="active"
                  checked={form.watch("active")}
                  onCheckedChange={(v) => form.setValue("active", v, { shouldValidate: true })}
                />
              </Label>
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
                {pending ? "Salvando…" : editing ? "Salvar alterações" : "Cadastrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
