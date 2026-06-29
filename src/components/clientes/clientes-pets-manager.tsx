"use client";

import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronRight,
  PawPrint,
  PenLine,
  Plus,
  Search,
  Trash2,
  UserPlus,
} from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SectionHeading } from "@/components/app/section-heading";
import { EmptyState } from "@/components/shared/empty-state";
import { createClientWithPets, saveClient, deleteClient } from "@/app/app/clientes/actions";
import { savePet, deletePet } from "@/app/app/pets/actions";
import type { Database } from "@/lib/supabase/database.types";

type ClientRow = Database["public"]["Tables"]["clients"]["Row"];
type PetRow = Database["public"]["Tables"]["pets"]["Row"];
export type ClientWithPets = ClientRow & { pets: PetRow[] };

const clientFormSchema = z.object({
  name: z.string().trim().min(1, "Nome obrigatório"),
  whatsapp: z.string().trim().min(8, "WhatsApp obrigatório"),
});
type ClientFormValues = z.infer<typeof clientFormSchema>;

const petFormSchema = z.object({
  name: z.string().trim().min(1, "Nome obrigatório"),
  species: z.string().trim().min(1, "Espécie obrigatória"),
  breed: z.string().trim().optional(),
  sex: z.enum(["male", "female", "unknown"]).optional(),
  weight_kg: z.string().optional(),
  age_label: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});
type PetFormValues = z.infer<typeof petFormSchema>;

const SPECIES_OPTIONS = ["Cachorro", "Gato", "Pássaro", "Roedor", "Réptil", "Outro"];

function sexLabel(sex: string | null | undefined) {
  if (sex === "male") return "Macho";
  if (sex === "female") return "Fêmea";
  return null;
}

