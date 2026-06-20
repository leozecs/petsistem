"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { CheckCircle2, PenLine, Plus, Stethoscope, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { StatusPill } from "@/components/shared/status-pill";
import { SectionHeading } from "@/components/app/section-heading";
import { deletePlan, savePlan } from "@/app/admin-master/planos/actions";
import type { Database } from "@/lib/supabase/database.types";

type PlanRow = Database["public"]["Tables"]["plans"]["Row"];

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const formSchema = z.object({
  code: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "Código muito curto")
    .regex(/^[a-z0-9_-]+$/, "Apenas letras minúsculas, números, _ e -"),
  name: z.string().trim().min(2, "Nome obrigatório"),
  price: z.string().min(1, "Preço obrigatório"),
  max_users: z.string().min(1, "Limite obrigatório"),
  allows_veterinarian: z.boolean(),
  description: z.string().trim().optional(),
  active: z.boolean(),
});
type FormValues = z.infer<typeof formSchema>;

export function PlanosManager({
  initialPlans,
}: {
  initialPlans: PlanRow[];
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PlanRow | null>(null);
  const [pending, startTransition] = useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: "",
      name: "",
      price: "",
      max_users: "",
      allows_veterinarian: false,
      description: "",
      active: true,
    },
  });

  function openCreate() {
    setEditing(null);
    form.reset({
      code: "",
      name: "",
      price: "",
      max_users: "",
      allows_veterinarian: false,
      description: "",
      active: true,
    });
    setDialogOpen(true);
  }

  function openEdit(p: PlanRow) {
    setEditing(p);
    form.reset({
      code: p.code,
      name: p.name,
      price: (p.price_cents / 100).toFixed(2).replace(".", ","),
      max_users: String(p.max_users),
      allows_veterinarian: p.allows_veterinarian,
      description: p.description ?? "",
      active: p.active,
    });
    setDialogOpen(true);
  }

  function onSubmit(values: FormValues) {
    const priceRaw = values.price.replace(/\./g, "").replace(",", ".");
    const priceCents = Math.round(Number(priceRaw) * 100);
    if (!Number.isFinite(priceCents) || priceCents < 0) {
      form.setError("price", { message: "Preço inválido" });
      return;
    }
    const maxUsers = Number(values.max_users);
    if (!Number.isInteger(maxUsers) || maxUsers < 1) {
      form.setError("max_users", { message: "Inválido" });
      return;
    }

    const fd = new FormData();
    if (editing) fd.set("id", editing.id);
    fd.set("code", values.code);
    fd.set("name", values.name);
    fd.set("price_cents", String(priceCents));
    fd.set("max_users", String(maxUsers));
    fd.set("allows_veterinarian", String(values.allows_veterinarian));
    fd.set("description", values.description ?? "");
    fd.set("active", String(values.active));

    startTransition(async () => {
      const result = await savePlan(fd);
      if (result.ok) {
        toast.success(editing ? "Plano atualizado" : "Plano criado");
        setDialogOpen(false);
        router.refresh();
      } else if (result.fieldErrors) {
        for (const [k, msg] of Object.entries(result.fieldErrors)) {
          form.setError(k as keyof FormValues, { message: msg });
        }
      } else {
        toast.error(result.error ?? "Erro");
      }
    });
  }

  function handleDeactivate(p: PlanRow) {
    if (!confirm(`Desativar o plano ${p.name}? Lojas existentes mantêm o plano até trocarem.`)) return;
    startTransition(async () => {
      const result = await deletePlan(p.id);
      if (result.ok) {
        toast.success("Plano desativado");
        router.refresh();
      } else {
        toast.error(result.error ?? "Erro");
      }
    });
  }

  return (
    <div>
      <SectionHeading
        title="Planos"
        description="Defina limites e preços dos planos vendidos no SaaS."
        action={
          <Button
            onClick={openCreate}
            className="rounded-md bg-zinc-950 text-white hover:bg-zinc-800"
          >
            <Plus className="size-4" />
            Novo plano
          </Button>
        }
      />

      <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
        <CardContent className="p-0">
          {initialPlans.length === 0 ? (
            <div className="p-10 text-center text-sm text-zinc-500">
              Nenhum plano cadastrado. Crie o primeiro.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[760px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Plano</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Preço/mês</TableHead>
                    <TableHead>Usuários</TableHead>
                    <TableHead>Veterinário</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {initialPlans.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>
                        <span className="font-mono text-xs text-zinc-600">
                          {p.code}
                        </span>
                      </TableCell>
                      <TableCell>{formatBRL(p.price_cents)}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 text-sm">
                          <Users className="size-3.5 text-zinc-500" />
                          {p.max_users}
                        </span>
                      </TableCell>
                      <TableCell>
                        {p.allows_veterinarian ? (
                          <span className="inline-flex items-center gap-1 text-sm text-emerald-700">
                            <Stethoscope className="size-3.5" />
                            Sim
                          </span>
                        ) : (
                          <span className="text-sm text-zinc-500">Não</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusPill tone={p.active ? "success" : "neutral"}>
                          {p.active ? "Ativo" : "Inativo"}
                        </StatusPill>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEdit(p)}
                            className="rounded-md border-zinc-300 bg-white"
                          >
                            <PenLine className="size-4" />
                          </Button>
                          {p.active ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeactivate(p)}
                              disabled={pending}
                              className="rounded-md border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          ) : (
                            <CheckCircle2 className="ml-2 size-4 text-zinc-400" />
                          )}
                        </div>
                      </TableCell>
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
            <DialogTitle>{editing ? "Editar plano" : "Novo plano"}</DialogTitle>
            <DialogDescription>
              Defina nome, preço e limites de uso desse plano.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-4 sm:grid-cols-2"
          >
            <div className="space-y-2">
              <Label htmlFor="pl_code">Código</Label>
              <Input
                id="pl_code"
                {...form.register("code")}
                disabled={Boolean(editing)}
              />
              {form.formState.errors.code ? (
                <p className="text-xs text-rose-600">
                  {form.formState.errors.code.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="pl_name">Nome</Label>
              <Input id="pl_name" {...form.register("name")} />
              {form.formState.errors.name ? (
                <p className="text-xs text-rose-600">
                  {form.formState.errors.name.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="pl_price">Preço mensal (R$)</Label>
              <Input
                id="pl_price"
                inputMode="decimal"
                placeholder="0,00"
                {...form.register("price")}
              />
              {form.formState.errors.price ? (
                <p className="text-xs text-rose-600">
                  {form.formState.errors.price.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="pl_max">Máx. usuários</Label>
              <Input
                id="pl_max"
                type="number"
                min={1}
                {...form.register("max_users")}
              />
              {form.formState.errors.max_users ? (
                <p className="text-xs text-rose-600">
                  {form.formState.errors.max_users.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label
                htmlFor="pl_vet"
                className="flex items-center justify-between gap-3 rounded-md border border-zinc-200 p-3"
              >
                <span>Permite cadastrar veterinário</span>
                <Switch
                  id="pl_vet"
                  checked={form.watch("allows_veterinarian")}
                  onCheckedChange={(v) =>
                    form.setValue("allows_veterinarian", v, { shouldValidate: true })
                  }
                />
              </Label>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="pl_desc">Descrição</Label>
              <Textarea id="pl_desc" rows={2} {...form.register("description")} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label
                htmlFor="pl_active"
                className="flex items-center justify-between gap-3 rounded-md border border-zinc-200 p-3"
              >
                <span>Plano ativo (aceita novas vendas)</span>
                <Switch
                  id="pl_active"
                  checked={form.watch("active")}
                  onCheckedChange={(v) =>
                    form.setValue("active", v, { shouldValidate: true })
                  }
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
                {pending ? "Salvando…" : editing ? "Salvar" : "Criar plano"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
