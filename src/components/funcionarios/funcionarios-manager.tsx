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
  Trash2,
  TrendingUp,
  UserCog,
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  createEmployeeWithLogin,
  createVeterinarianWithLogin,
  deleteEmployee,
  getEmployeeMonthSummary,
  saveEmployee,
  type EmployeeMonthSummary,
} from "@/app/app/funcionarios/actions";
import type { Database } from "@/lib/supabase/database.types";

type EmployeeRow = Database["public"]["Tables"]["employees"]["Row"];
type VeterinarianRow = Database["public"]["Tables"]["veterinarians"]["Row"];
type TeamProfile = "attendant" | "veterinarian";
type TeamRow =
  | (EmployeeRow & { profile: "attendant"; displayRole: "attendant"; crmv?: null; specialties?: string[] })
  | (VeterinarianRow & { profile: "veterinarian"; displayRole: "veterinarian"; job_title: string; role: "veterinarian" });

// ----- create -----
const createFormSchema = z
  .object({
    name: z.string().trim().min(2, "Nome muito curto"),
    profile: z.enum(["attendant", "veterinarian"]),
    job_title: z.string().trim().optional(),
    crmv: z.string().trim().optional(),
    specialties: z.string().trim().optional(),
    phone: z.string().trim().optional(),
    email: z.string().trim().email("Email inválido"),
    password: z.string().min(8, "Senha precisa de pelo menos 8 caracteres"),
    confirm: z.string().min(8, "Confirme a senha"),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "As senhas não conferem",
  })
  .refine((v) => v.profile === "veterinarian" || Boolean(v.job_title?.trim()), {
    path: ["job_title"],
    message: "Cargo obrigatório",
  })
  .refine((v) => v.profile === "attendant" || Boolean(v.crmv?.trim()), {
    path: ["crmv"],
    message: "CRMV obrigatório",
  });
type CreateValues = z.infer<typeof createFormSchema>;

