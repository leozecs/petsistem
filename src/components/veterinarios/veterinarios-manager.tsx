"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  CheckCircle2,
  KeyRound,
  Mail,
  PawPrint,
  PenLine,
  Phone,
  Plus,
  Stethoscope,
  Trash2,
  TrendingUp,
  Wallet,
  XCircle,
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
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
  createVeterinarianWithLogin,
  deleteVeterinarian,
  getVeterinarianMonthSummary,
  saveVeterinarian,
  type VetMonthSummary,
} from "@/app/app/veterinarios/actions";
import type { Database } from "@/lib/supabase/database.types";

type VetRow = Database["public"]["Tables"]["veterinarians"]["Row"];

const createFormSchema = z
  .object({
    name: z.string().trim().min(2, "Nome muito curto"),
    crmv: z.string().trim().min(1, "CRMV obrigatório"),
    phone: z.string().trim().optional(),
    email: z.string().trim().email("Email inválido"),
    password: z.string().min(8, "Senha precisa de pelo menos 8 caracteres"),
    confirm: z.string().min(8, "Confirme a senha"),
    specialties: z.string().trim().optional(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "As senhas não conferem",
  });
type CreateValues = z.infer<typeof createFormSchema>;

const editFormSchema = z.object({
  name: z.string().trim().min(1, "Nome obrigatório"),
  crmv: z.string().trim().min(1, "CRMV obrigatório"),
  phone: z.string().trim().optional(),
  specialties: z.string().trim().optional(),
  active: z.boolean(),
});
type EditValues = z.infer<typeof editFormSchema>;

const HHMM = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "America/Sao_Paulo",
});

