"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle2,
  Copy,
  KeyRound,
  RotateCcw,
  Store,
  Wallet,
  Zap,
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
  generatePayment,
  markPaymentPaid,
  markPaymentUnpaid,
} from "@/app/admin-master/cobrancas/actions";

export type PaymentRow = {
  paymentId: string | null;
  subscriptionId: string;
  petshopName: string;
  subdomain: string;
  amountCents: number;
  dueDate: string;
  paidAt: string | null;
  status: string;
};

export type PlatformPix = {
  pixKey: string | null;
  pixHolderName: string | null;
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
  pending: "Pendente",
  confirming: "Confirmando",
  paid: "Paga",
  overdue: "Em atraso",
  rejected: "Rejeitada",
  no_payment: "Sem cobrança",
};

function statusTone(s: string): "success" | "warning" | "danger" | "neutral" {
  if (s === "paid") return "success";
  if (s === "pending" || s === "confirming") return "warning";
  if (s === "overdue" || s === "rejected") return "danger";
  return "neutral";
}

export function CobrancasManager({
  payments,
  pix,
}: {
  payments: PaymentRow[];
  pix: PlatformPix;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState<"all" | "pending" | "paid">("all");
  const [pixDialog, setPixDialog] = useState<PaymentRow | null>(null);

  const filtered = useMemo(() => {
    if (filter === "all") return payments;
    if (filter === "pending") {
      return payments.filter((p) => p.status === "pending" || p.status === "confirming" || p.status === "overdue");
    }
    return payments.filter((p) => p.status === "paid");
  }, [payments, filter]);

  const totals = useMemo(() => {
    const paid = payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amountCents, 0);
    const open = payments.filter((p) => p.status === "pending" || p.status === "overdue").reduce((s, p) => s + p.amountCents, 0);
    return { paid, open };
  }, [payments]);

  function handleGenerate(row: PaymentRow) {
    startTransition(async () => {
      const result = await generatePayment(row.subscriptionId);
      if (result.ok) {
        toast.success("Cobrança gerada");
        router.refresh();
      } else {
        toast.error(result.error ?? "Erro");
      }
    });
  }

  function handlePaid(row: PaymentRow) {
    if (!row.paymentId) return;
    if (!confirm("Marcar cobrança como paga?")) return;
    const id = row.paymentId;
    startTransition(async () => {
      const result = await markPaymentPaid(id);
      if (result.ok) {
        toast.success("Marcada como paga");
        router.refresh();
      } else {
        toast.error(result.error ?? "Erro");
      }
    });
  }

  function handleUndo(row: PaymentRow) {
    if (!row.paymentId) return;
    if (!confirm("Desfazer pagamento?")) return;
    const id = row.paymentId;
    startTransition(async () => {
      const result = await markPaymentUnpaid(id);
      if (result.ok) {
        toast.success("Pagamento revertido");
        router.refresh();
      } else {
        toast.error(result.error ?? "Erro");
      }
    });
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copiado");
    } catch {
      toast.error("Selecione manualmente");
    }
  }

  return (
    <div>
      <SectionHeading
        title="Cobranças"
        description="Gera, exibe e confirma cobranças Pix das assinaturas."
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs uppercase text-zinc-500">
              <CheckCircle2 className="size-4 text-emerald-600" />
              Recebido total
            </div>
            <p className="mt-2 text-2xl font-semibold text-zinc-950">
              {formatBRL(totals.paid)}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs uppercase text-zinc-500">
              <Wallet className="size-4 text-amber-600" />
              Em aberto
            </div>
            <p className="mt-2 text-2xl font-semibold text-zinc-950">
              {formatBRL(totals.open)}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs uppercase text-zinc-500">
              <KeyRound className="size-4 text-zinc-700" />
              Chave Pix da plataforma
            </div>
            <p className="mt-2 truncate font-mono text-sm text-zinc-950">
              {pix.pixKey ?? "—"}
            </p>
            <p className="truncate text-xs text-zinc-500">
              {pix.pixHolderName ?? "Configure em Configurações"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-md border border-zinc-200 bg-white p-1">
          {(["all", "pending", "paid"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={
                "rounded-md px-3 py-1.5 text-sm font-medium transition " +
                (filter === f
                  ? "bg-zinc-950 text-white"
                  : "text-zinc-600 hover:bg-zinc-100")
              }
            >
              {f === "all" ? "Todas" : f === "pending" ? "Pendentes" : "Pagas"}
            </button>
          ))}
        </div>
      </div>

      <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-zinc-500">
              Nenhuma cobrança nesse filtro.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[920px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Loja</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Pago em</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => (
                    <TableRow key={p.paymentId ?? p.subscriptionId}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Store className="size-4 text-zinc-500" />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-zinc-950">
                              {p.petshopName}
                            </p>
                            <p className="font-mono text-[0.6875rem] text-zinc-500">
                              {p.subdomain}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{formatBRL(p.amountCents)}</TableCell>
                      <TableCell>
                        {BR_DATE.format(new Date(`${p.dueDate}T12:00`))}
                      </TableCell>
                      <TableCell className="text-zinc-600">
                        {p.paidAt ? BR_DATE.format(new Date(p.paidAt)) : "—"}
                      </TableCell>
                      <TableCell>
                        <StatusPill tone={statusTone(p.status)}>
                          {STATUS_LABEL[p.status] ?? p.status}
                        </StatusPill>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {p.status === "no_payment" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleGenerate(p)}
                              disabled={pending}
                              className="rounded-md border-zinc-300 bg-white"
                            >
                              <Zap className="size-3.5" />
                              Gerar Pix
                            </Button>
                          ) : null}
                          {p.paymentId && p.status !== "paid" ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPixDialog(p)}
                                className="rounded-md border-zinc-300 bg-white"
                              >
                                <KeyRound className="size-3.5" />
                                Pix
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePaid(p)}
                                disabled={pending}
                                className="rounded-md border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
                              >
                                <CheckCircle2 className="size-3.5" />
                                Confirmar
                              </Button>
                            </>
                          ) : null}
                          {p.paymentId && p.status === "paid" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUndo(p)}
                              disabled={pending}
                              className="rounded-md border-zinc-300 bg-white"
                            >
                              <RotateCcw className="size-3.5" />
                              Desfazer
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

      {/* Pix dialog */}
      <Dialog open={pixDialog !== null} onOpenChange={(o) => !o && setPixDialog(null)}>
        <DialogContent className="rounded-xl border-zinc-200 bg-white sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Cobrar via Pix</DialogTitle>
            <DialogDescription>
              {pixDialog?.petshopName ?? ""} · {pixDialog ? formatBRL(pixDialog.amountCents) : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Chave Pix</p>
              <div className="mt-1 flex items-center gap-2">
                <code className="flex-1 break-all font-mono text-sm text-zinc-950">
                  {pix.pixKey ?? "Não configurado"}
                </code>
                {pix.pixKey ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => copy(pix.pixKey!)}
                    className="rounded-md border-zinc-300 bg-white"
                  >
                    <Copy className="size-3.5" />
                  </Button>
                ) : null}
              </div>
              {pix.pixHolderName ? (
                <p className="mt-2 text-xs text-zinc-500">
                  Titular: {pix.pixHolderName}
                </p>
              ) : null}
            </div>
            {pixDialog ? (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                Valor a cobrar:{" "}
                <span className="font-semibold">{formatBRL(pixDialog.amountCents)}</span>
              </div>
            ) : null}
            <p className="text-xs text-zinc-500">
              Mostre essa chave pro dono pagar. Quando recebeu, clique em "Confirmar" na linha.
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              className="rounded-md bg-zinc-950 text-white hover:bg-zinc-800"
              onClick={() => setPixDialog(null)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
