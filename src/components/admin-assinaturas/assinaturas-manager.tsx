"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle2,
  CreditCard,
  RefreshCcw,
  Repeat,
  Store,
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
  changePetshopPlan,
  markSubscriptionPaid,
  renewSubscription,
} from "@/app/admin-master/assinaturas/actions";
import type { Database } from "@/lib/supabase/database.types";

type SubStatus = Database["public"]["Enums"]["subscription_status"];

export type SubscriptionRow = {
  subscriptionId: string | null;
  petshopId: string;
  petshopName: string;
  subdomain: string;
  planId: string | null;
  planName: string;
  amountCents: number | null;
  dueDate: string | null;
  status: SubStatus | "no_subscription";
};

export type PlanOption = {
  id: string;
  name: string;
  price_cents: number;
};

const BR_DATE = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const STATUS_LABEL: Record<string, string> = {
  paid: "Paga",
  pending: "Pendente",
  confirming: "Confirmando",
  overdue: "Em atraso",
  blocked: "Bloqueada",
  no_subscription: "Sem fatura",
};

function statusTone(s: string): "success" | "warning" | "danger" | "neutral" {
  if (s === "paid") return "success";
  if (s === "pending" || s === "confirming") return "warning";
  if (s === "overdue" || s === "blocked") return "danger";
  return "neutral";
}

function defaultDueDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

export function AssinaturasManager({
  subscriptions,
  plans,
}: {
  subscriptions: SubscriptionRow[];
  plans: PlanOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [renewDialog, setRenewDialog] = useState<{
    open: boolean;
    petshop: SubscriptionRow | null;
    dueDate: string;
  }>({ open: false, petshop: null, dueDate: defaultDueDate() });

  const [planDialog, setPlanDialog] = useState<{
    open: boolean;
    petshop: SubscriptionRow | null;
    planId: string;
  }>({ open: false, petshop: null, planId: "" });

  function openRenew(row: SubscriptionRow) {
    setRenewDialog({ open: true, petshop: row, dueDate: defaultDueDate() });
  }

  function openChangePlan(row: SubscriptionRow) {
    setPlanDialog({
      open: true,
      petshop: row,
      planId: row.planId ?? plans[0]?.id ?? "",
    });
  }

  function confirmRenew() {
    if (!renewDialog.petshop) return;
    const pid = renewDialog.petshop.petshopId;
    const dd = renewDialog.dueDate;
    startTransition(async () => {
      const result = await renewSubscription(pid, dd);
      if (result.ok) {
        toast.success("Nova fatura gerada");
        setRenewDialog({ open: false, petshop: null, dueDate: defaultDueDate() });
        router.refresh();
      } else {
        toast.error(result.error ?? "Erro");
      }
    });
  }

  function confirmChangePlan() {
    if (!planDialog.petshop || !planDialog.planId) return;
    const petshopId = planDialog.petshop.petshopId;
    const planId = planDialog.planId;
    startTransition(async () => {
      const result = await changePetshopPlan(petshopId, planId);
      if (result.ok) {
        toast.success("Plano alterado");
        setPlanDialog({ open: false, petshop: null, planId: "" });
        router.refresh();
      } else {
        toast.error(result.error ?? "Erro");
      }
    });
  }

  function handleMarkPaid(subscriptionId: string) {
    if (!confirm("Marcar fatura como paga?")) return;
    startTransition(async () => {
      const result = await markSubscriptionPaid(subscriptionId);
      if (result.ok) {
        toast.success("Fatura paga");
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
        description="Plano atual e última fatura de cada loja. Gere a próxima cobrança e marque pagamentos."
      />

      <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
        <CardContent className="p-0">
          {subscriptions.length === 0 ? (
            <div className="p-10 text-center text-sm text-zinc-500">
              Nenhuma loja cadastrada.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[920px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Loja</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status fatura</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.map((s) => (
                    <TableRow key={s.petshopId}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Store className="size-4 text-zinc-500" />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-zinc-950">
                              {s.petshopName}
                            </p>
                            <p className="font-mono text-[0.6875rem] text-zinc-500">
                              {s.subdomain}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{s.planName}</TableCell>
                      <TableCell>
                        {s.amountCents !== null ? formatBRL(s.amountCents) : "—"}
                      </TableCell>
                      <TableCell>
                        {s.dueDate ? BR_DATE.format(new Date(`${s.dueDate}T12:00`)) : "—"}
                      </TableCell>
                      <TableCell>
                        <StatusPill tone={statusTone(s.status)}>
                          {STATUS_LABEL[s.status] ?? s.status}
                        </StatusPill>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openChangePlan(s)}
                            className="rounded-md border-zinc-300 bg-white"
                          >
                            <Repeat className="size-3.5" />
                            Trocar plano
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openRenew(s)}
                            disabled={pending}
                            className="rounded-md border-zinc-300 bg-white"
                          >
                            <RefreshCcw className="size-3.5" />
                            Renovar
                          </Button>
                          {s.subscriptionId && s.status !== "paid" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleMarkPaid(s.subscriptionId!)}
                              disabled={pending}
                              className="rounded-md border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
                            >
                              <CheckCircle2 className="size-3.5" />
                              Marcar paga
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Renew dialog */}
      <Dialog
        open={renewDialog.open}
        onOpenChange={(o) => !o && setRenewDialog((s) => ({ ...s, open: false }))}
      >
        <DialogContent className="rounded-xl border-zinc-200 bg-white sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Renovar assinatura</DialogTitle>
            <DialogDescription>
              {renewDialog.petshop?.petshopName ?? ""} ·{" "}
              {renewDialog.petshop?.planName ?? "Sem plano"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="due_date">Próximo vencimento</Label>
            <Input
              id="due_date"
              type="date"
              value={renewDialog.dueDate}
              onChange={(e) =>
                setRenewDialog((s) => ({ ...s, dueDate: e.target.value }))
              }
            />
            <p className="text-xs text-zinc-500">
              Cria uma nova fatura com o valor do plano vinculado.
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-md border-zinc-300 bg-white"
              onClick={() => setRenewDialog((s) => ({ ...s, open: false }))}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="rounded-md bg-zinc-950 text-white hover:bg-zinc-800"
              onClick={confirmRenew}
              disabled={pending}
            >
              <CreditCard className="size-4" />
              {pending ? "Gerando…" : "Gerar fatura"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change plan dialog */}
      <Dialog
        open={planDialog.open}
        onOpenChange={(o) => !o && setPlanDialog((s) => ({ ...s, open: false }))}
      >
        <DialogContent className="rounded-xl border-zinc-200 bg-white sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Trocar plano</DialogTitle>
            <DialogDescription>
              {planDialog.petshop?.petshopName ?? ""}
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
            <p className="text-xs text-zinc-500">
              Faturas em aberto não mudam de valor — só as próximas renovações.
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-md border-zinc-300 bg-white"
              onClick={() => setPlanDialog((s) => ({ ...s, open: false }))}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="rounded-md bg-zinc-950 text-white hover:bg-zinc-800"
              onClick={confirmChangePlan}
              disabled={pending || !planDialog.planId}
            >
              {pending ? "Trocando…" : "Trocar plano"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
