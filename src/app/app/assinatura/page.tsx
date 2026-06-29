import { BellRing } from "lucide-react";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeading } from "@/components/app/section-heading";
import { StatusPill } from "@/components/shared/status-pill";
import { hasRole, requireTenant } from "@/lib/auth/require-tenant";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { currencyBRL } from "@/lib/tenant";
import { PixPaymentCard } from "@/components/assinatura/pix-payment-card";

type SubscriptionStatus = Database["public"]["Enums"]["subscription_status"];

const statusPresentation: Record<
  SubscriptionStatus,
  { label: string; tone: "success" | "warning" | "danger" }
> = {
  paid: { label: "Pago", tone: "success" },
  pending: { label: "Pendente", tone: "warning" },
  confirming: { label: "Em confirmação", tone: "warning" },
  overdue: { label: "Vencida", tone: "danger" },
  blocked: { label: "Bloqueada", tone: "danger" },
};

function formatDateOnly(value: string): string {
  const [year, month, day] = value.split("-");
  return day && month && year ? `${day}/${month}/${year}` : value;
}

export default async function SubscriptionPage() {
  const { membership } = await requireTenant({ allowBlocked: true });
  if (!hasRole(membership, ["owner"])) redirect("/app");

  const supabase = await createClient();
  if (!supabase) redirect("/login?error=supabase-not-configured");

  const subscriptionResult = await supabase
      .from("subscriptions")
      .select("id, petshop_id, plan_name, amount_cents, due_date, status, created_at")
      .eq("petshop_id", membership.petshopId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

  const subscription = subscriptionResult.data;
  const error = subscriptionResult.error;

  if (error) {
    console.error("Failed to load tenant subscription", {
      code: error.code,
      petshopId: membership.petshopId,
    });

    return (
      <div>
        <SectionHeading
          title="Minha Assinatura"
          description="Plano, vencimento, Pix manual e status financeiro da loja."
        />
        <Card className="rounded-lg border-rose-200 bg-rose-50 shadow-none">
          <CardContent className="p-6 text-sm text-rose-800">
            Não foi possível carregar a assinatura agora. Tente novamente em instantes.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div>
        <SectionHeading
          title="Minha Assinatura"
          description="Plano, vencimento, Pix manual e status financeiro da loja."
        />
        <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
          <CardContent className="p-6">
            <p className="font-semibold text-zinc-950">Nenhuma assinatura cadastrada</p>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Ainda não existe um ciclo de assinatura vinculado a {membership.petshop.name}.
              Entre em contato com o suporte para regularizar o cadastro.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const status = statusPresentation[subscription.status];

  return (
    <div>
      <SectionHeading
        title="Minha Assinatura"
        description={`Plano, vencimento e status financeiro de ${membership.petshop.name}.`}
      />
      {membership.petshop.status === "blocked" ? <div className="mb-5 flex items-start gap-3 rounded-lg border border-rose-300 bg-rose-50 p-4 text-rose-950"><BellRing className="mt-0.5 size-5 shrink-0" /><div><p className="font-semibold">Trial ou assinatura expirada</p><p className="mt-1 text-sm">Regularize no Pix abaixo. Após validação manual do Admin Master, login libera de novo.</p></div></div> : null}
      {subscription.status !== "paid" ? <div className="mb-5 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950"><BellRing className="mt-0.5 size-5 shrink-0" /><div><p className="font-semibold">Pagamento mensal pendente</p><p className="mt-1 text-sm">Pague até o vencimento. Após 3 dias de atraso, o acesso do dono e da equipe poderá ser suspenso até a regularização.</p></div></div> : null}
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
          <CardContent className="grid gap-6 p-6 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-zinc-500">Plano</p>
              <p className="mt-2 text-3xl font-semibold">{subscription.plan_name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500">Valor mensal</p>
              <p className="mt-2 text-3xl font-semibold">
                {currencyBRL(subscription.amount_cents)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500">Vencimento</p>
              <p className="mt-2 text-xl font-semibold">
                {formatDateOnly(subscription.due_date)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500">Status</p>
              <div className="mt-3">
                <StatusPill tone={status.tone}>{status.label}</StatusPill>
              </div>
            </div>
          </CardContent>
        </Card>

        <PixPaymentCard planName={subscription.plan_name} subscriptionId={subscription.id} status={subscription.status} />
      </div>
    </div>
  );
}
