"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle2,
  KeyRound,
  MessageCircle,
  Repeat,
  Store,
  UnlockKeyhole,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusPill } from "@/components/shared/status-pill";
import { SectionHeading } from "@/components/app/section-heading";
import {
  activateAndRecordPayment,
  changePetshopPlan,
  markSubscriptionPaidWithAmount,
} from "@/app/admin-master/assinaturas/actions";

export type SubscriptionRow = {
  petshopId: string;
  petshopName: string;
  subdomain: string;
  whatsapp: string | null;
  shopStatus: string;
  billingBlockedAt: string | null;
  planId: string | null;
  planName: string;
  subscriptionId: string | null;
  amountCents: number | null;
  billingCycle: "monthly" | "annual";
  dueDate: string | null;
  subscriptionStatus: "paid" | "pending" | "confirming" | "overdue" | "blocked" | "no_subscription";
  paymentId: string | null;
  paidAt: string | null;
  paymentStatus: string;
};

export type PlanOption = { id: string; name: string; price_cents: number };
export type MonthOption = { value: string; label: string };

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

function centsFromBRLInput(input: string): number {
  const cleaned = input.replace(/[^\d,]/g, "").replace(",", ".");
  const parsed = Number.parseFloat(cleaned);
  if (Number.isNaN(parsed) || parsed <= 0) return 0;
  return Math.round(parsed * 100);
}

