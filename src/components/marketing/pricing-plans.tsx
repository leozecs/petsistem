"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export type MarketingPlan = {
  code: string;
  name: string;
  priceCents: number;
  maxUsers: number;
  allowsVet: boolean;
  description: string | null;
};

const ANNUAL_PRICES: Record<string, { totalCents: number; monthlyCents: number }> = {
  starter: { totalCents: 54_000, monthlyCents: 4_500 },
  profissional: { totalCents: 108_000, monthlyCents: 9_000 },
  professional: { totalCents: 108_000, monthlyCents: 9_000 },
  premium: { totalCents: 151_200, monthlyCents: 12_600 },
};

function formatBRL(cents: number, fixed = false): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: fixed ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

export function PricingPlans({
  plans,
  recommendedIndex,
}: {
  plans: MarketingPlan[];
  recommendedIndex: number;
}) {
  const [annual, setAnnual] = useState(false);

  if (plans.length === 0) {
    return <p className="text-sm text-zinc-500">Planos em breve.</p>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-start gap-2 sm:items-end">
        <div
          className="relative grid grid-cols-2 rounded-full border border-zinc-200 bg-white p-1 shadow-sm"
          role="group"
          aria-label="Período de cobrança"
        >
          <span
            aria-hidden
            className={cn(
              "absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-zinc-950 transition-transform duration-300 ease-out motion-reduce:transition-none",
              annual && "translate-x-full",
            )}
          />
          <button
            type="button"
            onClick={() => setAnnual(false)}
            aria-pressed={!annual}
            className={cn(
              "relative z-10 min-h-10 rounded-full px-4 text-sm font-semibold transition-colors",
              !annual ? "text-white" : "text-zinc-600 hover:text-zinc-950",
            )}
          >
            Mensal
          </button>
          <button
            type="button"
            onClick={() => setAnnual(true)}
            aria-pressed={annual}
            className={cn(
              "relative z-10 min-h-10 rounded-full px-4 text-sm font-semibold transition-colors",
              annual ? "text-white" : "text-zinc-600 hover:text-zinc-950",
            )}
          >
            Anual
          </button>
        </div>
        <p className="text-xs font-medium text-emerald-800">
          Anual: 10% de desconto, cobrado uma vez por ano.
        </p>
      </div>

      <div className="grid items-stretch gap-4 sm:grid-cols-3" aria-live="polite">
        {plans.map((plan, index) => {
          const isRecommended = index === recommendedIndex;
          const annualPrice = ANNUAL_PRICES[plan.code.toLowerCase()];
          const displayCents = annual && annualPrice ? annualPrice.monthlyCents : plan.priceCents;

          return (
            <div
              key={plan.code}
              className={cn(
                "relative flex flex-col rounded-2xl border p-6 transition duration-300",
                isRecommended
                  ? "border-emerald-800/20 bg-emerald-800 text-[#f7f5ef] shadow-[0_24px_50px_-12px_rgba(6,78,59,0.35)] sm:-translate-y-4"
                  : "border-zinc-200 bg-white text-zinc-950 hover:-translate-y-1",
              )}
            >
              {isRecommended ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#f7f5ef] px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-900 shadow-sm">
                  Mais escolhido
                </span>
              ) : null}

              <h3 className="text-lg font-medium tracking-tight" style={{ fontFamily: "var(--font-bricolage)" }}>
                {plan.name}
              </h3>
              <p className={cn("mt-1.5 min-h-[3.25rem] text-[12.5px] leading-5", isRecommended ? "text-emerald-100" : "text-zinc-500")}>
                {plan.description ?? ""}
              </p>

              <div className="mt-5 min-h-[4.75rem]">
                <p className="flex items-end gap-1 whitespace-nowrap">
                  <span className="font-medium tracking-tight transition-opacity duration-200" style={{ fontFamily: "var(--font-bricolage)", fontSize: "2rem", lineHeight: 1, fontVariationSettings: "'wdth' 90" }}>
                    {formatBRL(displayCents, !annual)}
                  </span>
                  <span className={cn("pb-0.5 text-[12px]", isRecommended ? "text-emerald-100" : "text-zinc-500")}>
                    /mês
                  </span>
                </p>
                {annual && annualPrice ? (
                  <p className={cn("mt-2 text-xs", isRecommended ? "text-emerald-100" : "text-zinc-500")}>
                    {formatBRL(annualPrice.totalCents)} por ano · economize 10%
                  </p>
                ) : (
                  <p className={cn("mt-2 text-xs", isRecommended ? "text-emerald-100" : "text-zinc-500")}>
                    Cobrança mensal, sem taxa por agendamento
                  </p>
                )}
              </div>

              <ul className={cn("mt-6 flex-1 space-y-2.5 text-[13.5px]", isRecommended ? "text-emerald-50" : "text-zinc-700")}>
                {[`Até ${plan.maxUsers} pessoas usando`, "Agenda online no seu link", "Caixa do dia e relatório do mês"].map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <Check className={cn("mt-0.5 size-3.5 shrink-0", isRecommended ? "text-[#f7f5ef]" : "text-emerald-800")} strokeWidth={3} />
                    <span>{feature}</span>
                  </li>
                ))}
                <li className={cn("flex items-start gap-2.5", !plan.allowsVet && (isRecommended ? "opacity-60" : "text-zinc-400"))}>
                  {plan.allowsVet ? (
                    <Check className={cn("mt-0.5 size-3.5 shrink-0", isRecommended ? "text-[#f7f5ef]" : "text-emerald-800")} strokeWidth={3} />
                  ) : (
                    <Minus className="mt-0.5 size-3.5 shrink-0" strokeWidth={3} />
                  )}
                  <span>Agenda do veterinário e prontuário</span>
                </li>
              </ul>

              <Link
                href={`/signup?plan=${plan.code}&billing=${annual ? "annual" : "monthly"}`}
                className={cn(
                  "mt-8 inline-flex w-full items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold transition",
                  isRecommended ? "bg-[#f7f5ef] text-emerald-900 hover:bg-white" : "bg-zinc-950 text-[#f7f5ef] hover:bg-zinc-800",
                )}
              >
                Começar
                <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
