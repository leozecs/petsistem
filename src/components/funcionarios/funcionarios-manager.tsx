"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { PenLine, Plus, Trash2, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusPill } from "@/components/shared/status-pill";
import { SectionHeading } from "@/components/app/section-heading";
import { deleteEmployee, saveEmployee } from "@/app/app/funcionarios/actions";
import type { Database } from "@/lib/supabase/database.types";

type EmployeeRow = Database["public"]["Tables"]["employees"]["Row"];

const employeeFormSchema = z.object({
  name: z.string().trim().min(1, "Nome obrigatório"),
  job_title: z.string().trim().min(1, "Cargo obrigatório"),
  phone: z.string().trim().optional(),
  email: z.string().trim().email("Email inválido").optional().or(z.literal("")),
  role: z.enum(["owner", "attendant", "veterinarian"]),
  active: z.boolean(),
});

type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

const emptyValues: EmployeeFormValues = {
  name: "",
  job_title: "",
  phone: "",
  email: "",
  role: "attendant",
  active: true,
};

function roleLabel(role: string) {
  if (role === "owner") return "Dono";
  if (role === "attendant") return "Atendente";
  if (role === "veterinarian") return "Veterinário";
  return role;
}

export function FuncionariosManager({
  initialEmployees,
  canManage,
}: {
  initialEmployees: EmployeeRow[];
  canManage: boolean;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EmployeeRow | null>(null);
  const [pending, startTransition] = useTransition();

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: emptyValues,
  });

  function openCreate() {
    setEditing(null);
    form.reset(emptyValues);
    setDialogOpen(true);
  }

  function openEdit(emp: EmployeeRow) {
    setEditing(emp);
    form.reset({
      name: emp.name,
      job_title: emp.job_title,
      phone: emp.phone ?? "",
      email: emp.email ?? "",
      role: emp.role,
      active: emp.active,
    });
    setDialogOpen(true);
  }

  async function onSubmit(values: EmployeeFormValues) {
    const fd = new FormData();
    if (editing) fd.set("id", editing.id);
    fd.set("name", values.name);
    fd.set("job_title", values.job_title);
    fd.set("phone", values.phone ?? "");
    fd.set("email", values.email ?? "");
    fd.set("role", values.role);
    fd.set("active", String(values.active));

    startTransition(async () => {
      const result = await saveEmployee({ ok: false }, fd);
      if (result.ok) {
        toast.success(editing ? "Funcionário atualizado" : "Funcionário cadastrado");
        setDialogOpen(false);
      } else if (result.fieldErrors) {
        for (const [key, msg] of Object.entries(result.fieldErrors)) {
          form.setError(key as keyof EmployeeFormValues, { message: msg });
        }
      } else if (result.error) {
        toast.error(result.error);
      }
    });
  }

  function handleDelete(emp: EmployeeRow) {
    if (!confirm(`Excluir ${emp.name}? O histórico fica preservado.`)) return;
    startTransition(async () => {
      const result = await deleteEmployee(emp.id);
      if (result.ok) toast.success("Funcionário excluído");
      else toast.error(result.error ?? "Erro ao excluir");
    });
  }

  return (
    <div>
      <SectionHeading
        title="Funcionários"
        description="Equipe operacional da loja com cargo, role e contato."
        action={
          canManage ? (
            <Button onClick={openCreate} className="rounded-md bg-zinc-950 text-white hover:bg-zinc-800">
              <Plus className="size-4" />
              Novo funcionário
            </Button>
          ) : null
        }
      />

      <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
        <CardContent className="p-0">
          {initialEmployees.length === 0 ? (
            <div className="p-10">
              <EmptyState
                icon={UserCog}
                title="Sem funcionários ainda"
                description="Cadastre seu primeiro membro da equipe com cargo e role."
                action={
                  canManage ? (
                    <Button onClick={openCreate} className="rounded-md bg-zinc-950 text-white hover:bg-zinc-800">
                      <Plus className="size-4" />
                      Novo funcionário
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
                    <TableHead>Cargo</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    {canManage ? <TableHead className="text-right">Ações</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {initialEmployees.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.name}</TableCell>
                      <TableCell>{e.job_title}</TableCell>
                      <TableCell>{roleLabel(e.role)}</TableCell>
                      <TableCell>{e.phone ?? "—"}</TableCell>
                      <TableCell>{e.email ?? "—"}</TableCell>
                      <TableCell>
                        <StatusPill tone={e.active ? "success" : "neutral"}>
                          {e.active ? "Ativo" : "Inativo"}
                        </StatusPill>
                      </TableCell>
                      {canManage ? (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-md border-zinc-300 bg-white"
                              onClick={() => openEdit(e)}
                            >
                              <PenLine className="size-4" />
                              Editar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-md border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
                              onClick={() => handleDelete(e)}
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
            <DialogTitle>{editing ? "Editar funcionário" : "Novo funcionário"}</DialogTitle>
            <DialogDescription>
              {editing ? "Atualize os dados do funcionário." : "Cadastre um novo membro da equipe."}
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
              <Label htmlFor="job_title">Cargo</Label>
              <Input id="job_title" placeholder="Tosador, gerente, recepcionista" {...form.register("job_title")} />
              {form.formState.errors.job_title ? (
                <p className="text-xs text-rose-600">{form.formState.errors.job_title.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={form.watch("role")}
                onValueChange={(v) => form.setValue("role", v as EmployeeFormValues["role"], { shouldValidate: true })}
              >
                <SelectTrigger id="role" className="rounded-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Dono</SelectItem>
                  <SelectItem value="attendant">Atendente</SelectItem>
                  <SelectItem value="veterinarian">Veterinário</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" {...form.register("phone")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...form.register("email")} />
              {form.formState.errors.email ? (
                <p className="text-xs text-rose-600">{form.formState.errors.email.message}</p>
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
