"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Ban,
  CalendarCheck,
  CheckCircle2,
  ExternalLink,
  Globe,
  KeyRound,
  Mail,
  MapPin,
  PenLine,
  Plus,
  Store,
  Trash2,
  TrendingUp,
  User as UserIcon,
  Users as UsersIcon,
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusPill } from "@/components/shared/status-pill";
import { SectionHeading } from "@/components/app/section-heading";
import {
  createPetshopWithOwner,
  getPetshopMetrics,
  savePetshop,
  permanentlyDeletePetshop,
  setPetshopStatus,
  type PetshopMetrics,
} from "@/app/admin-master/lojas/actions";
import type { Database } from "@/lib/supabase/database.types";

type PetshopRow = Database["public"]["Tables"]["petshops"]["Row"];
type PetshopStatus = Database["public"]["Enums"]["petshop_status"];

const ROOT_DOMAIN =
  process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "petsistem.com.br";

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

const createSchema = z
  .object({
    name: z.string().trim().min(2, "Nome obrigatório"),
    subdomain: z
      .string()
      .trim()
      .toLowerCase()
      .min(2, "Subdomínio muito curto")
      .regex(/^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/, "Apenas letras, números e hífen"),
    address: z.string().trim().optional(),
    ownerName: z.string().trim().min(2, "Nome do dono obrigatório"),
    ownerEmail: z.string().trim().email("Email inválido"),
    ownerPassword: z.string().min(8, "Senha precisa de pelo menos 8 caracteres"),
    confirmPassword: z.string().min(8, "Confirme a senha"),
  })
  .refine((v) => v.ownerPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas não conferem",
  });
type CreateValues = z.infer<typeof createSchema>;

const editSchema = z.object({
  name: z.string().trim().min(2),
  subdomain: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .regex(/^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/, "Apenas letras, números e hífen"),
  address: z.string().trim().optional(),
});
type EditValues = z.infer<typeof editSchema>;

const STATUS_LABEL: Record<PetshopStatus, string> = {
  active: "Ativa",
  blocked: "Bloqueada",
  trial: "Teste",
  cancelled: "Cancelada",
};

function statusTone(s: PetshopStatus): "success" | "warning" | "danger" | "neutral" {
  if (s === "active") return "success";
  if (s === "trial") return "warning";
  if (s === "blocked") return "danger";
  return "neutral";
}

