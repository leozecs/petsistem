"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeading } from "@/components/app/section-heading";

type Charge = {
  priceCents: number;
  paymentMethod: string | null;
  paidAt: string | null;
  serviceName: string;
};

type Expense = {
  description: string;
  amountCents: number;
  occurredOn: string;
  paymentMethod: string | null;
};

const MONTH_NAME = new Intl.DateTimeFormat("pt-BR", {
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

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dayOfPaid(paidAtIso: string | null): number {
  if (!paidAtIso) return 0;
  // Petshop TZ offset -180 already encoded in stored UTC; for grouping by day
  // within the month range we can use UTC day since the page query already
  // bounded by petshop midnights.
  const d = new Date(paidAtIso);
  return d.getUTCDate();
}

export function RelatoriosView({
  monthIso,
  year,
  month0,
  charges,
  expenses,
}: {
  monthIso: string;
  year: number;
  month0: number;
  charges: Charge[];
  expenses: Expense[];
}) {
  const router = useRouter();

  const totalReceived = useMemo(
    () => charges.reduce((s, c) => s + c.priceCents, 0),
    [charges],
  );
  const totalExpenses = useMemo(
    () => expenses.reduce((s, e) => s + e.amountCents, 0),
    [expenses],
  );
  const balance = totalReceived - totalExpenses;

  // Breakdown by payment method (received).
  const byMethod = useMemo(() => {
    const acc = new Map<string, number>();
    for (const c of charges) {
      const k = c.paymentMethod ?? "unknown";
      acc.set(k, (acc.get(k) ?? 0) + c.priceCents);
    }
    return Array.from(acc.entries())
      .map(([method, cents]) => ({ method, cents }))
      .sort((a, b) => b.cents - a.cents);
  }, [charges]);

  // Top services by revenue.
  const byService = useMemo(() => {
    const acc = new Map<string, { count: number; cents: number }>();
    for (const c of charges) {
      const k = c.serviceName;
      const cur = acc.get(k) ?? { count: 0, cents: 0 };
      acc.set(k, { count: cur.count + 1, cents: cur.cents + c.priceCents });
    }
    return Array.from(acc.entries())
      .map(([name, v]) => ({ name, count: v.count, cents: v.cents }))
      .sort((a, b) => b.cents - a.cents)
      .slice(0, 10);
  }, [charges]);

  // Per-day net (received minus expenses), keyed by day-of-month.
  const dailyNet = useMemo(() => {
    const daysInMonth = new Date(year, month0 + 1, 0).getDate();
    const rec = new Array<number>(daysInMonth + 1).fill(0);
    const exp = new Array<number>(daysInMonth + 1).fill(0);
    for (const c of charges) {
      rec[dayOfPaid(c.paidAt)] += c.priceCents;
    }
    for (const e of expenses) {
      const day = Number(e.occurredOn.split("-")[2] ?? 0);
      if (day >= 1 && day <= daysInMonth) exp[day] += e.amountCents;
    }
    return Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      received: rec[i + 1] ?? 0,
      expenses: exp[i + 1] ?? 0,
      net: (rec[i + 1] ?? 0) - (exp[i + 1] ?? 0),
    }));
  }, [charges, expenses, year, month0]);

  const maxAbs = useMemo(
    () => Math.max(1, ...dailyNet.map((d) => Math.max(d.received, d.expenses))),
    [dailyNet],
  );

  function navigateMonth(delta: number) {
    const next = new Date(year, month0 + delta, 1);
    const iso = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
    router.push(`/app/relatorios?month=${iso}`);
  }

  function navigateCurrent() {
    router.push("/app/relatorios");
  }

  const monthLabelRaw = MONTH_NAME.format(new Date(year, month0, 15));
  const monthLabel = monthLabelRaw.charAt(0).toUpperCase() + monthLabelRaw.slice(1);

  return (
    <div>
      <SectionHeading
        title="Relatórios"
        description="Resumo mensal de recebimentos, despesas e saldo. Dados a partir do que está marcado no Caixa."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="rounded-md border-zinc-200 bg-white"
          onClick={() => navigateMonth(-1)}
          aria-label="Mês anterior"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="min-w-[12rem] text-base font-semibold text-zinc-950">
          {monthLabel}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="rounded-md border-zinc-200 bg-white"
          onClick={() => navigateMonth(1)}
          aria-label="Próximo mês"
        >
          <ChevronRight className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="rounded-md border-zinc-200 bg-white"
          onClick={navigateCurrent}
        >
          Mês atual
        </Button>
        <span className="ml-auto text-xs text-zinc-500">{monthIso}</span>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-500">
              <ArrowDownCircle className="size-4 text-emerald-600" />
              Recebido
            </div>
            <p className="mt-2 text-2xl font-semibold text-zinc-950">
              {formatBRL(totalReceived)}
            </p>
            <p className="text-xs text-zinc-500">{charges.length} pagamento(s)</p>
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
              Saldo do mês
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

      {/* Daily bars */}
      <Card className="mb-4 rounded-lg border-zinc-200 bg-white shadow-none">
        <CardContent className="p-5">
          <h2 className="mb-4 text-sm font-semibold text-zinc-950">
            Movimento por dia
          </h2>
          <div className="flex h-40 items-end gap-0.5">
            {dailyNet.map((d) => {
              const recH = Math.round((d.received / maxAbs) * 100);
              const expH = Math.round((d.expenses / maxAbs) * 100);
              return (
                <div
                  key={d.day}
                  className="group flex flex-1 flex-col items-center justify-end"
                  title={`${String(d.day).padStart(2, "0")}: +${formatBRL(d.received)} / −${formatBRL(d.expenses)} · saldo ${formatBRL(d.net)}`}
                >
                  <div className="flex w-full items-end justify-center gap-px">
                    <div
                      className="w-1 rounded-t bg-emerald-500/80"
                      style={{ height: `${recH}%`, minHeight: d.received > 0 ? 2 : 0 }}
                    />
                    <div
                      className="w-1 rounded-t bg-rose-500/80"
                      style={{ height: `${expH}%`, minHeight: d.expenses > 0 ? 2 : 0 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between text-[0.625rem] text-zinc-500">
            <span>1</span>
            <span>{dailyNet.length}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* By method */}
        <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
          <CardContent className="p-5">
            <h2 className="mb-4 text-sm font-semibold text-zinc-950">
              Recebido por método
            </h2>
            {byMethod.length === 0 ? (
              <p className="text-sm text-zinc-500">Nenhum recebimento neste mês.</p>
            ) : (
              <ul className="space-y-2">
                {byMethod.map((m) => {
                  const pct = totalReceived > 0 ? (m.cents / totalReceived) * 100 : 0;
                  return (
                    <li key={m.method} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-zinc-700">
                          {METHOD_LABELS[m.method] ?? m.method}
                        </span>
                        <span className="text-zinc-700">
                          {formatBRL(m.cents)} · {pct.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
                        <div
                          className="h-full bg-zinc-950"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Top services */}
        <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
          <CardContent className="p-5">
            <h2 className="mb-4 text-sm font-semibold text-zinc-950">
              Top serviços
            </h2>
            {byService.length === 0 ? (
              <p className="text-sm text-zinc-500">Nenhum serviço recebido.</p>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {byService.map((s) => (
                  <li key={s.name} className="flex items-center justify-between py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-950">{s.name}</p>
                      <p className="text-xs text-zinc-500">{s.count} atendimento(s)</p>
                    </div>
                    <span className="text-sm font-semibold text-emerald-700">
                      {formatBRL(s.cents)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
