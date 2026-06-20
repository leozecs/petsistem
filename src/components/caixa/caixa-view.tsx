"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Plus,
  Receipt,
  RotateCcw,
  Trash2,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
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
import {
  markChargePaid,
  unmarkChargePaid,
  saveExpense,
  deleteExpense,
} from "@/app/app/caixa/actions";

type Charge = {
  appointmentId: string;
  priceCents: number;
  paymentMethod: string | null;
  paidAt: string | null;
  startIso: string;
  status: string;
  serviceName: string | null;
  petName: string | null;
  tutorName: string | null;
};

type Expense = {
  id: string;
  description: string;
  amountCents: number;
  occurredOn: string;
  paymentMethod: string | null;
  notes: string | null;
};

const HHMM = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "America/Sao_Paulo",
});

const LONG_DATE = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});

const METHOD_LABELS: Record<string, string> = {
  pix: "Pix",
  cash: "Dinheiro",
  card: "Cartão",
  transfer: "Transferência",
  other: "Outro",
};

const METHOD_OPTIONS: { value: string; label: string }[] = [
  { value: "pix", label: "Pix" },
  { value: "cash", label: "Dinheiro" },
  { value: "card", label: "Cartão" },
  { value: "transfer", label: "Transferência" },
  { value: "other", label: "Outro" },
];

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function dateLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return LONG_DATE.format(new Date(Date.UTC(y!, (m ?? 1) - 1, d ?? 1, 12)));
}

function shiftDate(iso: string, deltaDays: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, (m ?? 1) - 1, d ?? 1));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