function centsToInputString(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

const STATUS_LABEL: Record<string, string> = {
  paid: "Paga",
  pending: "Pendente",
  confirming: "Confirmando",
  overdue: "Em atraso",
  blocked: "Bloqueada",
  no_subscription: "Sem fatura",
  no_payment: "Sem cobrança",
};

function subStatusTone(s: string): "success" | "warning" | "danger" | "neutral" {
  if (s === "paid") return "success";
  if (s === "pending" || s === "confirming") return "warning";
  if (s === "overdue" || s === "blocked") return "danger";
  return "neutral";
}

function normalizeWhatsapp(raw: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return null;
  // Adiciona 55 (Brasil) se faltar
  return digits.startsWith("55") ? digits : `55${digits}`;
}

type WhatsDialog = {
  open: boolean;
  row: SubscriptionRow | null;
  amountStr: string;
};

type PayDialog = {
  open: boolean;
  row: SubscriptionRow | null;
  amountStr: string;
  cycle: "monthly" | "annual";
};

type ActivateDialog = {
  open: boolean;
  row: SubscriptionRow | null;
  amountStr: string;
  cycle: "monthly" | "annual";
};

type PlanDialog = { open: boolean; row: SubscriptionRow | null; planId: string };

export function AssinaturasManager({
  subscriptions,
  plans,
  monthOptions,
  currentMonth,
  currentStatus,
}: {
  subscriptions: SubscriptionRow[];
  plans: PlanOption[];
  monthOptions: MonthOption[];
  currentMonth: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [whatsDialog, setWhatsDialog] = useState<WhatsDialog>({
    open: false,
    row: null,
    amountStr: "",
  });
  const [payDialog, setPayDialog] = useState<PayDialog>({
    open: false,
    row: null,
    amountStr: "",
    cycle: "monthly",
  });
  const [activateDialog, setActivateDialog] = useState<ActivateDialog>({
    open: false,
    row: null,
    amountStr: "",
    cycle: "monthly",
  });
  const [planDialog, setPlanDialog] = useState<PlanDialog>({
    open: false,
    row: null,
    planId: "",
  });

  const totals = useMemo(() => {
    let paidInMonth = 0;
    let open = 0;
    let blocked = 0;
    for (const r of subscriptions) {
      if (r.paymentStatus === "paid" && r.paidAt) paidInMonth += r.amountCents ?? 0;
      if (r.paymentStatus === "pending" || r.paymentStatus === "confirming") {
        open += r.amountCents ?? 0;
      }
      if (r.shopStatus === "blocked") blocked++;
    }
    return { paidInMonth, open, blocked };
  }, [subscriptions]);

  function pushUrl(patch: { month?: string; status?: string }) {
    const next = new URLSearchParams(params.toString());
    if (patch.month !== undefined) {
      if (patch.month === "all") next.delete("month");
      else next.set("month", patch.month);
    }
    if (patch.status !== undefined) {
      if (patch.status === "all") next.delete("status");
      else next.set("status", patch.status);
    }
    router.push(`/admin-master/assinaturas?${next.toString()}`);
  }

  function openWhats(row: SubscriptionRow) {
    setWhatsDialog({
      open: true,
      row,
      amountStr: centsToInputString(row.amountCents ?? 0),
    });
  }

  function sendWhats() {
    const row = whatsDialog.row;
    if (!row) return;
    const cents = centsFromBRLInput(whatsDialog.amountStr);
    if (cents <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }
    const phone = normalizeWhatsapp(row.whatsapp);
    if (!phone) {
      toast.error("A loja não tem WhatsApp cadastrado.");
      return;
    }
    const valorFmt = formatBRL(cents);
    const message = `Olá ${row.petshopName}! Passando a cobrança PETSISTEM: ${valorFmt} (${row.billingCycle === "annual" ? "anual" : "mensal"}). Pague via Pix e me responda com o comprovante que eu libero seu acesso. Valeu!`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setWhatsDialog({ open: false, row: null, amountStr: "" });
  }

  function openPay(row: SubscriptionRow) {
    if (!row.subscriptionId) {
      toast.error("Sem assinatura pra marcar. Use 'Liberar login' pra criar.");
      return;
    }
    setPayDialog({
      open: true,
      row,
      amountStr: centsToInputString(row.amountCents ?? 0),
      cycle: row.billingCycle,
    });
  }

  function confirmPay() {
    const row = payDialog.row;
    if (!row?.subscriptionId) return;
    const cents = centsFromBRLInput(payDialog.amountStr);
    if (cents <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }
    const subId = row.subscriptionId;
    const cycle = payDialog.cycle;
    startTransition(async () => {
      const result = await markSubscriptionPaidWithAmount({
        subscriptionId: subId,
        amountCents: cents,
        billingCycle: cycle,
      });
      if (result.ok) {
        toast.success("Fatura marcada como paga · valor registrado no MRR");
        setPayDialog({ open: false, row: null, amountStr: "", cycle: "monthly" });
        router.refresh();
      } else {
        toast.error(result.error ?? "Erro");
      }
    });
  }

  function openActivate(row: SubscriptionRow) {
    setActivateDialog({
      open: true,
      row,
      amountStr: centsToInputString(row.amountCents ?? 0),
      cycle: row.billingCycle,
    });
  }

  function confirmActivate() {
    const row = activateDialog.row;
    if (!row) return;
    const cents = centsFromBRLInput(activateDialog.amountStr);
    if (cents <= 0) {
      toast.error("Informe o valor que foi pago.");
      return;
    }
    const petshopId = row.petshopId;
    const cycle = activateDialog.cycle;
    startTransition(async () => {
      const result = await activateAndRecordPayment({
        petshopId,
        amountCents: cents,
        billingCycle: cycle,
      });
      if (result.ok) {
        toast.success("Loja liberada e pagamento registrado no MRR e Faturamento Total");
        setActivateDialog({
          open: false,
          row: null,
          amountStr: "",
          cycle: "monthly",
        });
        router.refresh();
      } else {
        toast.error(result.error ?? "Erro");
      }
    });
  }

  function openChangePlan(row: SubscriptionRow) {
    setPlanDialog({
      open: true,
      row,
      planId: row.planId ?? plans[0]?.id ?? "",
    });
  }

  function confirmChangePlan() {
    if (!planDialog.row || !planDialog.planId) return;
    const petshopId = planDialog.row.petshopId;
    const planId = planDialog.planId;
    startTransition(async () => {
      const result = await changePetshopPlan(petshopId, planId);
      if (result.ok) {
        toast.success("Plano alterado");
        setPlanDialog({ open: false, row: null, planId: "" });
        router.refresh();
      } else {
        toast.error(result.error ?? "Erro");
      }
    });
  }

  return (
    <div>
      <SectionHeading
        title="Assinaturas"
        description="Aba unificada: cobrança + assinatura. Filtra por mês, envia WhatsApp com valor editável, marca pago com valor e libera lojas bloqueadas."
      />

      {/* Totais do mês filtrado */}
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Card className="rounded-lg border-emerald-200 bg-emerald-50/40 shadow-none">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-emerald-800">
              Recebido no filtro
            </p>
            <p className="mt-1 text-2xl font-semibold text-zinc-950">
              {formatBRL(totals.paidInMonth)}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-lg border-amber-200 bg-amber-50/40 shadow-none">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-amber-800">
              Em aberto
            </p>
            <p className="mt-1 text-2xl font-semibold text-zinc-950">
              {formatBRL(totals.open)}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-lg border-rose-200 bg-rose-50/40 shadow-none">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-rose-800">
              Bloqueadas
            </p>
            <p className="mt-1 text-2xl font-semibold text-zinc-950">
              {totals.blocked}
            </p>
            <p className="text-xs text-rose-700">Aguardando liberar login</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <div className="min-w-[200px]">
          <Label className="text-xs text-zinc-500">Mês</Label>
          <select
            value={currentMonth}
            onChange={(e) => pushUrl({ month: e.target.value })}
            className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400"
          >
            <option value="all">Todos os meses</option>
            {monthOptions.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div className="inline-flex rounded-md border border-zinc-200 bg-white p-1">
          {(["all", "blocked", "pending", "paid"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => pushUrl({ status: f })}
              className={
                "rounded-md px-3 py-1.5 text-sm font-medium transition " +
                (currentStatus === f
                  ? "bg-zinc-950 text-white"
                  : "text-zinc-600 hover:bg-zinc-100")
              }
            >
              {f === "all"
                ? "Todas"
                : f === "blocked"
                  ? "Aguardando liberar"
                  : f === "pending"
                    ? "Pendentes"
                    : "Pagas"}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela */}
      <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
        <CardContent className="p-0">
          {subscriptions.length === 0 ? (
            <div className="p-10 text-center text-sm text-zinc-500">
              Nada por aqui nesse filtro.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[980px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Loja</TableHead>
                    <TableHead>Plano · ciclo</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Pago em</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.map((r) => {
                    const needsActivation = r.shopStatus === "blocked";
                    return (
                      <TableRow key={r.petshopId}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Store className="size-4 text-zinc-500" />
                            <div className="min-w-0">
                              <p className="truncate font-medium text-zinc-950">
                                {r.petshopName}
                              </p>
                              <p className="font-mono text-[0.6875rem] text-zinc-500">
                                {r.subdomain}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{r.planName}</div>
                          <div className="text-[0.6875rem] text-zinc-500">
                            {r.billingCycle === "annual" ? "Anual" : "Mensal"}
                          </div>
                        </TableCell>
                        <TableCell>
                          {r.amountCents !== null ? formatBRL(r.amountCents) : "—"}
                        </TableCell>
                        <TableCell>
                          {r.dueDate
                            ? BR_DATE.format(new Date(`${r.dueDate}T12:00`))
                            : "—"}
                        </TableCell>
                        <TableCell className="text-zinc-600">
                          {r.paidAt ? BR_DATE.format(new Date(r.paidAt)) : "—"}
                        </TableCell>
                        <TableCell>
                          {needsActivation ? (
                            <StatusPill tone="danger">Aguardando liberar</StatusPill>
                          ) : (
                            <StatusPill tone={subStatusTone(r.subscriptionStatus)}>
                              {STATUS_LABEL[r.subscriptionStatus] ??
                                r.subscriptionStatus}
                            </StatusPill>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {needsActivation ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openActivate(r)}
                                disabled={pending}
                                className="rounded-md border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                              >
                                <UnlockKeyhole className="size-3.5" />
                                Liberar login
                              </Button>
                            ) : null}
                            {r.whatsapp ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openWhats(r)}
                                className="rounded-md border-zinc-300 bg-white"
                                title="Enviar cobrança pelo WhatsApp"
                              >
                                <MessageCircle className="size-3.5" />
                                WhatsApp
                              </Button>
                            ) : null}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openChangePlan(r)}
                              className="rounded-md border-zinc-300 bg-white"
                              title="Trocar plano"
                            >
                              <Repeat className="size-3.5" />
                            </Button>
                            {r.subscriptionId && r.paymentStatus !== "paid" ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openPay(r)}
                                disabled={pending}
                                className="rounded-md border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
                              >
                                <CheckCircle2 className="size-3.5" />
                                Pago
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* WhatsApp dialog */}
      <Dialog
        open={whatsDialog.open}
        onOpenChange={(o) =>
          !o && setWhatsDialog({ open: false, row: null, amountStr: "" })
        }
      >
        <DialogContent className="rounded-xl border-zinc-200 bg-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar cobrança pelo WhatsApp</DialogTitle>
            <DialogDescription>
              {whatsDialog.row?.petshopName ?? ""} · {whatsDialog.row?.whatsapp ?? "—"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="whats_amt">Valor a cobrar</Label>
            <Input
              id="whats_amt"
              value={whatsDialog.amountStr}
              onChange={(e) =>
                setWhatsDialog((s) => ({ ...s, amountStr: e.target.value }))
              }
              inputMode="decimal"
              placeholder="149,00"
              className="font-mono"
            />
            <p className="text-xs text-zinc-500">
              Abre o WhatsApp com a mensagem já pronta. Envie você mesmo pelo app.
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setWhatsDialog({ open: false, row: null, amountStr: "" })
              }
              className="rounded-md border-zinc-300 bg-white"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={sendWhats}
              className="rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <MessageCircle className="size-4" />
              Abrir WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Marcar pago dialog */}
      <Dialog
        open={payDialog.open}
        onOpenChange={(o) =>
          !o &&
          setPayDialog({ open: false, row: null, amountStr: "", cycle: "monthly" })
        }
      >
        <DialogContent className="rounded-xl border-zinc-200 bg-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Marcar como pago</DialogTitle>
            <DialogDescription>
              {payDialog.row?.petshopName ?? ""} · esse valor entra no MRR e Faturamento Total.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="pay_amt">Quanto foi pago?</Label>
              <Input
                id="pay_amt"
                value={payDialog.amountStr}
                onChange={(e) =>
                  setPayDialog((s) => ({ ...s, amountStr: e.target.value }))
                }
                inputMode="decimal"
                placeholder="149,00"
                className="font-mono"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Ciclo</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["monthly", "annual"] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setPayDialog((s) => ({ ...s, cycle: c }))}
                    className={
                      "rounded-md border px-3 py-2 text-sm font-medium transition " +
                      (payDialog.cycle === c
                        ? "border-zinc-950 bg-zinc-950 text-white"
                        : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400")
                    }
                  >
                    {c === "monthly" ? "Mensal" : "Anual"}
                  </button>
                ))}
              </div>
              <p className="text-[0.6875rem] text-zinc-500">
                Anual entra no MRR dividido por 12.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setPayDialog({
                  open: false,
                  row: null,
                  amountStr: "",
                  cycle: "monthly",
                })
              }
              disabled={pending}
              className="rounded-md border-zinc-300 bg-white"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={confirmPay}
              disabled={pending}
              className="rounded-md bg-zinc-950 text-white hover:bg-zinc-800"
            >
              <CheckCircle2 className="size-4" />
              {pending ? "Salvando…" : "Confirmar pagamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ativar loja + registrar pagamento */}
      <Dialog
        open={activateDialog.open}
        onOpenChange={(o) =>
          !o &&
          setActivateDialog({
            open: false,
            row: null,
            amountStr: "",
            cycle: "monthly",
          })
        }
      >
        <DialogContent className="rounded-xl border-zinc-200 bg-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Liberar login da loja</DialogTitle>
            <DialogDescription>
              {activateDialog.row?.petshopName ?? ""} está bloqueada. Confirme o
              valor recebido — ele entra no MRR e Faturamento Total, e o login é
              liberado imediatamente.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="act_amt">Quanto foi pago?</Label>
              <Input
                id="act_amt"
                value={activateDialog.amountStr}
                onChange={(e) =>
                  setActivateDialog((s) => ({ ...s, amountStr: e.target.value }))
                }
                inputMode="decimal"
                placeholder="149,00"
                className="font-mono"
                autoFocus
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Ciclo do pagamento</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["monthly", "annual"] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() =>
                      setActivateDialog((s) => ({ ...s, cycle: c }))
                    }
                    className={
                      "rounded-md border px-3 py-2 text-sm font-medium transition " +
                      (activateDialog.cycle === c
                        ? "border-zinc-950 bg-zinc-950 text-white"
                        : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400")
                    }
                  >
                    {c === "monthly" ? "Mensal" : "Anual"}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setActivateDialog({
                  open: false,
                  row: null,
                  amountStr: "",
                  cycle: "monthly",
                })
              }
              disabled={pending}
              className="rounded-md border-zinc-300 bg-white"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={confirmActivate}
              disabled={pending}
              className="rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <UnlockKeyhole className="size-4" />
              {pending ? "Liberando…" : "Liberar e registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change plan dialog */}
      <Dialog
        open={planDialog.open}
        onOpenChange={(o) =>
          !o && setPlanDialog({ open: false, row: null, planId: "" })
        }
      >
        <DialogContent className="rounded-xl border-zinc-200 bg-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Trocar plano</DialogTitle>
            <DialogDescription>
              {planDialog.row?.petshopName ?? ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Plano</Label>
            <Select
              value={planDialog.planId || undefined}
              onValueChange={(v) =>
                setPlanDialog((s) => ({ ...s, planId: String(v ?? "") }))
              }
            >
              <SelectTrigger className="rounded-md">
                <SelectValue placeholder="Escolher plano" />
              </SelectTrigger>
              <SelectContent>
                {plans.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} · {formatBRL(p.price_cents)}/mês
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setPlanDialog({ open: false, row: null, planId: "" })
              }
              disabled={pending}
              className="rounded-md border-zinc-300 bg-white"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={confirmChangePlan}
              disabled={pending || !planDialog.planId}
              className="rounded-md bg-zinc-950 text-white hover:bg-zinc-800"
            >
              <KeyRound className="size-4" />
              {pending ? "Trocando…" : "Trocar plano"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
