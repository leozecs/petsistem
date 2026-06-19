"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { PenLine, Plus, Stethoscope, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusPill } from "@/components/shared/status-pill";
import { SectionHeading } from "@/components/app/section-heading";
import { deleteVeterinarian, saveVeterinarian } from "@/app/app/veterinarios/actions";
import type { Database } from "@/lib/supabase/database.types";

type VetRow = Database["public"]["Tables"]["veterinarians"]["Row"];

const vetFormSchema = z.object({
  name: z.string().trim().min(1, "Nome obrigatório"),
  crmv: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z.string().trim().email("Email inválido").optional().or(z.literal("")),
  specialties: z.string().trim().optional(),
  active: z.boolean(),
});

type VetFormValues = z.infer<typeof vetFormSchema>;

const emptyValues: VetFormValues = {
  name: "",
  crmv: "",
  phone: "",
  email: "",
  specialties: "",
  active: true,
};

export function VeterinariosManager({
  initialVets,
  canManage,
}: {
  initialVets: VetRow[];
  canManage: boolean;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<VetRow | null>(null);
  const [pending, startTransition] = useTransition();

  const form = useForm<VetFormValues>({
    resolver: zodResolver(vetFormSchema),
    defaultValues: emptyValues,
  });

  function openCreate() {
    setEditing(null);
    form.reset(emptyValues);
    setDialogOpen(true);
  }

  function openEdit(vet: VetRow) {
    setEditing(vet);
    form.reset({
      name: vet.name,
      crmv: vet.crmv ?? "",
      phone: vet.phone ?? "",
      email: vet.email ?? "",
      specialties: vet.specialties.join(", "),
      active: vet.active,
    });
    setDialogOpen(true);
  }

  async function onSubmit(values: VetFormValues) {
    const fd = new FormData();
    if (editing) fd.set("id", editing.id);
    fd.set("name", values.name);
    fd.set("crmv", values.crmv ?? "");
    fd.set("phone", values.phone ?? "");
    fd.set("email", values.email ?? "");
    fd.set("specialties", values.specialties ?? "");
    fd.set("active", String(values.active));

    startTransition(async () => {
      const result = await saveVeterinarian({ ok: false }, fd);
      if (result.ok) {
        toast.success(editing ? "Veterinário atualizado" : "Veterinário cadastrado");
        setDialogOpen(false);
      } else if (result.fieldErrors) {
        for (const [key, msg] of Object.entries(result.fieldErrors)) {
          form.setError(key as keyof VetFormValues, { message: msg });
        }
      } else if (result.error) {
        toast.error(result.error);
      }
    });
  }

  function handleDelete(vet: VetRow) {
    if (!confirm(`Excluir ${vet.name}?`)) return;
    startTransition(async () => {
      const result = await deleteVeterinarian(vet.id);
      if (result.ok) toast.success("Veterinário excluído");
      else toast.error(result.error ?? "Erro ao excluir");
    });
  }

  return (
    <div>
      <SectionHeading
        title="Veterinários"
        description="Profissionais com CRMV, especialidades e contato. A agenda veterinária usa calendário independente."
        action={
          canManage ? (
            <Button onClick={openCreate} className="rounded-md bg-zinc-950 text-white hover:bg-zinc-800">
              <Plus className="size-4" />
              Novo veterinário
            </Button>
          ) : null
        }
      />

      <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
        <CardContent className="p-0">
          {initialVets.length === 0 ? (
            <div className="p-10">
              <EmptyState
                icon={Stethoscope}
                title="Sem veterinários ainda"
                description="Cadastre o primeiro profissional com CRMV e especialidades."
                action={
                  canManage ? (
                    <Button onClick={openCreate} className="rounded-md bg-zinc-950 text-white hover:bg-zinc-800">
                      <Plus className="size-4" />
                      Novo veterinário
                    </Button>
                  ) : null
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[820px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CRMV</TableHead>
                    <TableHead>Especialidades</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    {canManage ? <TableHead className="text-right">Ações</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {initialVets.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">{v.name}</TableCell>
                      <TableCell className="font-mono text-xs text-zinc-600">{v.crmv ?? "—"}</TableCell>
                      <TableCell>{v.specialties.length ? v.specialties.join(", ") : "—"}</TableCell>
                      <TableCell>{v.phone ?? "—"}</TableCell>
                      <TableCell>{v.email ?? "—"}</TableCell>
                      <TableCell>
                        <StatusPill tone={v.active ? "success" : "neutral"}>
                          {v.active ? "Ativo" : "Inativo"}
                        </StatusPill>
                      </TableCell>
                      {canManage ? (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-md border-zinc-300 bg-white"
                              onClick={() => openEdit(v)}
                            >
                              <PenLine className="size-4" />
                              Editar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-md border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
                              onClick={() => handleDelete(v)}
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
            <DialogTitle>{editing ? "Editar veterinário" : "Novo veterinário"}</DialogTitle>
            <DialogDescription>
              {editing ? "Atualize os dados do profissional." : "Cadastre um novo veterinário."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" {...form.register("name")} />
              {form.formState.errors.name ? (
                <p className="text-xs text-rose-600">{form.formState.errors.name.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="crmv">CRMV</Label>
              <Input id="crmv" placeholder="SP-12345" {...form.register("crmv")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" {...form.register("phone")} />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...form.register("email")} />
              {form.formState.errors.email ? (
                <p className="text-xs text-rose-600">{form.formState.errors.email.message}</p>
              ) : null}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="specialties">Especialidades</Label>
              <Input
                id="specialties"
                placeholder="Cirurgia, Dermatologia, Cardiologia"
                {...form.register("specialties")}
              />
              <p className="text-xs text-zinc-500">Separe múltiplas especialidades por vírgula.</p>
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
