"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { PenLine, Plus, Trash2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionHeading } from "@/components/app/section-heading";
import { deleteClient, saveClient } from "@/app/app/clientes/actions";
import type { Database } from "@/lib/supabase/database.types";

type ClientRow = Database["public"]["Tables"]["clients"]["Row"];

const clientFormSchema = z.object({
  name: z.string().trim().min(1, "Nome obrigatório"),
  phone: z.string().trim().min(1, "Telefone obrigatório"),
  whatsapp: z.string().trim().optional(),
  email: z.string().trim().email("Email inválido").optional().or(z.literal("")),
  address: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

const emptyValues: ClientFormValues = {
  name: "",
  phone: "",
  whatsapp: "",
  email: "",
  address: "",
  notes: "",
};

export function ClientesManager({
  initialClients,
  canManage,
}: {
  initialClients: ClientRow[];
  canManage: boolean;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ClientRow | null>(null);
  const [pending, startTransition] = useTransition();

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: emptyValues,
  });

  function openCreate() {
    setEditing(null);
    form.reset(emptyValues);
    setDialogOpen(true);
  }

  function openEdit(client: ClientRow) {
    setEditing(client);
    form.reset({
      name: client.name,
      phone: client.phone,
      whatsapp: client.whatsapp ?? "",
      email: client.email ?? "",
      address: client.address ?? "",
      notes: client.notes ?? "",
    });
    setDialogOpen(true);
  }

  async function onSubmit(values: ClientFormValues) {
    const fd = new FormData();
    if (editing) fd.set("id", editing.id);
    fd.set("name", values.name);
    fd.set("phone", values.phone);
    fd.set("whatsapp", values.whatsapp ?? "");
    fd.set("email", values.email ?? "");
    fd.set("address", values.address ?? "");
    fd.set("notes", values.notes ?? "");

    startTransition(async () => {
      const result = await saveClient({ ok: false }, fd);
      if (result.ok) {
        toast.success(editing ? "Cliente atualizado" : "Cliente cadastrado");
        setDialogOpen(false);
      } else if (result.fieldErrors) {
        for (const [key, msg] of Object.entries(result.fieldErrors)) {
          form.setError(key as keyof ClientFormValues, { message: msg });
        }
      } else if (result.error) {
        toast.error(result.error);
      }
    });
  }

  function handleDelete(client: ClientRow) {
    if (!confirm(`Excluir ${client.name}? A ação pode ser desfeita por um administrador.`)) {
      return;
    }
    startTransition(async () => {
      const result = await deleteClient(client.id);
      if (result.ok) {
        toast.success("Cliente excluído");
      } else {
        toast.error(result.error ?? "Erro ao excluir cliente");
      }
    });
  }

  return (
    <div>
      <SectionHeading
        title="Clientes"
        description="Tutores cadastrados na loja. Histórico de pets e atendimentos vinculado."
        action={
          canManage ? (
            <Button
              onClick={openCreate}
              className="rounded-md bg-zinc-950 text-white hover:bg-zinc-800"
            >
              <Plus className="size-4" />
              Novo cliente
            </Button>
          ) : null
        }
      />

      <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
        <CardContent className="p-0">
          {initialClients.length === 0 ? (
            <div className="p-10">
              <EmptyState
                icon={UserRound}
                title="Sem clientes ainda"
                description="Cadastre o primeiro tutor para começar a registrar pets e agendamentos."
                action={
                  canManage ? (
                    <Button onClick={openCreate} className="rounded-md bg-zinc-950 text-white hover:bg-zinc-800">
                      <Plus className="size-4" />
                      Novo cliente
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
                    <TableHead>Tutor</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Endereço</TableHead>
                    {canManage ? <TableHead className="text-right">Ações</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {initialClients.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-zinc-700">{c.phone}</TableCell>
                      <TableCell className="text-zinc-700">{c.whatsapp ?? "—"}</TableCell>
                      <TableCell className="text-zinc-700">{c.email ?? "—"}</TableCell>
                      <TableCell className="max-w-[260px] truncate text-zinc-700">{c.address ?? "—"}</TableCell>
                      {canManage ? (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-md border-zinc-300 bg-white"
                              onClick={() => openEdit(c)}
                            >
                              <PenLine className="size-4" />
                              Editar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-md border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
                              onClick={() => handleDelete(c)}
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
            <DialogTitle>{editing ? "Editar cliente" : "Novo cliente"}</DialogTitle>
            <DialogDescription>
              {editing ? "Atualize os dados do tutor." : "Cadastre um novo tutor para vincular pets e agendamentos."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" autoComplete="name" {...form.register("name")} />
              {form.formState.errors.name ? (
                <p className="text-xs text-rose-600">{form.formState.errors.name.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" placeholder="(19) 99999-0000" {...form.register("phone")} />
              {form.formState.errors.phone ? (
                <p className="text-xs text-rose-600">{form.formState.errors.phone.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input id="whatsapp" placeholder="(19) 99999-0000" {...form.register("whatsapp")} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
              {form.formState.errors.email ? (
                <p className="text-xs text-rose-600">{form.formState.errors.email.message}</p>
              ) : null}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="address">Endereço</Label>
              <Input id="address" autoComplete="street-address" {...form.register("address")} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea id="notes" rows={3} {...form.register("notes")} />
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
