"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { PawPrint, PenLine, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionHeading } from "@/components/app/section-heading";
import { deletePet, savePet } from "@/app/app/pets/actions";
import type { Database } from "@/lib/supabase/database.types";

type PetRow = Database["public"]["Tables"]["pets"]["Row"];
type ClientRow = Pick<
  Database["public"]["Tables"]["clients"]["Row"],
  "id" | "name"
>;

const petFormSchema = z.object({
  client_id: z.string().uuid("Tutor obrigatório"),
  name: z.string().trim().min(1, "Nome obrigatório"),
  species: z.string().trim().min(1, "Espécie obrigatória"),
  breed: z.string().trim().optional(),
  sex: z.enum(["male", "female", "unknown"]).optional(),
  weight_kg: z.string().optional(),
  age_label: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

type PetFormValues = z.infer<typeof petFormSchema>;

const emptyValues: PetFormValues = {
  client_id: "",
  name: "",
  species: "",
  breed: "",
  sex: undefined,
  weight_kg: "",
  age_label: "",
  notes: "",
};

const SPECIES_OPTIONS = ["Cachorro", "Gato", "Pássaro", "Roedor", "Réptil", "Outro"];

function sexLabel(sex: string | null | undefined) {
  if (sex === "male") return "Macho";
  if (sex === "female") return "Fêmea";
  return "—";
}

export function PetsManager({
  initialPets,
  clientsForSelect,
  canManage,
}: {
  initialPets: (PetRow & { client?: { id: string; name: string } | null })[];
  clientsForSelect: ClientRow[];
  canManage: boolean;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PetRow | null>(null);
  const [pending, startTransition] = useTransition();

  const form = useForm<PetFormValues>({
    resolver: zodResolver(petFormSchema),
    defaultValues: emptyValues,
  });

  function openCreate() {
    setEditing(null);
    form.reset(emptyValues);
    setDialogOpen(true);
  }

  function openEdit(pet: PetRow) {
    setEditing(pet);
    form.reset({
      client_id: pet.client_id,
      name: pet.name,
      species: pet.species,
      breed: pet.breed ?? "",
      sex: (pet.sex === "male" || pet.sex === "female" || pet.sex === "unknown") ? pet.sex : undefined,
      weight_kg: pet.weight_kg !== null ? String(pet.weight_kg) : "",
      age_label: pet.age_label ?? "",
      notes: pet.notes ?? "",
    });
    setDialogOpen(true);
  }

  async function onSubmit(values: PetFormValues) {
    const fd = new FormData();
    if (editing) fd.set("id", editing.id);
    fd.set("client_id", values.client_id);
    fd.set("name", values.name);
    fd.set("species", values.species);
    fd.set("breed", values.breed ?? "");
    fd.set("sex", values.sex ?? "");
    fd.set("weight_kg", values.weight_kg ?? "");
    fd.set("age_label", values.age_label ?? "");
    fd.set("notes", values.notes ?? "");

    startTransition(async () => {
      const result = await savePet({ ok: false }, fd);
      if (result.ok) {
        toast.success(editing ? "Pet atualizado" : "Pet cadastrado");
        setDialogOpen(false);
      } else if (result.fieldErrors) {
        for (const [key, msg] of Object.entries(result.fieldErrors)) {
          form.setError(key as keyof PetFormValues, { message: msg });
        }
      } else if (result.error) {
        toast.error(result.error);
      }
    });
  }

  function handleDelete(pet: PetRow) {
    if (!confirm(`Excluir ${pet.name}? O histórico fica preservado.`)) return;
    startTransition(async () => {
      const result = await deletePet(pet.id);
      if (result.ok) {
        toast.success("Pet excluído");
      } else {
        toast.error(result.error ?? "Erro ao excluir pet");
      }
    });
  }

  const noClients = clientsForSelect.length === 0;

  return (
    <div>
      <SectionHeading
        title="Pets"
        description="Cadastro de pets vinculados aos tutores. Cada atendimento gera histórico no perfil."
        action={
          canManage ? (
            <Button
              onClick={openCreate}
              disabled={noClients}
              className="rounded-md bg-zinc-950 text-white hover:bg-zinc-800"
            >
              <Plus className="size-4" />
              Novo pet
            </Button>
          ) : null
        }
      />

      {noClients ? (
        <Card className="rounded-lg border-amber-200 bg-amber-50 shadow-none">
          <CardContent className="p-4 text-sm text-amber-900">
            Cadastre um tutor primeiro em <a className="font-semibold underline" href="/app/clientes">Clientes</a> antes de adicionar pets.
          </CardContent>
        </Card>
      ) : null}

      <Card className="mt-4 rounded-lg border-zinc-200 bg-white shadow-none">
        <CardContent className="p-0">
          {initialPets.length === 0 ? (
            <div className="p-10">
              <EmptyState
                icon={PawPrint}
                title="Sem pets ainda"
                description="Cadastre o primeiro pet vinculando ao tutor."
                action={
                  canManage && !noClients ? (
                    <Button onClick={openCreate} className="rounded-md bg-zinc-950 text-white hover:bg-zinc-800">
                      <Plus className="size-4" />
                      Novo pet
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
                    <TableHead>Pet</TableHead>
                    <TableHead>Espécie</TableHead>
                    <TableHead>Raça</TableHead>
                    <TableHead>Sexo</TableHead>
                    <TableHead>Peso</TableHead>
                    <TableHead>Tutor</TableHead>
                    {canManage ? <TableHead className="text-right">Ações</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {initialPets.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{p.species}</TableCell>
                      <TableCell>{p.breed ?? "—"}</TableCell>
                      <TableCell>{sexLabel(p.sex)}</TableCell>
                      <TableCell>{p.weight_kg !== null ? `${p.weight_kg} kg` : "—"}</TableCell>
                      <TableCell>{p.client?.name ?? "—"}</TableCell>
                      {canManage ? (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-md border-zinc-300 bg-white"
                              onClick={() => openEdit(p)}
                            >
                              <PenLine className="size-4" />
                              Editar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-md border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
                              onClick={() => handleDelete(p)}
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
        <DialogContent className="rounded-xl border-zinc-200 bg-white sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar pet" : "Novo pet"}</DialogTitle>
            <DialogDescription>
              {editing ? "Atualize os dados do pet." : "Cadastre um novo pet vinculado ao tutor."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="client_id">Tutor</Label>
              <Select
                value={form.watch("client_id") || undefined}
                onValueChange={(v) =>
                  form.setValue("client_id", String(v ?? ""), { shouldValidate: true })
                }
              >
                <SelectTrigger id="client_id" className="rounded-md">
                  <SelectValue placeholder="Selecione o tutor" />
                </SelectTrigger>
                <SelectContent>
                  {clientsForSelect.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.client_id ? (
                <p className="text-xs text-rose-600">{form.formState.errors.client_id.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" {...form.register("name")} />
              {form.formState.errors.name ? (
                <p className="text-xs text-rose-600">{form.formState.errors.name.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="species">Espécie</Label>
              <Select
                value={form.watch("species") || undefined}
                onValueChange={(v) =>
                  form.setValue("species", String(v ?? ""), { shouldValidate: true })
                }
              >
                <SelectTrigger id="species" className="rounded-md">
                  <SelectValue placeholder="Espécie" />
                </SelectTrigger>
                <SelectContent>
                  {SPECIES_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.species ? (
                <p className="text-xs text-rose-600">{form.formState.errors.species.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="breed">Raça</Label>
              <Input id="breed" {...form.register("breed")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sex">Sexo</Label>
              <Select
                value={form.watch("sex") ?? undefined}
                onValueChange={(v) => {
                  const value = String(v ?? "");
                  if (value === "male" || value === "female" || value === "unknown") {
                    form.setValue("sex", value, { shouldValidate: true });
                  }
                }}
              >
                <SelectTrigger id="sex" className="rounded-md">
                  <SelectValue placeholder="Sexo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Macho</SelectItem>
                  <SelectItem value="female">Fêmea</SelectItem>
                  <SelectItem value="unknown">Não informado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight_kg">Peso (kg)</Label>
              <Input id="weight_kg" type="number" step="0.1" {...form.register("weight_kg")} />
              {form.formState.errors.weight_kg ? (
                <p className="text-xs text-rose-600">{form.formState.errors.weight_kg.message}</p>
              ) : null}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="age_label">Idade (texto livre)</Label>
              <Input id="age_label" placeholder="2 anos, 6 meses" {...form.register("age_label")} />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">Observações</Label>
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