const SHORT_DATE = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "America/Sao_Paulo",
});

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function VeterinariosManager({
  initialVets,
}: {
  initialVets: VetRow[];
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<VetRow | null>(null);
  const [drawerVet, setDrawerVet] = useState<VetRow | null>(null);
  const [summary, setSummary] = useState<VetMonthSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [pending, startTransition] = useTransition();

  const createForm = useForm<CreateValues>({
    resolver: zodResolver(createFormSchema),
    defaultValues: {
      name: "",
      crmv: "",
      phone: "",
      email: "",
      password: "",
      confirm: "",
      specialties: "",
    },
  });

  const editForm = useForm<EditValues>({
    resolver: zodResolver(editFormSchema),
    defaultValues: {
      name: "",
      crmv: "",
      phone: "",
      specialties: "",
      active: true,
    },
  });

  useEffect(() => {
    if (!drawerVet) {
      setSummary(null);
      return;
    }
    let cancelled = false;
    setSummaryLoading(true);
    void getVeterinarianMonthSummary(drawerVet.id).then((res) => {
      if (cancelled) return;
      if (res.ok) setSummary(res.data);
      else toast.error(res.error);
      setSummaryLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [drawerVet]);

  function openCreate() {
    createForm.reset({
      name: "",
      crmv: "",
      phone: "",
      email: "",
      password: "",
      confirm: "",
      specialties: "",
    });
    setCreateOpen(true);
  }

  function openEdit(v: VetRow) {
    setEditing(v);
    editForm.reset({
      name: v.name,
      crmv: v.crmv ?? "",
      phone: v.phone ?? "",
      specialties: (v.specialties ?? []).join(", "),
      active: v.active,
    });
    setEditOpen(true);
  }

  function onSubmitCreate(values: CreateValues) {
    const fd = new FormData();
    fd.set("name", values.name);
    fd.set("crmv", values.crmv);
    fd.set("phone", values.phone ?? "");
    fd.set("email", values.email);
    fd.set("password", values.password);
    fd.set("specialties", values.specialties ?? "");

    startTransition(async () => {
      const result = await createVeterinarianWithLogin(fd);
      if (result.ok) {
        toast.success("Veterinário cadastrado · login criado");
        setCreateOpen(false);
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
    const fd = new FormData();
    fd.set("id", editing.id);
    fd.set("name", values.name);
    fd.set("crmv", values.crmv);
    fd.set("phone", values.phone ?? "");
    fd.set("specialties", values.specialties ?? "");
    fd.set("active", String(values.active));

    startTransition(async () => {
      const result = await saveVeterinarian({ ok: false }, fd);
      if (result.ok) {
        toast.success("Veterinário atualizado");
        setEditOpen(false);
      } else if (result.fieldErrors) {
        for (const [k, msg] of Object.entries(result.fieldErrors)) {
          editForm.setError(k as keyof EditValues, { message: msg });
        }
      } else {
        toast.error(result.error ?? "Erro");
      }
    });
  }

  function handleDelete(v: VetRow) {
    if (!confirm(`Excluir ${v.name}? Login suspenso, histórico preservado.`)) return;
    startTransition(async () => {
      const result = await deleteVeterinarian(v.id);
      if (result.ok) {
        toast.success("Veterinário excluído · login suspenso");
        setDrawerVet(null);
      } else {
        toast.error(result.error ?? "Erro");
      }
    });
  }

  return (
    <div>
      <SectionHeading
        title="Veterinários"
        description="Equipe clínica. Ao cadastrar, criamos automaticamente um login com role veterinário."
        action={
          <Button
            onClick={openCreate}
            className="rounded-md bg-zinc-950 text-white hover:bg-zinc-800"
          >
            <Plus className="size-4" />
            Novo veterinário
          </Button>
        }
      />

      <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
        <CardContent className="p-0">
          {initialVets.length === 0 ? (
            <div className="p-10">
              <EmptyState
                icon={Stethoscope}
                title="Sem veterinários ainda"
                description="Cadastre seu primeiro veterinário e ele já recebe um login."
                action={
                  <Button
                    onClick={openCreate}
                    className="rounded-md bg-zinc-950 text-white hover:bg-zinc-800"
                  >
                    <Plus className="size-4" />
                    Novo veterinário
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[760px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CRMV</TableHead>
                    <TableHead>Especialidades</TableHead>
                    <TableHead>Email (login)</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {initialVets.map((v) => (
                    <TableRow
                      key={v.id}
                      onClick={() => setDrawerVet(v)}
                      className="cursor-pointer hover:bg-zinc-50"
                    >
                      <TableCell className="font-medium">{v.name}</TableCell>
                      <TableCell>{v.crmv ?? "—"}</TableCell>
                      <TableCell className="text-zinc-600">
                        {(v.specialties ?? []).length > 0
                          ? v.specialties.join(", ")
                          : "—"}
                      </TableCell>
                      <TableCell className="text-zinc-600">{v.email ?? "—"}</TableCell>
                      <TableCell>{v.phone ?? "—"}</TableCell>
                      <TableCell>
                        <StatusPill tone={v.active ? "success" : "neutral"}>
                          {v.active ? "Ativo" : "Inativo"}
                        </StatusPill>
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
      <Sheet open={drawerVet !== null} onOpenChange={(o) => !o && setDrawerVet(null)}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-y-auto bg-white p-0 sm:max-w-[480px]"
        >
          <SheetHeader className="border-b border-zinc-200 p-5">
            <SheetTitle className="text-left">{drawerVet?.name ?? ""}</SheetTitle>
            {drawerVet ? (
              <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                <span>CRMV {drawerVet.crmv ?? "—"}</span>
                <span>·</span>
                <span>Veterinário</span>
                <span className="ml-auto">
                  <StatusPill tone={drawerVet.active ? "success" : "neutral"}>
                    {drawerVet.active ? "Ativo" : "Inativo"}
                  </StatusPill>
                </span>
              </div>
            ) : null}
          </SheetHeader>

          {drawerVet ? (
            <div className="space-y-4 p-5">
              <div className="grid gap-2 text-sm text-zinc-700">
                {drawerVet.email ? (
                  <div className="flex items-center gap-2">
                    <Mail className="size-3.5 text-zinc-500" />
                    <span>{drawerVet.email}</span>
                  </div>
                ) : null}
                {drawerVet.phone ? (
                  <div className="flex items-center gap-2">
                    <Phone className="size-3.5 text-zinc-500" />
                    <span>{drawerVet.phone}</span>
                  </div>
                ) : null}
                {(drawerVet.specialties ?? []).length > 0 ? (
                  <div className="flex flex-wrap items-center gap-1">
                    <Stethoscope className="size-3.5 text-zinc-500" />
                    {drawerVet.specialties.map((s) => (
                      <span
                        key={s}
                        className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-700"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                ) : null}
                {drawerVet.user_id ? (
                  <div className="flex items-center gap-2 text-emerald-700">
                    <KeyRound className="size-3.5" />
                    <span>Login ativo · role veterinário</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-amber-700">
                    <KeyRound className="size-3.5" />
                    <span>Sem login vinculado</span>
                  </div>
                )}
              </div>

              {summaryLoading ? (
                <p className="text-sm text-zinc-500">Carregando atendimentos…</p>
              ) : summary ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-1 text-[0.625rem] uppercase text-zinc-500">
                          <PawPrint className="size-3" />
                          Atendimentos
                        </div>
                        <p className="mt-1 text-lg font-semibold text-zinc-950">
                          {summary.total}
                        </p>
                        <p className="text-[0.625rem] text-zinc-500">
                          {summary.finished} finalizados
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-1 text-[0.625rem] uppercase text-zinc-500">
                          <TrendingUp className="size-3 text-emerald-600" />
                          Recebido
                        </div>
                        <p className="mt-1 text-lg font-semibold text-zinc-950">
                          {formatBRL(summary.revenueCents)}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-1 text-[0.625rem] uppercase text-zinc-500">
                          <Wallet className="size-3 text-amber-600" />
                          A receber
                        </div>
                        <p className="mt-1 text-lg font-semibold text-zinc-950">
                          {formatBRL(summary.pendingCents)}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-medium text-zinc-700">
                      Últimos atendimentos do mês
                    </p>
                    {summary.appointments.length === 0 ? (
                      <p className="text-sm text-zinc-500">
                        Nenhum atendimento neste mês.
                      </p>
                    ) : (
                      <ul className="divide-y divide-zinc-100">
                        {summary.appointments.map((a) => (
                          <li
                            key={a.id}
                            className="flex items-center gap-3 py-2 text-xs"
                          >
                            <span className="font-mono text-zinc-700">
                              {SHORT_DATE.format(new Date(a.startIso))}{" "}
                              {HHMM.format(new Date(a.startIso))}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium text-zinc-900">
                                {a.serviceName ?? "Serviço"}
                              </p>
                              <p className="truncate text-zinc-500">
                                {a.petName ?? a.tutorName ?? "—"}
                              </p>
                            </div>
                            {a.priceCents !== null ? (
                              <span
                                className={
                                  "shrink-0 font-semibold " +
                                  (a.paid ? "text-emerald-700" : "text-zinc-600")
                                }
                              >
                                {formatBRL(a.priceCents)}
                              </span>
                            ) : null}
                            {a.status === "finished" ? (
                              <CheckCircle2 className="size-3 text-emerald-600" />
                            ) : a.status === "cancelled" || a.status === "no_show" ? (
                              <XCircle className="size-3 text-rose-500" />
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              ) : null}

              <div className="flex gap-2 border-t border-zinc-100 pt-4">
                <Button
                  onClick={() => openEdit(drawerVet)}
                  variant="outline"
                  className="flex-1 rounded-md border-zinc-300 bg-white"
                >
                  <PenLine className="size-4" />
                  Editar
                </Button>
                <Button
                  onClick={() => handleDelete(drawerVet)}
                  variant="outline"
                  disabled={pending}
                  className="flex-1 rounded-md border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
                >
                  <Trash2 className="size-4" />
                  Excluir
                </Button>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="rounded-xl border-zinc-200 bg-white sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Novo veterinário</DialogTitle>
            <DialogDescription>
              Ao salvar criamos um login (role veterinário) com email + senha definidos.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={createForm.handleSubmit(onSubmitCreate)}
            className="grid gap-4 sm:grid-cols-2"
          >
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="vc_name">Nome</Label>
              <Input id="vc_name" {...createForm.register("name")} />
              {createForm.formState.errors.name ? (
                <p className="text-xs text-rose-600">
                  {createForm.formState.errors.name.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="vc_crmv">CRMV</Label>
              <Input
                id="vc_crmv"
                placeholder="SP-12345"
                {...createForm.register("crmv")}
              />
              {createForm.formState.errors.crmv ? (
                <p className="text-xs text-rose-600">
                  {createForm.formState.errors.crmv.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="vc_phone">Telefone</Label>
              <Input id="vc_phone" {...createForm.register("phone")} />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="vc_specs">Especialidades</Label>
              <Input
                id="vc_specs"
                placeholder="Clínica geral, dermatologia, ortopedia"
                {...createForm.register("specialties")}
              />
              <p className="text-xs text-zinc-500">Separe por vírgula.</p>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="vc_email">Email (login)</Label>
              <Input
                id="vc_email"
                type="email"
                autoComplete="off"
                {...createForm.register("email")}
              />
              {createForm.formState.errors.email ? (
                <p className="text-xs text-rose-600">
                  {createForm.formState.errors.email.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="vc_pwd">Senha</Label>
              <Input
                id="vc_pwd"
                type="password"
                autoComplete="new-password"
                {...createForm.register("password")}
              />
              {createForm.formState.errors.password ? (
                <p className="text-xs text-rose-600">
                  {createForm.formState.errors.password.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="vc_pwd2">Confirmar senha</Label>
              <Input
                id="vc_pwd2"
                type="password"
                autoComplete="new-password"
                {...createForm.register("confirm")}
              />
              {createForm.formState.errors.confirm ? (
                <p className="text-xs text-rose-600">
                  {createForm.formState.errors.confirm.message}
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
                {pending ? "Cadastrando…" : "Cadastrar + criar login"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="rounded-xl border-zinc-200 bg-white sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Editar veterinário</DialogTitle>
            <DialogDescription>
              Edita os dados cadastrais. Email e senha do login não mudam aqui.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={editForm.handleSubmit(onSubmitEdit)}
            className="grid gap-4 sm:grid-cols-2"
          >
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="ve_name">Nome</Label>
              <Input id="ve_name" {...editForm.register("name")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ve_crmv">CRMV</Label>
              <Input id="ve_crmv" {...editForm.register("crmv")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ve_phone">Telefone</Label>
              <Input id="ve_phone" {...editForm.register("phone")} />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="ve_specs">Especialidades</Label>
              <Input id="ve_specs" {...editForm.register("specialties")} />
              <p className="text-xs text-zinc-500">Separe por vírgula.</p>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label
                htmlFor="ve_active"
                className="flex items-center justify-between gap-3 rounded-md border border-zinc-200 p-3"
              >
                <span>
                  Ativo
                  <span className="ml-2 text-xs text-zinc-500">
                    (suspende login se desativar)
                  </span>
                </span>
                <Switch
                  id="ve_active"
                  checked={editForm.watch("active")}
                  onCheckedChange={(v) =>
                    editForm.setValue("active", v, { shouldValidate: true })
                  }
                />
              </Label>
            </div>

            <DialogFooter className="sm:col-span-2">
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
