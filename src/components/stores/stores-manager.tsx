"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusPill } from "@/components/shared/status-pill";
import { stores as initialStores } from "@/lib/data/demo";
import { cn } from "@/lib/utils";

type StoreRecord = {
  id: string;
  name: string;
  subdomain: string;
  status: string;
  plan: string;
  owner: string;
};

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 42);
}

const emptyStore: StoreRecord = {
  id: "",
  name: "",
  subdomain: "",
  status: "Ativa",
  plan: "Profissional",
  owner: "",
};

export function StoresManager() {
  const [stores, setStores] = useState<StoreRecord[]>(initialStores);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<StoreRecord>(emptyStore);

  const isEditing = Boolean(editingId);
  const previewSubdomain = useMemo(() => form.subdomain || slugify(form.name), [form.name, form.subdomain]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyStore);
    setDialogOpen(true);
  }

  function openEdit(store: StoreRecord) {
    setEditingId(store.id);
    setForm(store);
    setDialogOpen(true);
  }

  function saveStore() {
    const subdomain = previewSubdomain;
    const nextStore = {
      ...form,
      id: editingId ?? subdomain,
      subdomain,
    };

    setStores((current) =>
      editingId ? current.map((store) => (store.id === editingId ? nextStore : store)) : [nextStore, ...current],
    );
    setDialogOpen(false);
  }

  function deleteStore(id: string) {
    setStores((current) => current.filter((store) => store.id !== id));
  }

  return (
    <>
      <div className="mb-6 flex justify-end">
        <Button className="rounded-md bg-zinc-950 text-white hover:bg-zinc-800" onClick={openCreate}>
          <Plus className="size-4" />
          Criar loja
        </Button>
      </div>

      <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-[860px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Loja</TableHead>
                  <TableHead>Subdomínio</TableHead>
                  <TableHead>Dono</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stores.map((store) => (
                  <TableRow key={store.id}>
                    <TableCell className="font-medium">{store.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {store.subdomain}.petsistem.com.br
                        <Link
                          href={`/loja/${store.subdomain}`}
                          className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "rounded-md")}
                        >
                          <ExternalLink className="size-4" />
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell>{store.owner}</TableCell>
                    <TableCell>{store.plan}</TableCell>
                    <TableCell>
                      <StatusPill
                        tone={
                          store.status === "Ativa" ? "success" : store.status === "Bloqueada" ? "danger" : "warning"
                        }
                      >
                        {store.status}
                      </StatusPill>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" className="rounded-md bg-white" onClick={() => openEdit(store)}>
                          <Pencil className="size-4" />
                          Editar
                        </Button>
                        <Button variant="outline" size="sm" className="rounded-md bg-white" onClick={() => deleteStore(store.id)}>
                          <Trash2 className="size-4" />
                          Excluir
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar loja" : "Criar loja"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Nome da loja</Label>
              <Input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                    subdomain: current.subdomain || slugify(event.target.value),
                  }))
                }
                className="rounded-md"
                placeholder="Ex: Petgres"
              />
            </div>
            <div className="space-y-2">
              <Label>Subdomínio</Label>
              <Input
                value={previewSubdomain}
                onChange={(event) => setForm((current) => ({ ...current, subdomain: slugify(event.target.value) }))}
                className="rounded-md"
                placeholder="petgres"
              />
              <p className="text-xs text-zinc-500">{previewSubdomain || "loja"}.petsistem.com.br</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Dono</Label>
                <Input
                  value={form.owner}
                  onChange={(event) => setForm((current) => ({ ...current, owner: event.target.value }))}
                  className="rounded-md"
                  placeholder="Nome do responsável"
                />
              </div>
              <div className="space-y-2">
                <Label>Plano</Label>
                <Select
                  value={form.plan}
                  onValueChange={(plan) => setForm((current) => ({ ...current, plan: plan ?? current.plan }))}
                >
                  <SelectTrigger className="rounded-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Essencial">Essencial</SelectItem>
                    <SelectItem value="Profissional">Profissional</SelectItem>
                    <SelectItem value="Enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(status) => setForm((current) => ({ ...current, status: status ?? current.status }))}
              >
                <SelectTrigger className="rounded-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ativa">Ativa</SelectItem>
                  <SelectItem value="Atrasada">Atrasada</SelectItem>
                  <SelectItem value="Bloqueada">Bloqueada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-md bg-white" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button className="rounded-md bg-zinc-950 text-white hover:bg-zinc-800" onClick={saveStore}>
              Salvar loja
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