export function ClientesPetsManager({
  clients,
  canManage,
}: {
  clients: ClientWithPets[];
  canManage: boolean;
}) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [petCount, setPetCount] = useState(0);
  const [newPets, setNewPets] = useState<Array<{ name: string; breed: string }>>([]);

  const [clientDialog, setClientDialog] = useState<{ open: boolean; editing: ClientRow | null }>({
    open: false,
    editing: null,
  });
  const [petDialog, setPetDialog] = useState<{
    open: boolean;
    editing: PetRow | null;
    clientId: string;
    clientName: string;
  }>({ open: false, editing: null, clientId: "", clientName: "" });
  const [confirmDelete, setConfirmDelete] = useState<ClientWithPets | null>(null);

  const clientForm = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: { name: "", whatsapp: "" },
  });

  const petForm = useForm<PetFormValues>({
    resolver: zodResolver(petFormSchema),
    defaultValues: {
      name: "",
      species: "",
      breed: "",
      sex: undefined,
      weight_kg: "",
      age_label: "",
      notes: "",
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.pets.some((p) => p.name.toLowerCase().includes(q)),
    );
  }, [clients, search]);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openCreateClient() {
    clientForm.reset({ name: "", whatsapp: "" });
    setPetCount(0);
    setNewPets([]);
    setClientDialog({ open: true, editing: null });
  }

  function openEditClient(c: ClientRow) {
    clientForm.reset({
      name: c.name,
      whatsapp: c.whatsapp ?? c.phone,
    });
    setClientDialog({ open: true, editing: c });
  }

  function openCreatePet(clientId: string, clientName: string) {
    petForm.reset({
      name: "",
      species: "",
      breed: "",
      sex: undefined,
      weight_kg: "",
      age_label: "",
      notes: "",
    });
    setPetDialog({ open: true, editing: null, clientId, clientName });
    // Auto-expand parent so the new pet shows up immediately.
    setExpanded((prev) => new Set(prev).add(clientId));
  }

  function openEditPet(pet: PetRow, clientName: string) {
    petForm.reset({
      name: pet.name,
      species: pet.species,
      breed: pet.breed ?? "",
      sex:
        pet.sex === "male" || pet.sex === "female" || pet.sex === "unknown" ? pet.sex : undefined,
      weight_kg: pet.weight_kg !== null ? String(pet.weight_kg) : "",
      age_label: pet.age_label ?? "",
      notes: pet.notes ?? "",
    });
    setPetDialog({ open: true, editing: pet, clientId: pet.client_id, clientName });
  }

  function onSubmitClient(values: ClientFormValues) {
    const fd = new FormData();
    if (clientDialog.editing) fd.set("id", clientDialog.editing.id);
    fd.set("name", values.name);
    fd.set("phone", values.whatsapp);
    fd.set("whatsapp", values.whatsapp);

    startTransition(async () => {
      const result = clientDialog.editing
        ? await saveClient({ ok: false }, fd)
        : await createClientWithPets({ name: values.name, whatsapp: values.whatsapp, pets: newPets });
      if (result.ok) {
        toast.success(clientDialog.editing ? "Tutor atualizado" : "Tutor cadastrado");
        setClientDialog({ open: false, editing: null });
      } else if (result.fieldErrors) {
        for (const [key, msg] of Object.entries(result.fieldErrors)) {
          clientForm.setError(key as keyof ClientFormValues, { message: msg });
        }
      } else if (result.error) {
        toast.error(result.error);
      }
    });
  }

  function onSubmitPet(values: PetFormValues) {
    const fd = new FormData();
    if (petDialog.editing) fd.set("id", petDialog.editing.id);
    fd.set("client_id", petDialog.clientId);
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
        toast.success(petDialog.editing ? "Pet atualizado" : "Pet cadastrado");
        setPetDialog({ open: false, editing: null, clientId: "", clientName: "" });
      } else if (result.fieldErrors) {
        for (const [key, msg] of Object.entries(result.fieldErrors)) {
          petForm.setError(key as keyof PetFormValues, { message: msg });
        }
      } else if (result.error) {
        toast.error(result.error);
      }
    });
  }

  function requestDeleteClient(c: ClientWithPets) {
    // Tutors with no pets skip the modal — a single browser confirm is enough.
    // Tutors with pets get a dedicated dialog that names the cascade so the
    // operator can't blow away pet history by accident.
    if (c.pets.length === 0) {
      if (!confirm(`Excluir tutor ${c.name}?`)) return;
      runDeleteClient(c);
      return;
    }
    setConfirmDelete(c);
  }

  function runDeleteClient(c: ClientWithPets) {
    startTransition(async () => {
      const result = await deleteClient(c.id);
      if (result.ok) {
        toast.success(
          c.pets.length > 0
            ? `Tutor e ${c.pets.length} pet${c.pets.length === 1 ? "" : "s"} excluídos`
            : "Tutor excluído",
        );
        setConfirmDelete(null);
      } else {
        toast.error(result.error ?? "Erro ao excluir tutor");
      }
    });
  }

  function handleDeletePet(p: PetRow) {
    if (!confirm(`Excluir ${p.name}? O histórico fica preservado.`)) return;
    startTransition(async () => {
      const result = await deletePet(p.id);
      if (result.ok) toast.success("Pet excluído");
      else toast.error(result.error ?? "Erro ao excluir pet");
    });
  }

  return (
    <div>
      <SectionHeading
        title="Tutores & Pets"
        description="Cadastro unificado. Cada tutor pode ter vários pets — o pet pertence a um único tutor."
        action={
          canManage ? (
            <Button
              onClick={openCreateClient}
              className="rounded-md bg-zinc-950 text-white hover:bg-zinc-800"
            >
              <UserPlus className="size-4" />
              Novo tutor
            </Button>
          ) : null
        }
      />

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por tutor, telefone ou pet…"
          className="rounded-md pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
          <CardContent className="p-10">
            <EmptyState
              icon={UserPlus}
              title={search ? "Nenhum resultado" : "Sem tutores cadastrados"}
              description={
                search
                  ? "Tente outra busca."
                  : "Cadastre o primeiro tutor e depois adicione os pets dele."
              }
              action={
                canManage && !search ? (
                  <Button
                    onClick={openCreateClient}
                    className="rounded-md bg-zinc-950 text-white hover:bg-zinc-800"
                  >
                    <UserPlus className="size-4" />
                    Novo tutor
                  </Button>
                ) : null
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="max-h-[calc(100dvh-15rem)] space-y-3 overflow-y-auto overscroll-contain pr-1 pb-2">
          {filtered.map((c) => {
            const isOpen = expanded.has(c.id);
            return (
              <Card key={c.id} className="overflow-hidden rounded-lg border-zinc-200 bg-white shadow-none">
                <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <button
                    type="button"
                    onClick={() => toggle(c.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    {isOpen ? (
                      <ChevronDown className="size-4 shrink-0 text-zinc-500" />
                    ) : (
                      <ChevronRight className="size-4 shrink-0 text-zinc-500" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-950">{c.name}</p>
                      <p className="truncate text-xs text-zinc-500">
                        {c.phone}
                        {c.email ? ` · ${c.email}` : ""}
                        {" · "}
                        {c.pets.length} pet{c.pets.length === 1 ? "" : "s"}
                      </p>
                    </div>
                  </button>
                  {canManage ? (
                    <div className="flex flex-wrap gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-md border-zinc-300 bg-white"
                        onClick={() => openCreatePet(c.id, c.name)}
                        disabled={c.pets.length >= 10}
                        title={c.pets.length >= 10 ? "Limite de 10 pets atingido" : "Adicionar pet"}
                      >
                        <Plus className="size-4" />
                        {c.pets.length >= 10 ? "Limite 10" : "Pet"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-md border-zinc-300 bg-white"
                        onClick={() => openEditClient(c)}
                      >
                        <PenLine className="size-4" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-md border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
                        onClick={() => requestDeleteClient(c)}
                        disabled={pending}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ) : null}
                </div>

                {isOpen ? (
                  <div className="border-t border-zinc-100 bg-zinc-50/60 p-4">
                    {c.pets.length === 0 ? (
                      <p className="text-sm text-zinc-500">
                        Nenhum pet vinculado ainda.{" "}
                        {canManage ? (
                          <button
                            type="button"
                            className="font-medium text-zinc-900 underline underline-offset-2"
                            onClick={() => openCreatePet(c.id, c.name)}
                          >
                            Cadastrar primeiro pet
                          </button>
                        ) : null}
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {c.pets.map((p) => {
                          const sex = sexLabel(p.sex);
                          return (
                            <li
                              key={p.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-zinc-200 bg-white p-3"
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-zinc-100">
                                  <PawPrint className="size-4 text-zinc-700" />
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-zinc-950">
                                    {p.name}
                                  </p>
                                  <p className="truncate text-xs text-zinc-500">
                                    {p.species}
                                    {p.breed ? ` · ${p.breed}` : ""}
                                    {sex ? ` · ${sex}` : ""}
                                    {p.weight_kg !== null ? ` · ${p.weight_kg} kg` : ""}
                                  </p>
                                </div>
                              </div>
                              {canManage ? (
                                <div className="flex gap-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="rounded-md border-zinc-300 bg-white"
                                    onClick={() => openEditPet(p, c.name)}
                                  >
                                    <PenLine className="size-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="rounded-md border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
                                    onClick={() => handleDeletePet(p)}
                                    disabled={pending}
                                  >
                                    <Trash2 className="size-4" />
                                  </Button>
                                </div>
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}

      {/* Client dialog */}
      <Dialog
        open={clientDialog.open}
        onOpenChange={(o) => setClientDialog((s) => ({ ...s, open: o }))}
      >
        <DialogContent className="rounded-xl border-zinc-200 bg-white sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{clientDialog.editing ? "Editar tutor" : "Novo tutor"}</DialogTitle>
            <DialogDescription>
              {clientDialog.editing
                ? "Atualize os dados do tutor."
                : "Cadastre tutor e pets de uma vez."}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={clientForm.handleSubmit(onSubmitClient)}
            className="grid gap-4 sm:grid-cols-2"
          >
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="c_name">Nome</Label>
              <Input id="c_name" {...clientForm.register("name")} />
              {clientForm.formState.errors.name ? (
                <p className="text-xs text-rose-600">
                  {clientForm.formState.errors.name.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="c_whatsapp">WhatsApp</Label>
              <Input id="c_whatsapp" inputMode="tel" placeholder="(11) 99999-9999" {...clientForm.register("whatsapp")} />
              {clientForm.formState.errors.whatsapp ? (
                <p className="text-xs text-rose-600">
                  {clientForm.formState.errors.whatsapp.message}
                </p>
              ) : null}
            </div>

            {!clientDialog.editing ? <>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="c_pet_count">Quantos pets tem?</Label>
                <Input id="c_pet_count" type="number" inputMode="numeric" min={0} max={5} value={petCount} onChange={(event) => {
                  const count = Math.min(5, Math.max(0, Number(event.target.value) || 0));
                  setPetCount(count);
                  setNewPets((current) => Array.from({ length: count }, (_, index) => current[index] ?? { name: "", breed: "" }));
                }} />
              </div>
              {newPets.map((pet, index) => <div key={index} className="grid gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 sm:col-span-2 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor={`new_pet_name_${index}`}>Nome do pet {index + 1}</Label><Input id={`new_pet_name_${index}`} value={pet.name} onChange={(event) => setNewPets((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} /></div>
                <div className="space-y-2"><Label htmlFor={`new_pet_breed_${index}`}>Raça</Label><Input id={`new_pet_breed_${index}`} value={pet.breed} onChange={(event) => setNewPets((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, breed: event.target.value } : item))} /></div>
              </div>)}
            </> : null}

            <DialogFooter className="sm:col-span-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-md border-zinc-300 bg-white"
                onClick={() => setClientDialog({ open: false, editing: null })}
                disabled={pending || (!clientDialog.editing && newPets.some((pet) => !pet.name.trim() || !pet.breed.trim()))}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="rounded-md bg-zinc-950 text-white hover:bg-zinc-800"
                disabled={pending}
              >
                {pending ? "Salvando…" : clientDialog.editing ? "Salvar" : "Cadastrar tutor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Cascade-delete confirmation */}
      <Dialog
        open={confirmDelete !== null}
        onOpenChange={(o) => {
          if (!o) setConfirmDelete(null);
        }}
      >
        <DialogContent className="rounded-xl border-zinc-200 bg-white sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Excluir tutor e pets vinculados?</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita pela interface.
            </DialogDescription>
          </DialogHeader>

          {confirmDelete ? (
            <div className="space-y-3 text-sm text-zinc-700">
              <p>
                <span className="font-semibold text-zinc-950">{confirmDelete.name}</span> tem{" "}
                <span className="font-semibold text-zinc-950">
                  {confirmDelete.pets.length} pet
                  {confirmDelete.pets.length === 1 ? "" : "s"}
                </span>{" "}
                vinculado{confirmDelete.pets.length === 1 ? "" : "s"}. Excluir o tutor irá{" "}
                <span className="font-semibold text-rose-700">excluir também esses pets</span>.
              </p>
              <ul className="max-h-40 space-y-1 overflow-auto rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
                {confirmDelete.pets.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2">
                    <span className="truncate">{p.name}</span>
                    <span className="shrink-0 text-rose-700/70">{p.species}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-zinc-500">
                Agendamentos anteriores ficam preservados no histórico.
              </p>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-md border-zinc-300 bg-white"
              onClick={() => setConfirmDelete(null)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="rounded-md bg-rose-600 text-white hover:bg-rose-700"
              onClick={() => confirmDelete && runDeleteClient(confirmDelete)}
              disabled={pending}
            >
              <Trash2 className="size-4" />
              {pending ? "Excluindo…" : "Excluir tutor e pets"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pet dialog */}
      <Dialog
        open={petDialog.open}
        onOpenChange={(o) => setPetDialog((s) => ({ ...s, open: o }))}
      >
        <DialogContent className="rounded-xl border-zinc-200 bg-white sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{petDialog.editing ? "Editar pet" : "Novo pet"}</DialogTitle>
            <DialogDescription>
              Tutor: <span className="font-medium text-zinc-900">{petDialog.clientName}</span>
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={petForm.handleSubmit(onSubmitPet)}
            className="grid gap-4 sm:grid-cols-2"
          >
            <div className="space-y-2">
              <Label htmlFor="p_name">Nome</Label>
              <Input id="p_name" {...petForm.register("name")} />
              {petForm.formState.errors.name ? (
                <p className="text-xs text-rose-600">{petForm.formState.errors.name.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="p_species">Espécie</Label>
              <Select
                value={petForm.watch("species") || undefined}
                onValueChange={(v) =>
                  petForm.setValue("species", String(v ?? ""), { shouldValidate: true })
                }
              >
                <SelectTrigger id="p_species" className="rounded-md">
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
              {petForm.formState.errors.species ? (
                <p className="text-xs text-rose-600">
                  {petForm.formState.errors.species.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="p_breed">Raça</Label>
              <Input id="p_breed" {...petForm.register("breed")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="p_sex">Sexo</Label>
              <Select
                value={petForm.watch("sex") ?? undefined}
                onValueChange={(v) => {
                  const value = String(v ?? "");
                  if (value === "male" || value === "female" || value === "unknown") {
                    petForm.setValue("sex", value, { shouldValidate: true });
                  }
                }}
              >
                <SelectTrigger id="p_sex" className="rounded-md">
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
              <Label htmlFor="p_weight">Peso (kg)</Label>
              <Input id="p_weight" type="number" step="0.1" {...petForm.register("weight_kg")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="p_age">Idade</Label>
              <Input id="p_age" placeholder="2 anos" {...petForm.register("age_label")} />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="p_notes">Observações</Label>
              <Textarea id="p_notes" rows={3} {...petForm.register("notes")} />
            </div>

            <DialogFooter className="sm:col-span-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-md border-zinc-300 bg-white"
                onClick={() => setPetDialog({ open: false, editing: null, clientId: "", clientName: "" })}
                disabled={pending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="rounded-md bg-zinc-950 text-white hover:bg-zinc-800"
                disabled={pending}
              >
                {pending ? "Salvando…" : petDialog.editing ? "Salvar" : "Cadastrar pet"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