const BR_DATE = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function LojasManager({
  initialPetshops,
}: {
  initialPetshops: PetshopRow[];
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<PetshopRow | null>(null);
  const [drawerShop, setDrawerShop] = useState<PetshopRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PetshopRow | null>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  const [metrics, setMetrics] = useState<PetshopMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [pending, startTransition] = useTransition();

  const createForm = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      name: "",
      subdomain: "",
      address: "",
      ownerName: "",
      ownerEmail: "",
      ownerPassword: "",
      confirmPassword: "",
    },
  });

  const editForm = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { name: "", subdomain: "", address: "" },
  });

  const watchedName = createForm.watch("name");
  const watchedSubdomain = createForm.watch("subdomain");

  // Auto-suggest the subdomain whenever the loja name changes AND the user
  // hasn't manually edited the subdomain field yet (touched flag).
  useEffect(() => {
    if (!watchedName) return;
    const touched = createForm.getFieldState("subdomain").isDirty;
    if (touched) return;
    createForm.setValue("subdomain", slugify(watchedName));
  }, [watchedName, createForm]);

  useEffect(() => {
    if (!drawerShop) {
      setMetrics(null);
      return;
    }
    let cancelled = false;
    setMetricsLoading(true);
    void getPetshopMetrics(drawerShop.id).then((res) => {
      if (cancelled) return;
      if (res.ok) setMetrics(res.data);
      else toast.error(res.error);
      setMetricsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [drawerShop]);

  function openCreate() {
    createForm.reset({
      name: "",
      subdomain: "",
      address: "",
      ownerName: "",
      ownerEmail: "",
      ownerPassword: "",
      confirmPassword: "",
    });
    setCreateOpen(true);
  }

  function openEdit(p: PetshopRow) {
    setEditing(p);
    editForm.reset({
      name: p.name,
      subdomain: p.subdomain,
      address: p.address ?? "",
    });
    setEditOpen(true);
  }

  function onSubmitCreate(values: CreateValues) {
    const fd = new FormData();
    fd.set("name", values.name);
    fd.set("subdomain", values.subdomain);
    fd.set("address", values.address ?? "");
    fd.set("ownerName", values.ownerName);
    fd.set("ownerEmail", values.ownerEmail);
    fd.set("ownerPassword", values.ownerPassword);

    startTransition(async () => {
      const result = await createPetshopWithOwner(fd);
      if (result.ok) {
        toast.success("Loja cadastrada · login do dono criado");
        setCreateOpen(false);
        router.refresh();
      } else if (result.fieldErrors) {
        for (const [k, msg] of Object.entries(result.fieldErrors)) {
          createForm.setError(k as keyof CreateValues, { message: msg });
        }
      } else {
        toast.error(result.error ?? "Erro");
      }
    });
  }

  function onSubmitEdit(values: EditValues) {
    if (!editing) return;
    if (values.subdomain !== editing.subdomain) {
      if (!confirm("Mudar subdomínio quebra links antigos. Confirma?")) return;
    }
    const fd = new FormData();
    fd.set("id", editing.id);
    fd.set("name", values.name);
    fd.set("subdomain", values.subdomain);
    fd.set("address", values.address ?? "");
    startTransition(async () => {
      const result = await savePetshop(fd);
      if (result.ok) {
        toast.success("Loja atualizada");
        setEditOpen(false);
        router.refresh();
      } else if (result.fieldErrors) {
        for (const [k, msg] of Object.entries(result.fieldErrors)) {
          editForm.setError(k as keyof EditValues, { message: msg });
        }
      } else {
        toast.error(result.error ?? "Erro");
      }
    });
  }

  function handlePermanentDelete() {
    if (!deleteTarget) return;
    if (deleteConfirmInput.trim().toLowerCase() !== deleteTarget.slug) {
      toast.error(`Digite exatamente "${deleteTarget.slug}" pra confirmar.`);
      return;
    }
    startTransition(async () => {
      const result = await permanentlyDeletePetshop({
        id: deleteTarget.id,
        confirm_slug: deleteTarget.slug,
      });
      if (result.ok) {
        toast.success(`Loja "${deleteTarget.name}" excluída permanentemente.`);
        setDeleteTarget(null);
        setDeleteConfirmInput("");
        setDrawerShop(null);
        router.refresh();
      } else {
        toast.error(result.error ?? "Erro ao excluir loja.");
      }
    });
  }

  function toggleStatus(p: PetshopRow) {
    const next: PetshopStatus = p.status === "active" ? "blocked" : "active";
    const label = next === "blocked" ? "Bloquear" : "Reativar";
    if (!confirm(`${label} ${p.name}?`)) return;
    startTransition(async () => {
      const result = await setPetshopStatus(p.id, next);
      if (result.ok) {
        toast.success(next === "blocked" ? "Loja bloqueada" : "Loja reativada");
        setDrawerShop(null);
        router.refresh();
      } else {
        toast.error(result.error ?? "Erro");
      }
    });
  }

  return (
    <div>
      <SectionHeading
        title="Lojas"
        description="Cadastre, edite e bloqueie tenants da plataforma. Cada loja vira um subdomínio próprio."
        action={
          <Button
            onClick={openCreate}
            className="rounded-md bg-zinc-950 text-white hover:bg-zinc-800"
          >
            <Plus className="size-4" />
            Nova loja
          </Button>
        }
      />

      <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
        <CardContent className="p-0">
          {initialPetshops.length === 0 ? (
            <div className="p-10">
              <EmptyState
                icon={Store}
                title="Sem lojas cadastradas"
                description="Crie a primeira loja e provisione o login do dono."
                action={
                  <Button
                    onClick={openCreate}
                    className="rounded-md bg-zinc-950 text-white hover:bg-zinc-800"
                  >
                    <Plus className="size-4" />
                    Nova loja
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[860px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Loja</TableHead>
                    <TableHead>Subdomínio</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criada em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {initialPetshops.map((p) => (
                    <TableRow
                      key={p.id}
                      onClick={() => setDrawerShop(p)}
                      className="cursor-pointer hover:bg-zinc-50"
                    >
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>
                        <span className="font-mono text-xs text-zinc-700">
                          {p.subdomain}.{ROOT_DOMAIN}
                        </span>
                      </TableCell>
                      <TableCell>{p.plan_name}</TableCell>
                      <TableCell>
                        <StatusPill tone={statusTone(p.status)}>
                          {STATUS_LABEL[p.status]}
                        </StatusPill>
                      </TableCell>
                      <TableCell className="text-zinc-600">
                        {BR_DATE.format(new Date(p.created_at))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Drawer lateral */}
      <Sheet open={drawerShop !== null} onOpenChange={(o) => !o && setDrawerShop(null)}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-y-auto bg-white p-0 sm:max-w-[480px]"
        >
          <SheetHeader className="border-b border-zinc-200 p-5">
            <SheetTitle className="text-left">{drawerShop?.name ?? ""}</SheetTitle>
            {drawerShop ? (
              <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                <span>{drawerShop.plan_name}</span>
                <span>·</span>
                <span>{BR_DATE.format(new Date(drawerShop.created_at))}</span>
                <span className="ml-auto">
                  <StatusPill tone={statusTone(drawerShop.status)}>
                    {STATUS_LABEL[drawerShop.status]}
                  </StatusPill>
                </span>
              </div>
            ) : null}
          </SheetHeader>

          {drawerShop ? (
            <div className="space-y-4 p-5">
              <div className="space-y-2 text-sm text-zinc-700">
                <div className="flex items-center gap-2">
                  <Globe className="size-3.5 text-zinc-500" />
                  <a
                    href={`https://${drawerShop.subdomain}.${ROOT_DOMAIN}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs underline underline-offset-2 hover:text-zinc-950"
                  >
                    {drawerShop.subdomain}.{ROOT_DOMAIN}
                  </a>
                  <ExternalLink className="size-3 text-zinc-400" />
                </div>
                {drawerShop.address ? (
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 size-3.5 text-zinc-500" />
                    <span className="whitespace-pre-wrap">{drawerShop.address}</span>
                  </div>
                ) : null}
                {metrics?.ownerName ? (
                  <div className="flex items-center gap-2">
                    <UserIcon className="size-3.5 text-zinc-500" />
                    <span>
                      Dono: <span className="font-medium">{metrics.ownerName}</span>
                    </span>
                  </div>
                ) : null}
                {metrics?.ownerEmail ? (
                  <div className="flex items-center gap-2">
                    <Mail className="size-3.5 text-zinc-500" />
                    <span>{metrics.ownerEmail}</span>
                  </div>
                ) : null}
              </div>

              {metricsLoading ? (
                <p className="text-sm text-zinc-500">Carregando métricas…</p>
              ) : metrics ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-1 text-[0.625rem] uppercase text-zinc-500">
                        <UsersIcon className="size-3" />
                        Usuários
                      </div>
                      <p className="mt-1 text-lg font-semibold text-zinc-950">
                        {metrics.usersCount}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-1 text-[0.625rem] uppercase text-zinc-500">
                        <CalendarCheck className="size-3" />
                        Agend. mês
                      </div>
                      <p className="mt-1 text-lg font-semibold text-zinc-950">
                        {metrics.monthAppointments}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-1 text-[0.625rem] uppercase text-zinc-500">
                        <TrendingUp className="size-3 text-emerald-600" />
                        Receita mês
                      </div>
                      <p className="mt-1 text-lg font-semibold text-zinc-950">
                        {formatBRL(metrics.monthRevenueCents)}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              ) : null}

              <div className="flex gap-2 border-t border-zinc-100 pt-4">
                <Button
                  onClick={() => openEdit(drawerShop)}
                  variant="outline"
                  className="flex-1 rounded-md border-zinc-300 bg-white"
                >
                  <PenLine className="size-4" />
                  Editar
                </Button>
                <Button
                  onClick={() => toggleStatus(drawerShop)}
                  variant="outline"
                  disabled={pending}
                  className={
                    "flex-1 rounded-md bg-white " +
                    (drawerShop.status === "active"
                      ? "border-rose-200 text-rose-700 hover:bg-rose-50"
                      : "border-emerald-200 text-emerald-700 hover:bg-emerald-50")
                  }
                >
                  {drawerShop.status === "active" ? (
                    <>
                      <Ban className="size-4" />
                      Bloquear
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-4" />
                      Reativar
                    </>
                  )}
                </Button>
              </div>

              <div className="rounded-md border border-rose-200 bg-rose-50 p-3">
                <p className="text-xs font-semibold text-rose-900">
                  Zona de perigo
                </p>
                <p className="mt-1 text-xs text-rose-800">
                  Excluir a loja apaga PERMANENTEMENTE clientes, pets,
                  agendamentos, financeiro, fotos e usuários da loja. Não tem
                  como desfazer. Use só se a loja não vai voltar.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() => {
                    setDeleteTarget(drawerShop);
                    setDeleteConfirmInput("");
                  }}
                  className="mt-3 w-full rounded-md border-rose-300 bg-white text-rose-700 hover:bg-rose-100"
                >
                  <Trash2 className="size-4" />
                  Excluir permanentemente
                </Button>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(o) => {
          if (!o) {
            setDeleteTarget(null);
            setDeleteConfirmInput("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-rose-700">
              Excluir loja permanentemente
            </DialogTitle>
            <DialogDescription>
              Essa ação é irreversível. Apaga clientes, pets, agendamentos,
              financeiro, fotos e remove o vínculo de todos os usuários da loja.
            </DialogDescription>
          </DialogHeader>
          {deleteTarget ? (
            <div className="space-y-3">
              <p className="text-sm text-zinc-700">
                Pra confirmar, digite o slug da loja:{" "}
                <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-zinc-900">
                  {deleteTarget.slug}
                </code>
              </p>
              <Input
                autoFocus
                value={deleteConfirmInput}
                onChange={(e) => setDeleteConfirmInput(e.target.value)}
                placeholder={deleteTarget.slug}
                disabled={pending}
                className="font-mono"
              />
            </div>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDeleteTarget(null);
                setDeleteConfirmInput("");
              }}
              disabled={pending}
              className="rounded-md border-zinc-300 bg-white"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handlePermanentDelete}
              disabled={
                pending ||
                !deleteTarget ||
                deleteConfirmInput.trim().toLowerCase() !== deleteTarget.slug
              }
              className="rounded-md bg-rose-700 text-white hover:bg-rose-800 disabled:opacity-60"
            >
              <Trash2 className="size-4" />
              {pending ? "Excluindo…" : "Excluir agora"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-xl border-zinc-200 bg-white sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Nova loja</DialogTitle>
            <DialogDescription>
              Criamos a loja, o subdomínio e o login do dono numa só ação.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={createForm.handleSubmit(onSubmitCreate)}
            className="grid gap-4 sm:grid-cols-2"
          >
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="lc_name">Nome da loja</Label>
              <Input id="lc_name" {...createForm.register("name")} />
              {createForm.formState.errors.name ? (
                <p className="text-xs text-rose-600">
                  {createForm.formState.errors.name.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="lc_sub">Subdomínio</Label>
              <Input id="lc_sub" {...createForm.register("subdomain")} />
              <p className="font-mono text-xs text-zinc-500">
                {watchedSubdomain || "(loja)"}.{ROOT_DOMAIN}
              </p>
              {createForm.formState.errors.subdomain ? (
                <p className="text-xs text-rose-600">
                  {createForm.formState.errors.subdomain.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="lc_addr">Endereço</Label>
              <Textarea
                id="lc_addr"
                rows={2}
                placeholder="Rua, número, bairro, cidade — UF, CEP"
                {...createForm.register("address")}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <div className="flex items-center gap-2 rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
                <KeyRound className="size-3.5" />
                Login do dono (role <strong>owner</strong>)
              </div>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="lc_owner">Nome do dono</Label>
              <Input id="lc_owner" {...createForm.register("ownerName")} />
              {createForm.formState.errors.ownerName ? (
                <p className="text-xs text-rose-600">
                  {createForm.formState.errors.ownerName.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="lc_email">Email do dono</Label>
              <Input
                id="lc_email"
                type="email"
                autoComplete="off"
                {...createForm.register("ownerEmail")}
              />
              {createForm.formState.errors.ownerEmail ? (
                <p className="text-xs text-rose-600">
                  {createForm.formState.errors.ownerEmail.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lc_pwd">Senha</Label>
              <Input
                id="lc_pwd"
                type="password"
                autoComplete="new-password"
                {...createForm.register("ownerPassword")}
              />
              {createForm.formState.errors.ownerPassword ? (
                <p className="text-xs text-rose-600">
                  {createForm.formState.errors.ownerPassword.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lc_pwd2">Confirmar senha</Label>
              <Input
                id="lc_pwd2"
                type="password"
                autoComplete="new-password"
                {...createForm.register("confirmPassword")}
              />
              {createForm.formState.errors.confirmPassword ? (
                <p className="text-xs text-rose-600">
                  {createForm.formState.errors.confirmPassword.message}
                </p>
              ) : null}
            </div>

            <DialogFooter className="sm:col-span-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-md border-zinc-300 bg-white"
                onClick={() => setCreateOpen(false)}
                disabled={pending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="rounded-md bg-zinc-950 text-white hover:bg-zinc-800"
                disabled={pending}
              >
                {pending ? "Provisionando…" : "Cadastrar loja + login"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="rounded-xl border-zinc-200 bg-white sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Editar loja</DialogTitle>
            <DialogDescription>
              Atualiza dados cadastrais. Login do dono não é mexido aqui.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={editForm.handleSubmit(onSubmitEdit)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="le_name">Nome</Label>
              <Input id="le_name" {...editForm.register("name")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="le_sub">Subdomínio</Label>
              <Input id="le_sub" {...editForm.register("subdomain")} />
              <p className="font-mono text-xs text-zinc-500">
                {editForm.watch("subdomain") || "(loja)"}.{ROOT_DOMAIN}
              </p>
              {editForm.formState.errors.subdomain ? (
                <p className="text-xs text-rose-600">
                  {editForm.formState.errors.subdomain.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="le_addr">Endereço</Label>
              <Textarea id="le_addr" rows={2} {...editForm.register("address")} />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="rounded-md border-zinc-300 bg-white"
                onClick={() => setEditOpen(false)}
                disabled={pending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="rounded-md bg-zinc-950 text-white hover:bg-zinc-800"
                disabled={pending}
              >
                {pending ? "Salvando…" : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