// ----- edit -----
const editFormSchema = z.object({
  name: z.string().trim().min(1, "Nome obrigatório"),
  profile: z.enum(["attendant", "veterinarian"]),
  job_title: z.string().trim().optional(),
  crmv: z.string().trim().optional(),
  specialties: z.string().trim().optional(),
  phone: z.string().trim().optional(),
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

function roleLabel(role: string) {
  if (role === "owner") return "Dono";
  if (role === "attendant") return "Atendente";
  if (role === "veterinarian") return "Veterinário";
  return role;
}

export function FuncionariosManager({
  initialEmployees,
  initialVeterinarians = [],
  initialProfile = "attendant",
}: {
  initialEmployees: EmployeeRow[];
  initialVeterinarians?: VeterinarianRow[];
  initialProfile?: TeamProfile;
}) {
  const teamRows: TeamRow[] = [
    ...initialEmployees.map((employee) => ({
      ...employee,
      profile: "attendant" as const,
      displayRole: "attendant" as const,
      crmv: null,
      specialties: [],
    })),
    ...initialVeterinarians.map((vet) => ({
      ...vet,
      profile: "veterinarian" as const,
      displayRole: "veterinarian" as const,
      job_title: "Veterinário",
      role: "veterinarian" as const,
    })),
  ].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<TeamRow | null>(null);
  const [drawerEmp, setDrawerEmp] = useState<TeamRow | null>(null);
  const [summary, setSummary] = useState<EmployeeMonthSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [pending, startTransition] = useTransition();

  const createForm = useForm<CreateValues>({
    resolver: zodResolver(createFormSchema),
    defaultValues: {
      name: "",
      profile: initialProfile,
      job_title: "",
      crmv: "",
      specialties: "",
      phone: "",
      email: "",
      password: "",
      confirm: "",
    },
  });

  const editForm = useForm<EditValues>({
    resolver: zodResolver(editFormSchema),
    defaultValues: { name: "", profile: "attendant", job_title: "", crmv: "", specialties: "", phone: "", active: true },
  });
  const createProfile = createForm.watch("profile");
  const editProfile = editForm.watch("profile");

  // Whenever the drawer opens for a different employee, fetch their summary.
  useEffect(() => {
    if (!drawerEmp) {
      setSummary(null);
      return;
    }
    if (drawerEmp.profile === "veterinarian") {
      setSummary(null);
      setSummaryLoading(false);
      return;
    }
    let cancelled = false;
    setSummaryLoading(true);
    void getEmployeeMonthSummary(drawerEmp.id).then((res) => {
      if (cancelled) return;
      if (res.ok) setSummary(res.data);
      else toast.error(res.error);
      setSummaryLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [drawerEmp]);

  function openCreate() {
    createForm.reset({
      name: "",
      profile: initialProfile,
      job_title: "",
      crmv: "",
      specialties: "",
      phone: "",
      email: "",
      password: "",
      confirm: "",
    });
    setCreateOpen(true);
  }

  function openEdit(emp: TeamRow) {
    setEditing(emp);
    editForm.reset({
      name: emp.name,
      profile: emp.profile,
      job_title: emp.job_title,
      crmv: emp.profile === "veterinarian" ? emp.crmv ?? "" : "",
      specialties: emp.profile === "veterinarian" ? emp.specialties.join(", ") : "",
      phone: emp.phone ?? "",
      active: emp.active,
    });
    setEditOpen(true);
  }

  function onSubmitCreate(values: CreateValues) {
    const fd = new FormData();
    fd.set("profile", values.profile);
    fd.set("name", values.name);
    fd.set("job_title", values.job_title ?? "");
    fd.set("crmv", values.crmv ?? "");
    fd.set("specialties", values.specialties ?? "");
    fd.set("phone", values.phone ?? "");
    fd.set("email", values.email);
    fd.set("password", values.password);

    startTransition(async () => {
      const result =
        values.profile === "veterinarian"
          ? await createVeterinarianWithLogin(fd)
          : await createEmployeeWithLogin(fd);
      if (result.ok) {
        toast.success(values.profile === "veterinarian" ? "Veterinário cadastrado · login criado" : "Funcionário cadastrado · login criado");
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
    fd.set("profile", values.profile);
    fd.set("name", values.name);
    fd.set("job_title", values.job_title ?? "");
    fd.set("crmv", values.crmv ?? "");
    fd.set("specialties", values.specialties ?? "");
    fd.set("phone", values.phone ?? "");
    fd.set("active", String(values.active));

    startTransition(async () => {
      const result = await saveEmployee({ ok: false }, fd);
      if (result.ok) {
        toast.success("Equipe atualizada");
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

  function handleDelete(emp: TeamRow) {
    if (!confirm(`Excluir ${emp.name}? O login fica suspenso, histórico preservado.`)) return;
    startTransition(async () => {
      const result = await deleteEmployee(emp.id, emp.profile);
      if (result.ok) {
        toast.success("Membro excluído · login suspenso");
        setDrawerEmp(null);
      } else {
        toast.error(result.error ?? "Erro");
      }
    });
  }

  return (
    <div>
      <SectionHeading
        title="Funcionários"
        description="Equipe operacional e veterinária. Ao cadastrar, criamos login com perfil correto."
        action={
          <Button
            onClick={openCreate}
            className="rounded-md bg-zinc-950 text-white hover:bg-zinc-800"
          >
            <Plus className="size-4" />
            Novo membro
          </Button>
        }
      />

      <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
        <CardContent className="p-0">
          {teamRows.length === 0 ? (
            <div className="p-10">
              <EmptyState
                icon={UserCog}
                title="Sem equipe ainda"
                description="Cadastre atendentes ou veterinários com login próprio."
                action={
                  <Button
                    onClick={openCreate}
                    className="rounded-md bg-zinc-950 text-white hover:bg-zinc-800"
                  >
                    <Plus className="size-4" />
                    Novo membro
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
                    <TableHead>Cargo</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Email (login)</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamRows.map((e) => (
                    <TableRow
                      key={`${e.profile}-${e.id}`}
                      onClick={() => setDrawerEmp(e)}
                      className="cursor-pointer hover:bg-zinc-50"
                    >
                      <TableCell className="font-medium">{e.name}</TableCell>
                      <TableCell>{e.job_title}</TableCell>
                      <TableCell>{roleLabel(e.role)}</TableCell>
                      <TableCell className="text-zinc-600">{e.email ?? "—"}</TableCell>
                      <TableCell>{e.phone ?? "—"}</TableCell>
                      <TableCell>
                        <StatusPill tone={e.active ? "success" : "neutral"}>
                          {e.active ? "Ativo" : "Inativo"}
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

      {/* Drawer lateral com detalhes/atendimentos do mês */}
      <Sheet open={drawerEmp !== null} onOpenChange={(o) => !o && setDrawerEmp(null)}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-y-auto bg-white p-0 sm:max-w-[480px]"
        >
          <SheetHeader className="border-b border-zinc-200 p-5">
            <SheetTitle className="text-left">
              {drawerEmp?.name ?? ""}
            </SheetTitle>
            {drawerEmp ? (
              <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                <span>{drawerEmp.job_title}</span>
                <span>·</span>
                <span>{roleLabel(drawerEmp.role)}</span>
                <span className="ml-auto">
                  <StatusPill tone={drawerEmp.active ? "success" : "neutral"}>
                    {drawerEmp.active ? "Ativo" : "Inativo"}
                  </StatusPill>
                </span>
              </div>
            ) : null}
          </SheetHeader>

          {drawerEmp ? (
            <div className="space-y-4 p-5">
              <div className="grid gap-2 text-sm text-zinc-700">
                {drawerEmp.email ? (
                  <div className="flex items-center gap-2">
                    <Mail className="size-3.5 text-zinc-500" />
                    <span>{drawerEmp.email}</span>
                  </div>
                ) : null}
                {drawerEmp.phone ? (
                  <div className="flex items-center gap-2">
                    <Phone className="size-3.5 text-zinc-500" />
                    <span>{drawerEmp.phone}</span>
                  </div>
                ) : null}
                {drawerEmp.user_id ? (
                  <div className="flex items-center gap-2 text-emerald-700">
                    <KeyRound className="size-3.5" />
                    <span>Login ativo · role {roleLabel(drawerEmp.displayRole)}</span>
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
                  onClick={() => openEdit(drawerEmp)}
                  variant="outline"
                  className="flex-1 rounded-md border-zinc-300 bg-white"
                >
                  <PenLine className="size-4" />
                  Editar
                </Button>
                <Button
                  onClick={() => handleDelete(drawerEmp)}
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
        <DialogContent className="rounded-xl border-zinc-200 bg-white sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Novo membro da equipe</DialogTitle>
            <DialogDescription>
              Escolha Atendente ou Veterinário. Login nasce com o perfil correto.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={createForm.handleSubmit(onSubmitCreate)}
            className="grid gap-4 sm:grid-cols-2"
          >
            <div className="space-y-2 sm:col-span-2">
              <Label>Perfil</Label>
              <Select
                value={createProfile}
                onValueChange={(value) =>
                  createForm.setValue("profile", value as TeamProfile, { shouldValidate: true })
                }
              >
                <SelectTrigger className="rounded-md">
                  <SelectValue placeholder="Perfil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="attendant">Atendente</SelectItem>
                  <SelectItem value="veterinarian">Veterinário</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="c_name">Nome</Label>
              <Input id="c_name" {...createForm.register("name")} />
              {createForm.formState.errors.name ? (
                <p className="text-xs text-rose-600">
                  {createForm.formState.errors.name.message}
                </p>
              ) : null}
            </div>

            {createProfile === "veterinarian" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="c_crmv">CRMV</Label>
                  <Input id="c_crmv" placeholder="CRMV-SP 00000" {...createForm.register("crmv")} />
                  {createForm.formState.errors.crmv ? (
                    <p className="text-xs text-rose-600">
                      {createForm.formState.errors.crmv.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c_specialties">Especialidades</Label>
                  <Input id="c_specialties" placeholder="Clínica, dermatologia" {...createForm.register("specialties")} />
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="c_job">Cargo</Label>
                <Input
                  id="c_job"
                  placeholder="Tosador, recepcionista"
                  {...createForm.register("job_title")}
                />
                {createForm.formState.errors.job_title ? (
                  <p className="text-xs text-rose-600">
                    {createForm.formState.errors.job_title.message}
                  </p>
                ) : null}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="c_phone">Telefone</Label>
              <Input id="c_phone" {...createForm.register("phone")} />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="c_email">Email (login)</Label>
              <Input
                id="c_email"
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
              <Label htmlFor="c_pwd">Senha</Label>
              <Input
                id="c_pwd"
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
              <Label htmlFor="c_pwd2">Confirmar senha</Label>
              <Input
                id="c_pwd2"
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
        <DialogContent className="rounded-xl border-zinc-200 bg-white sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Editar equipe</DialogTitle>
            <DialogDescription>
              Edita os dados cadastrais. Email e senha do login não são alterados aqui.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={editForm.handleSubmit(onSubmitEdit)}
            className="grid gap-4 sm:grid-cols-2"
          >
            <input type="hidden" {...editForm.register("profile")} />
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="e_name">Nome</Label>
              <Input id="e_name" {...editForm.register("name")} />
              {editForm.formState.errors.name ? (
                <p className="text-xs text-rose-600">
                  {editForm.formState.errors.name.message}
                </p>
              ) : null}
            </div>

            {editProfile === "veterinarian" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="e_crmv">CRMV</Label>
                  <Input id="e_crmv" {...editForm.register("crmv")} />
                  {editForm.formState.errors.crmv ? (
                    <p className="text-xs text-rose-600">
                      {editForm.formState.errors.crmv.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="e_specialties">Especialidades</Label>
                  <Input id="e_specialties" {...editForm.register("specialties")} />
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="e_job">Cargo</Label>
                <Input id="e_job" {...editForm.register("job_title")} />
                {editForm.formState.errors.job_title ? (
                  <p className="text-xs text-rose-600">
                    {editForm.formState.errors.job_title.message}
                  </p>
                ) : null}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="e_phone">Telefone</Label>
              <Input id="e_phone" {...editForm.register("phone")} />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label
                htmlFor="e_active"
                className="flex items-center justify-between gap-3 rounded-md border border-zinc-200 p-3"
              >
                <span>
                  Ativo
                  <span className="ml-2 text-xs text-zinc-500">
                    (suspende o login se desativar)
                  </span>
                </span>
                <Switch
                  id="e_active"
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
