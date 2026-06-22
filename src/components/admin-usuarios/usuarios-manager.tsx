"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Ban,
  CheckCircle2,
  Copy,
  KeyRound,
  Mail,
  Search,
  ShieldCheck,
  Store,
  Trash2,
  User,
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { StatusPill } from "@/components/shared/status-pill";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SectionHeading } from "@/components/app/section-heading";
import {
  deleteUser,
  getUserMemberships,
  resetUserPassword,
  setMembershipStatus,
  type MembershipDetail,
} from "@/app/admin-master/usuarios/actions";

export type UserRow = {
  id: string;
  email: string;
  full_name: string;
  global_role: string;
  created_at: string;
  memberships: {
    role: string;
    status: string;
    petshopName: string;
  }[];
};

export type PetshopOption = { id: string; name: string };

const BR_DATE = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});

const ROLE_LABEL: Record<string, string> = {
  owner: "Dono",
  attendant: "Atendente",
  veterinarian: "Vet",
  admin_master: "Admin Master",
};

export function UsuariosManager({
  users,
  petshops,
  currentSearch,
  currentPetshopId,
}: {
  users: UserRow[];
  petshops: PetshopOption[];
  currentSearch: string;
  currentPetshopId: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [search, setSearch] = useState(currentSearch);
  const [drawerUser, setDrawerUser] = useState<UserRow | null>(null);
  const [memberships, setMemberships] = useState<MembershipDetail[] | null>(null);
  const [membershipsLoading, setMembershipsLoading] = useState(false);
  const [resetDialog, setResetDialog] = useState<{ open: boolean; password: string }>({
    open: false,
    password: "",
  });
  const [pending, startTransition] = useTransition();

  // Persist search in URL — debounced. Pressing Enter submits immediately.
  function pushUrl(patch: { q?: string; petshop?: string }) {
    const next = new URLSearchParams(params.toString());
    if (patch.q !== undefined) {
      if (patch.q) next.set("q", patch.q);
      else next.delete("q");
    }
    if (patch.petshop !== undefined) {
      if (patch.petshop && patch.petshop !== "all") next.set("petshop", patch.petshop);
      else next.delete("petshop");
    }
    router.push(`/admin-master/usuarios?${next.toString()}`);
  }

  // Debounced search push — re-running on currentSearch/pushUrl changes would
  // create a feedback loop (every URL push would re-fire the effect). The
  // `search` state is the only legitimate trigger.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const id = setTimeout(() => {
      if (search !== currentSearch) pushUrl({ q: search });
    }, 350);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    if (!drawerUser) {
      setMemberships(null);
      return;
    }
    let cancelled = false;
    setMembershipsLoading(true);
    void getUserMemberships(drawerUser.id).then((res) => {
      if (cancelled) return;
      if (res.ok) setMemberships(res.data);
      else toast.error(res.error);
      setMembershipsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [drawerUser]);

  function handleReset(user: UserRow) {
    if (
      !confirm(
        `Gerar nova senha para ${user.email}? A senha atual deixa de funcionar imediatamente.`,
      )
    )
      return;
    startTransition(async () => {
      const result = await resetUserPassword(user.id);
      if (result.ok) {
        setResetDialog({ open: true, password: result.password });
      } else {
        toast.error(result.error ?? "Erro ao gerar senha");
      }
    });
  }

  function handleDelete(user: UserRow) {
    if (user.global_role === "admin_master") {
      toast.error("Usuários Admin Master não podem ser excluídos por esta tela.");
      return;
    }
    if (
      !confirm(
        `Excluir ${user.email}?\n\nO login e as memberships serão removidos. Os dados operacionais e de auditoria serão preservados.`,
      )
    )
      return;

    startTransition(async () => {
      const result = await deleteUser(user.id);
      if (result.ok) {
        if (result.warning) toast.warning(result.warning);
        else toast.success("Usuário excluído");
        setDrawerUser(null);
        router.refresh();
      } else {
        toast.error(result.error ?? "Erro ao excluir usuário");
      }
    });
  }

  function toggleMembership(m: MembershipDetail) {
    const next = m.status === "active" ? "blocked" : "active";
    const label = next === "blocked" ? "Bloquear" : "Reativar";
    if (!confirm(`${label} acesso a "${m.petshopName}"?`)) return;
    startTransition(async () => {
      const result = await setMembershipStatus(m.membershipId, next);
      if (result.ok) {
        toast.success(next === "blocked" ? "Membership bloqueada" : "Membership reativada");
        // Refresh drawer
        if (drawerUser) {
          const res = await getUserMemberships(drawerUser.id);
          if (res.ok) setMemberships(res.data);
        }
        router.refresh();
      } else {
        toast.error(result.error ?? "Erro");
      }
    });
  }

  async function copyPassword() {
    try {
      await navigator.clipboard.writeText(resetDialog.password);
      toast.success("Senha copiada");
    } catch {
      toast.error("Não foi possível copiar — selecione manualmente");
    }
  }

  const petshopOptions = useMemo(
    () => [{ id: "all", name: "Todas as lojas" }, ...petshops],
    [petshops],
  );

  return (
    <div>
      <SectionHeading
        title="Usuários"
        description="Todos os logins do sistema. Click numa linha pra ver memberships e resetar senha."
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Buscar por nome ou email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-md pl-9"
          />
        </div>
        <div className="min-w-[200px]">
          <select
            value={currentPetshopId || "all"}
            onChange={(e) => pushUrl({ petshop: e.target.value })}
            className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm"
          >
            {petshopOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
        <CardContent className="p-0">
          {users.length === 0 ? (
            <div className="p-10 text-center text-sm text-zinc-500">
              Nenhum usuário encontrado com esses filtros.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Memberships</TableHead>
                    <TableHead>Role global</TableHead>
                    <TableHead>Criado em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow
                      key={u.id}
                      onClick={() => setDrawerUser(u)}
                      className="cursor-pointer hover:bg-zinc-50"
                    >
                      <TableCell className="font-medium">{u.full_name}</TableCell>
                      <TableCell className="text-zinc-600">{u.email}</TableCell>
                      <TableCell>
                        {u.memberships.length === 0 ? (
                          <span className="text-xs text-zinc-400">Sem loja</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {u.memberships.slice(0, 3).map((m, i) => (
                              <span
                                key={`${m.petshopName}-${i}`}
                                className={
                                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.625rem] font-medium " +
                                  (m.status === "blocked"
                                    ? "border-rose-200 bg-rose-50 text-rose-700"
                                    : "border-zinc-200 bg-zinc-50 text-zinc-700")
                                }
                              >
                                {m.petshopName} · {ROLE_LABEL[m.role] ?? m.role}
                              </span>
                            ))}
                            {u.memberships.length > 3 ? (
                              <span className="text-xs text-zinc-500">
                                +{u.memberships.length - 3}
                              </span>
                            ) : null}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {u.global_role === "admin_master" ? (
                          <StatusPill tone="danger">
                            <ShieldCheck className="mr-1 inline size-3" />
                            Admin Master
                          </StatusPill>
                        ) : (
                          <span className="text-xs text-zinc-500">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-zinc-600">
                        {BR_DATE.format(new Date(u.created_at))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Drawer */}
      <Sheet open={drawerUser !== null} onOpenChange={(o) => !o && setDrawerUser(null)}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-y-auto bg-white p-0 sm:max-w-[480px]"
        >
          <SheetHeader className="border-b border-zinc-200 p-5">
            <SheetTitle className="text-left">{drawerUser?.full_name ?? ""}</SheetTitle>
            {drawerUser ? (
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Mail className="size-3.5" />
                <span>{drawerUser.email}</span>
              </div>
            ) : null}
          </SheetHeader>

          {drawerUser ? (
            <div className="space-y-4 p-5">
              {drawerUser.global_role === "admin_master" ? (
                <div className="flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
                  <ShieldCheck className="size-4" />
                  Este usuário é Admin Master.
                </div>
              ) : null}

              <div>
                <p className="mb-2 text-xs font-medium text-zinc-700">
                  Memberships
                </p>
                {membershipsLoading ? (
                  <p className="text-sm text-zinc-500">Carregando…</p>
                ) : memberships && memberships.length > 0 ? (
                  <ul className="space-y-2">
                    {memberships.map((m) => (
                      <li
                        key={m.membershipId}
                        className="flex items-center gap-3 rounded-md border border-zinc-200 bg-white p-3"
                      >
                        <Store className="size-4 text-zinc-500" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-zinc-950">
                            {m.petshopName}
                          </p>
                          <p className="font-mono text-[0.625rem] text-zinc-500">
                            {m.petshopSubdomain}
                          </p>
                        </div>
                        <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[0.625rem] font-medium text-zinc-700">
                          {ROLE_LABEL[m.role] ?? m.role}
                        </span>
                        <StatusPill tone={m.status === "active" ? "success" : "danger"}>
                          {m.status === "active" ? "Ativa" : "Bloqueada"}
                        </StatusPill>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleMembership(m)}
                          disabled={pending}
                          className={
                            "rounded-md bg-white " +
                            (m.status === "active"
                              ? "border-rose-200 text-rose-700 hover:bg-rose-50"
                              : "border-emerald-200 text-emerald-700 hover:bg-emerald-50")
                          }
                        >
                          {m.status === "active" ? (
                            <Ban className="size-3.5" />
                          ) : (
                            <CheckCircle2 className="size-3.5" />
                          )}
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-zinc-500">
                    Sem memberships ativas.
                  </p>
                )}
              </div>

              <div className="border-t border-zinc-100 pt-4">
                <Button
                  onClick={() => handleReset(drawerUser)}
                  disabled={pending}
                  variant="outline"
                  className="w-full rounded-md border-amber-200 bg-white text-amber-800 hover:bg-amber-50"
                >
                  <KeyRound className="size-4" />
                  Resetar senha
                </Button>
                <p className="mt-2 text-[0.6875rem] text-zinc-500">
                  Gera uma senha nova aleatória. Você precisa entregar pro usuário —
                  ela só aparece uma vez.
                </p>
              </div>

              {drawerUser.global_role !== "admin_master" ? (
                <div className="border-t border-zinc-100 pt-4">
                  <Button
                    onClick={() => handleDelete(drawerUser)}
                    disabled={pending}
                    variant="outline"
                    className="w-full rounded-md border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
                  >
                    <Trash2 className="size-4" />
                    Excluir usuário
                  </Button>
                  <p className="mt-2 text-[0.6875rem] text-zinc-500">
                    Remove o login e as memberships. Dados operacionais e auditoria são
                    preservados.
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Reset password dialog (one-time reveal) */}
      <Dialog
        open={resetDialog.open}
        onOpenChange={(o) => !o && setResetDialog({ open: false, password: "" })}
      >
        <DialogContent className="rounded-xl border-zinc-200 bg-white sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Nova senha gerada</DialogTitle>
            <DialogDescription>
              Anote ou copie agora. Essa senha não vai aparecer de novo.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-3">
            <code className="flex-1 break-all font-mono text-base text-zinc-950">
              {resetDialog.password}
            </code>
            <Button
              type="button"
              variant="outline"
              className="rounded-md border-zinc-300 bg-white"
              onClick={copyPassword}
            >
              <Copy className="size-4" />
              Copiar
            </Button>
          </div>
          <DialogFooter>
            <Button
              type="button"
              className="rounded-md bg-zinc-950 text-white hover:bg-zinc-800"
              onClick={() => setResetDialog({ open: false, password: "" })}
            >
              <User className="size-4" />
              Já anotei
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
