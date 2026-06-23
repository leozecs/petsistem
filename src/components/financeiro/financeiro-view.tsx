"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createExpenseItem,
  createRevenueItem,
  deleteExpenseItem,
  deleteRevenueItem,
} from "@/app/app/financeiro/actions";
import { cn } from "@/lib/utils";

type PaymentMethod = "pix" | "cash" | "card" | "transfer" | "other";
const PAYMENT_METHOD_ITEMS = { pix: "Pix", cash: "Dinheiro", card: "Cartão", transfer: "Transferência", other: "Outro" };

export type FinanceChartPoint = { month: string; revenueCents: number; expenseCents: number; profitCents: number };

export type Movement = {
  id: string;
  rowId?: string;
  kind: "revenue" | "expense";
  source: "service" | "manual";
  description: string;
  categoryName: string | null;
  amountCents: number;
  paymentMethod: string | null;
  occurredAt: string;
  paid?: boolean;
  deletable: boolean;
};

type CategoryOption = {
  id: string;
  kind: "revenue" | "expense";
  name: string;
};

function brl(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function pmLabel(pm: string | null): string {
  switch (pm) {
    case "pix":
      return "Pix";
    case "cash":
      return "Dinheiro";
    case "card":
      return "Cartão";
    case "transfer":
      return "Transferência";
    case "other":
      return "Outro";
    default:
      return "—";
  }
}

export function FinanceiroView({
  chart,
  movements,
  categories,
  todayIso,
  canDelete,
  selectedYear,
  selectedSemester,
  availableYears,
}: {
  chart: FinanceChartPoint[];
  movements: Movement[];
  categories: CategoryOption[];
  todayIso: string;
  canDelete: boolean;
  selectedYear: number;
  selectedSemester: 1 | 2;
  availableYears: number[];
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "revenue" | "expense">("all");

  const filtered = useMemo(
    () => (filter === "all" ? movements : movements.filter((m) => m.kind === filter)),
    [movements, filter],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Financeiro</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Faturamento, despesas e lucro do semestre. Receitas de atendimento entram automaticamente.
          </p>
        </div>
        <div className="flex gap-2">
          <AddRevenueDialog
            categories={categories.filter((c) => c.kind === "revenue")}
            todayIso={todayIso}
          />
          <AddExpenseDialog
            categories={categories.filter((c) => c.kind === "expense")}
            todayIso={todayIso}
          />
        </div>
      </div>

      <Card className="rounded-xl border-zinc-200 bg-white shadow-none">
        <CardContent className="p-5">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div><p className="text-sm font-semibold text-zinc-900">Resultado semestral</p><p className="text-xs text-zinc-500">Valores mensais em reais</p></div>
            <div className="flex gap-2">
              <Select items={Object.fromEntries(availableYears.map((year) => [String(year), String(year)]))} value={String(selectedYear)} onValueChange={(value) => router.push(`/app/financeiro?year=${value}&semester=${selectedSemester}`)}><SelectTrigger className="w-24"><SelectValue /></SelectTrigger><SelectContent>{availableYears.map((year) => <SelectItem key={year} value={String(year)}>{year}</SelectItem>)}</SelectContent></Select>
              <Select items={{ "1": "1º semestre", "2": "2º semestre" }} value={String(selectedSemester)} onValueChange={(value) => router.push(`/app/financeiro?year=${selectedYear}&semester=${value}`)}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">1º semestre</SelectItem><SelectItem value="2">2º semestre</SelectItem></SelectContent></Select>
            </div>
          </div>
          <div className="h-80 w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={chart} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} /><XAxis dataKey="month" tick={{ fill: "#71717a", fontSize: 12 }} axisLine={false} tickLine={false} /><YAxis tickFormatter={(value) => `R$ ${Math.round(Number(value) / 100)}`} tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} width={72} /><Tooltip formatter={(value) => brl(Number(value))} /><Legend /><Line type="monotone" dataKey="revenueCents" name="Faturamento" stroke="#059669" strokeWidth={2.5} dot={{ r: 3 }} /><Line type="monotone" dataKey="expenseCents" name="Despesas" stroke="#e11d48" strokeWidth={2.5} dot={{ r: 3 }} /><Line type="monotone" dataKey="profitCents" name="Lucro" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} /></LineChart></ResponsiveContainer></div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border-zinc-200 bg-white shadow-none">
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b border-zinc-200 p-4">
            <p className="text-sm font-semibold text-zinc-900">Movimentações do semestre</p>
            <div className="inline-flex rounded-md border border-zinc-200 bg-zinc-50 p-0.5">
              {(
                [
                  { v: "all", label: "Tudo" },
                  { v: "revenue", label: "Receitas" },
                  { v: "expense", label: "Despesas" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setFilter(opt.v)}
                  className={cn(
                    "rounded-md px-3 py-1 text-xs font-medium transition",
                    filter === opt.v
                      ? "bg-white text-zinc-950 shadow-sm"
                      : "text-zinc-600 hover:text-zinc-900",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          {filtered.length === 0 ? (
            <p className="p-8 text-center text-sm text-zinc-500">
              Nenhuma movimentação no período.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {filtered.map((m) => (
                <MovementRow key={m.id} m={m} canDelete={canDelete} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MovementRow({ m, canDelete }: { m: Movement; canDelete: boolean }) {
  const [pending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!m.rowId) return;
    if (!confirm(`Excluir esta ${m.kind === "revenue" ? "receita" : "despesa"}?`)) return;
    startTransition(async () => {
      const fn = m.kind === "revenue" ? deleteRevenueItem : deleteExpenseItem;
      const res = await fn({ id: m.rowId! });
      if (res.ok) toast.success("Excluído.");
      else toast.error(res.error);
    });
  };

  const dateLabel = new Date(m.occurredAt).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });

  return (
    <li className="flex items-center gap-3 p-4">
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg border",
          m.kind === "revenue"
            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
            : "bg-rose-50 text-rose-700 border-rose-100",
        )}
      >
        {m.kind === "revenue" ? (
          <ArrowUpCircle className="size-4" />
        ) : (
          <ArrowDownCircle className="size-4" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-900">{m.description}</p>
        <p className="text-xs text-zinc-500">
          {dateLabel} · {pmLabel(m.paymentMethod)}
          {m.categoryName ? ` · ${m.categoryName}` : ""}
          {m.kind === "expense" && m.paid === false ? " · A pagar" : ""}
          {m.source === "service" ? " · Atendimento" : ""}
        </p>
      </div>
      <p
        className={cn(
          "font-mono text-sm font-semibold tabular-nums",
          m.kind === "revenue" ? "text-emerald-700" : "text-rose-700",
        )}
      >
        {m.kind === "revenue" ? "+" : "−"} {brl(m.amountCents)}
      </p>
      {canDelete && m.deletable ? (
        <Button size="sm" variant="ghost" onClick={handleDelete} disabled={pending}>
          <Trash2 className="size-4 text-zinc-400" />
        </Button>
      ) : null}
    </li>
  );
}

function AddRevenueDialog({
  categories,
  todayIso,
}: {
  categories: CategoryOption[];
  todayIso: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    description: "",
    amount: "",
    payment_method: "pix" as PaymentMethod,
    category_id: "" as string,
    received_at: todayIso,
    notes: "",
  });

  const submit = () => {
    const amount_cents = Math.round(parseFloat(form.amount.replace(",", ".")) * 100);
    if (!form.description.trim() || !amount_cents || amount_cents < 1) {
      toast.error("Preencha descrição e valor.");
      return;
    }
    startTransition(async () => {
      const res = await createRevenueItem({
        description: form.description.trim(),
        amount_cents,
        payment_method: form.payment_method,
        category_id: form.category_id || null,
        received_at: form.received_at,
        notes: form.notes.trim() || undefined,
      });
      if (res.ok) {
        toast.success("Receita lançada.");
        setOpen(false);
        setForm({
          description: "",
          amount: "",
          payment_method: "pix",
          category_id: "",
          received_at: todayIso,
          notes: "",
        });
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <TrendingUp className="size-4" />
        Lançar receita
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Lançar receita avulsa</DialogTitle>
          </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="rev-desc">Descrição</Label>
            <Input
              id="rev-desc"
              placeholder="Ex: Venda shampoo balcão"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              maxLength={200}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rev-amount">Valor (R$)</Label>
              <Input
                id="rev-amount"
                inputMode="decimal"
                placeholder="49,90"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rev-date">Data</Label>
              <Input
                id="rev-date"
                type="date"
                value={form.received_at}
                onChange={(e) => setForm({ ...form, received_at: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Pagamento</Label>
              <Select
                items={PAYMENT_METHOD_ITEMS}
                value={form.payment_method}
                onValueChange={(v) => setForm({ ...form, payment_method: v as PaymentMethod })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">Pix</SelectItem>
                  <SelectItem value="cash">Dinheiro</SelectItem>
                  <SelectItem value="card">Cartão</SelectItem>
                  <SelectItem value="transfer">Transferência</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select
                items={{ none: "Sem categoria", ...Object.fromEntries(categories.map((category) => [category.id, category.name])) }}
                value={form.category_id || "none"}
                onValueChange={(v) =>
                  setForm({ ...form, category_id: v === "none" || v == null ? "" : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sem categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem categoria</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={pending}>
            <Plus className="size-4" />
            Lançar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

function AddExpenseDialog({
  categories,
  todayIso,
}: {
  categories: CategoryOption[];
  todayIso: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    description: "",
    amount: "",
    payment_method: "pix" as PaymentMethod,
    category_id: "" as string,
    due_date: todayIso,
    paid: true,
    notes: "",
  });

  const submit = () => {
    const amount_cents = Math.round(parseFloat(form.amount.replace(",", ".")) * 100);
    if (!form.description.trim() || !amount_cents || amount_cents < 1) {
      toast.error("Preencha descrição e valor.");
      return;
    }
    startTransition(async () => {
      const res = await createExpenseItem({
        description: form.description.trim(),
        amount_cents,
        payment_method: form.paid ? form.payment_method : undefined,
        category_id: form.category_id || null,
        due_date: form.due_date,
        paid_at: form.paid ? form.due_date : null,
        notes: form.notes.trim() || undefined,
      });
      if (res.ok) {
        toast.success("Despesa lançada.");
        setOpen(false);
        setForm({
          description: "",
          amount: "",
          payment_method: "pix",
          category_id: "",
          due_date: todayIso,
          paid: true,
          notes: "",
        });
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <TrendingDown className="size-4" />
        Lançar despesa
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Lançar despesa</DialogTitle>
          </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="exp-desc">Descrição</Label>
            <Input
              id="exp-desc"
              placeholder="Ex: Compra ração balcão"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              maxLength={200}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="exp-amount">Valor (R$)</Label>
              <Input
                id="exp-amount"
                inputMode="decimal"
                placeholder="120,00"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-date">Data</Label>
              <Input
                id="exp-date"
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select
                items={{ none: "Sem categoria", ...Object.fromEntries(categories.map((category) => [category.id, category.name])) }}
                value={form.category_id || "none"}
                onValueChange={(v) =>
                  setForm({ ...form, category_id: v === "none" || v == null ? "" : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sem categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem categoria</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Pagamento</Label>
              <Select
                items={PAYMENT_METHOD_ITEMS}
                value={form.payment_method}
                onValueChange={(v) => setForm({ ...form, payment_method: v as PaymentMethod })}
                disabled={!form.paid}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">Pix</SelectItem>
                  <SelectItem value="cash">Dinheiro</SelectItem>
                  <SelectItem value="card">Cartão</SelectItem>
                  <SelectItem value="transfer">Transferência</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={form.paid}
              onChange={(e) => setForm({ ...form, paid: e.target.checked })}
              className="size-4 rounded border-zinc-300"
            />
            Já paga (marca como paga na data acima)
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={pending}>
            <Plus className="size-4" />
            Lançar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
