import { Check, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionHeading } from "@/components/app/section-heading";
import { StatusPill } from "@/components/shared/status-pill";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Starter",
    price: "R$ 139",
    cadence: "/mês",
    description: "Operação enxuta de Banho e Tosa, sem veterinário.",
    features: [
      "Dono + Atendente",
      "Agendamentos ilimitados",
      "Checklist operacional",
      "Portal do cliente",
      "Sem veterinário",
    ],
    stores: 12,
    tone: "neutral" as const,
  },
  {
    name: "Profissional",
    price: "R$ 229",
    cadence: "/mês",
    description: "Operação completa com veterinário liberado e até 5 usuários.",
    features: [
      "Dono + Atendente + Veterinário",
      "Até 5 usuários",
      "Calendários separados (banho/vet)",
      "Consultas com observação clínica",
      "Relatórios de operação",
    ],
    stores: 24,
    tone: "success" as const,
    highlight: true,
  },
  {
    name: "Premium",
    price: "R$ 349",
    cadence: "/mês",
    description: "Múltiplas equipes, suporte prioritário e até 12 usuários.",
    features: [
      "Permissões completas",
      "Até 12 usuários",
      "Suporte prioritário",
      "Auditoria avançada",
      "Acesso ao Admin Master",
    ],
    stores: 6,
    tone: "neutral" as const,
  },
];

export default function AdminPlanosPage() {
  return (
    <div>
      <SectionHeading
        title="Planos"
        description="Gestão de planos comerciais, limites de usuários e atribuição às lojas."
        action={
          <Button className="rounded-md bg-zinc-950 text-white hover:bg-zinc-800">
            <CreditCard className="size-4" />
            Novo plano
          </Button>
        }
      />

      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={cn(
              "rounded-lg border-zinc-200 bg-white shadow-none",
              plan.highlight && "border-zinc-950 ring-2 ring-zinc-950",
            )}
          >
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle className="text-base">{plan.name}</CardTitle>
              <StatusPill tone={plan.tone}>{plan.stores} lojas</StatusPill>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <p className="flex items-baseline gap-1 text-4xl font-semibold text-zinc-950">
                  {plan.price}
                  <span className="text-base font-normal text-zinc-500">{plan.cadence}</span>
                </p>
                <p className="mt-2 text-sm text-zinc-600">{plan.description}</p>
              </div>
              <ul className="space-y-2 text-sm text-zinc-700">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-md border-zinc-300 bg-white">
                  Editar
                </Button>
                <Button className="flex-1 rounded-md bg-zinc-950 text-white hover:bg-zinc-800">
                  Atribuir
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