export function CaixaView({
  dateIso,
  charges,
  expenses,
}: {
  dateIso: string;
  charges: Charge[];
  expenses: Expense[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [payDialog, setPayDialog] = useState<{ open: boolean; charge: Charge | null }>({
    open: false,
    charge: null,
  });
  const [payMethod, setPayMethod] = useState<string>("pix");
  const [expenseDialog, setExpenseDialog] = useState(false);

  const paidCharges = useMemo(() => charges.filter((c) => c.paidAt !== null), [charges]);
  const unpaidCharges = useMemo(
    () => charges.filter((c) => c.paidAt === null && c.status !== "cancelled" && c.status !== "no_show"),
    [charges],
  );

  const totalReceived = useMemo(
    () => paidCharges.reduce((sum, c) => sum + c.priceCents, 0),
    [paidCharges],
  );
  const totalPending = useMemo(
    () => unpaidCharges.reduce((sum, c) => sum + c.priceCents, 0),
    [unpaidCharges],
  );
  const totalExpenses = useMemo(
    () => expenses.reduce((sum, e) => sum + e.amountCents, 0),
    [expenses],
  );
  const balance = totalReceived - totalExpenses;

  function openPay(c: Charge) {
    setPayMethod("pix");
    setPayDialog({ open: true, charge: c });
  }

  function confirmPay() {
    if (!payDialog.charge) return;
    const apptId = payDialog.charge.appointmentId;
    const method = payMethod as Parameters<typeof markChargePaid>[1];
    startTransition(async () => {
      const result = await markChargePaid(apptId, method);
      if (result.ok) {
        toast.success("Pagamento registrado");
        setPayDialog({ open: false, charge: null });
        router.refresh();
      } else {
        toast.error(result.error ?? "Erro");
      }
    });
  }

  function handleUnpay(apptId: string) {
    if (!confirm("Desfazer este recebimento?")) return;
    startTransition(async () => {
      const result = await unmarkChargePaid(apptId);
      if (result.ok) {
        toast.success("Recebimento revertido");
        router.refresh();
      } else {
        toast.error(result.error ?? "Erro");
      }
    });
  }

  function navigateDay(delta: number) {
    const next = shiftDate(dateIso, delta);
    router.push(`/app/caixa?date=${next}`);
  }

  function navigateToday() {
    router.push("/app/caixa");
  }

  function onSubmitExpense(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    // Convert BRL "12,50" / "12.50" to cents.
    const raw = String(fd.get("amount") ?? "").replace(/\./g, "").replace(",", ".");
    const amount = Number(raw);
    if (!amount || !Number.isFinite(amount) || amount <= 0) {
      toast.error("Valor inválido");
      return;
    }
    const out = new FormData();
    out.set("description", String(fd.get("description") ?? ""));
    out.set("amount_cents", String(Math.round(amount * 100)));
    out.set("occurred_on", String(fd.get("occurred_on") ?? dateIso));
    out.set("payment_method", String(fd.get("payment_method") ?? ""));
    out.set("notes", String(fd.get("notes") ?? ""));

    startTransition(async () => {
      const result = await saveExpense(out);
      if (result.ok) {
        toast.success("Despesa lançada");
        setExpenseDialog(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Erro");
      }
    });
  }

  function handleDeleteExpense(id: string) {
    if (!confirm("Excluir despesa?")) return;
    startTransition(async () => {
      const result = await deleteExpense(id);
      if (result.ok) {
        toast.success("Despesa excluída");
        router.refresh();
      } else {
        toast.error(result.error ?? "Erro");
      }
    });
  }

  return (
    <div>
      <SectionHeading
        title="Caixa"
        description="Movimentação financeira do dia: recebimentos dos agendamentos + despesas avulsas."
        action={
          <Button
            onClick={() => setExpenseDialog(true)}
            className="rounded-md bg-zinc-950 text-white hover:bg-zinc-800"
          >
            <Plus className="size-4" />
            Lançar despesa
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="rounded-md border-zinc-200 bg-white"
          onClick={() => navigateDay(-1)}
          aria-label="Dia anterior"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="min-w-[14rem] text-base font-semibold text-zinc-950">
          {dateLabel(dateIso)}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="rounded-md border-zinc-200 bg-white"
          onClick={() => navigateDay(1)}
          aria-label="Próximo dia"
        >
          <ChevronRight className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="rounded-md border-zinc-200 bg-white"
          onClick={navigateToday}
        >
          Hoje
        </Button>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-500">
              <ArrowDownCircle className="size-4 text-emerald-600" />
              Recebido
            </div>
            <p className="mt-2 text-2xl font-semibold text-zinc-950">
              {formatBRL(totalReceived)}
            </p>
            <p className="text-xs text-zinc-500">{paidCharges.length} agendamento(s)</p>
          </CardContent>
        </Card>
        <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-500">
              <Wallet className="size-4 text-amber-600" />
              A receber
            </div>
            <p className="mt-2 text-2xl font-semibold text-zinc-950">
              {formatBRL(totalPending)}
            </p>
            <p className="text-xs text-zinc-500">{unpaidCharges.length} aberto(s)</p>
          </CardContent>
        </Card>
        <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-500">
              <ArrowUpCircle className="size-4 text-rose-600" />
              Despesas
            </div>
            <p className="mt-2 text-2xl font-semibold text-zinc-950">
              {formatBRL(totalExpenses)}
            </p>
            <p className="text-xs text-zinc-500">{expenses.length} lançamento(s)</p>
          </CardContent>
        </Card>
        <Card className="rounded-lg border-zinc-200 bg-zinc-950 text-white shadow-none">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-400">
              <Banknote className="size-4" />
              Saldo do dia
            </div>
            <p
              className={
                "mt-2 text-2xl font-semibold " +
                (balance >= 0 ? "text-white" : "text-rose-300")
              }
            >
              {formatBRL(balance)}
            </p>
            <p className="text-xs text-zinc-400">Recebido − despesas</p>
          </CardContent>
        </Card>
      </div>

      {/* A receber */}
      <Card className="mb-4 rounded-lg border-zinc-200 bg-white shadow-none">
        <CardContent className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Wallet className="size-4 text-amber-600" />
            <h2 className="text-sm font-semibold text-zinc-950">A receber</h2>
            <span className="ml-auto text-xs text-zinc-500">
              {unpaidCharges.length} aberto(s)
            </span>
          </div>
          {unpaidCharges.length === 0 ? (
            <p className="text-sm text-zinc-500">Nenhuma cobrança aberta hoje.</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {unpaidCharges.map((c) => (
                <li key={c.appointmentId} className="flex flex-wrap items-center gap-3 py-3">
                  <span className="font-mono text-sm font-medium text-zinc-700">
                    {HHMM.format(new Date(c.startIso))}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-950">
                      {c.serviceName ?? "Serviço"}
                    </p>
                    <p className="truncate text-xs text-zinc-500">
                      {c.petName ?? c.tutorName ?? "Tutor"}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-zinc-950">
                    {formatBRL(c.priceCents)}
                  </span>
                  <Button
                    size="sm"
                    onClick={() => openPay(c)}
                    disabled={pending}
                    className="rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    <CreditCard className="size-3.5" />
                    Receber
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Recebido */}
      <Card className="mb-4 rounded-lg border-zinc-200 bg-white shadow-none">
        <CardContent className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <ArrowDownCircle className="size-4 text-emerald-600" />
            <h2 className="text-sm font-semibold text-zinc-950">Recebido</h2>
            <span className="ml-auto text-xs text-zinc-500">
              {paidCharges.length} pagamento(s)
            </span>
          </div>
          {paidCharges.length === 0 ? (
            <p className="text-sm text-zinc-500">Nada recebido ainda hoje.</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {paidCharges.map((c) => (
                <li key={c.appointmentId} className="flex flex-wrap items-center gap-3 py-3">
                  <span className="font-mono text-sm font-medium text-zinc-700">
                    {HHMM.format(new Date(c.startIso))}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-950">
                      {c.serviceName ?? "Serviço"}
                    </p>
                    <p className="truncate text-xs text-zinc-500">
                      {c.petName ?? c.tutorName ?? "Tutor"}
                      {c.paymentMethod
                        ? ` · ${METHOD_LABELS[c.paymentMethod] ?? c.paymentMethod}`
                        : ""}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-emerald-700">
                    {formatBRL(c.priceCents)}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUnpay(c.appointmentId)}
                    disabled={pending}
                    className="rounded-md border-zinc-300 bg-white"
                  >
                    <RotateCcw className="size-3.5" />
                    Desfazer
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Despesas */}
      <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
        <CardContent className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Receipt className="size-4 text-rose-600" />
            <h2 className="text-sm font-semibold text-zinc-950">Despesas</h2>
            <span className="ml-auto text-xs text-zinc-500">
              {expenses.length} lançamento(s)
            </span>
          </div>
          {expenses.length === 0 ? (
            <p className="text-sm text-zinc-500">Sem despesas neste dia.</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {expenses.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-950">
                      {e.description}
                    </p>
                    <p className="truncate text-xs text-zinc-500">
                      {e.paymentMethod
                        ? METHOD_LABELS[e.paymentMethod] ?? e.paymentMethod
                        : "Sem método"}
                      {e.notes ? ` · ${e.notes}` : ""}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-rose-700">
                    −{formatBRL(e.amountCents)}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteExpense(e.id)}
                    disabled={pending}
                    className="rounded-md border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Pay dialog */}
      <Dialog open={payDialog.open} onOpenChange={(o) => !o && setPayDialog({ open: false, charge: null })}>
        <DialogContent className="rounded-xl border-zinc-200 bg-white sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Confirmar recebimento</DialogTitle>
          </DialogHeader>
          {payDialog.charge ? (
            <div className="space-y-3">
              <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm">
                <p className="font-medium text-zinc-950">
                  {payDialog.charge.serviceName ?? "Serviço"} ·{" "}
                  {payDialog.charge.petName ?? payDialog.charge.tutorName ?? "Tutor"}
                </p>
                <p className="text-zinc-500">
                  {HHMM.format(new Date(payDialog.charge.startIso))} ·{" "}
                  <span className="font-semibold text-zinc-950">
                    {formatBRL(payDialog.charge.priceCents)}
                  </span>
                </p>
              </div>
              <div className="space-y-2">
                <Label>Método</Label>
                <Select value={payMethod} onValueChange={(v) => setPayMethod(String(v ?? "pix"))}>
                  <SelectTrigger className="rounded-md">
                    <SelectValue placeholder="Método" />
                  </SelectTrigger>
                  <SelectContent>
                    {METHOD_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-md border-zinc-300 bg-white"
              onClick={() => setPayDialog({ open: false, charge: null })}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={confirmPay}
              disabled={pending}
            >
              {pending ? "Salvando…" : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Expense dialog */}
      <Dialog open={expenseDialog} onOpenChange={setExpenseDialog}>
        <DialogContent className="rounded-xl border-zinc-200 bg-white sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Lançar despesa</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmitExpense} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="exp_desc">Descrição</Label>
              <Input id="exp_desc" name="description" placeholder="Ex: Ração, energia" required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="exp_amount">Valor (R$)</Label>
                <Input
                  id="exp_amount"
                  name="amount"
                  inputMode="decimal"
                  placeholder="0,00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exp_date">Data</Label>
                <Input id="exp_date" name="occurred_on" type="date" defaultValue={dateIso} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="exp_method">Método</Label>
              <select
                id="exp_method"
                name="payment_method"
                className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm"
                defaultValue=""
              >
                <option value="">— Não informado —</option>
                {METHOD_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="exp_notes">Observações</Label>
              <Textarea id="exp_notes" name="notes" rows={2} />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="rounded-md border-zinc-300 bg-white"
                onClick={() => setExpenseDialog(false)}
                disabled={pending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="rounded-md bg-zinc-950 text-white hover:bg-zinc-800"
                disabled={pending}
              >
                {pending ? "Salvando…" : "Lançar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
