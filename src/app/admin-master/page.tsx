import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Ban,
  CheckCircle2,
  Store,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeading } from "@/components/app/section-heading";
import { StatusPill } from "@/components/shared/status-pill";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

type PetshopStatus = Database["public"]["Enums"]["petshop_status"];

const ROOT_DOMAIN =
  process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "petsistem.com.br";

const STATUS_LABEL: Record<PetshopStatus, string> = {
  active: "Ativa",
  blocked: "Bloqueada",
  trial: "Teste",
  cancelled: "Cancelada",
};

function statusTone(s: PetshopStatus): "success" | "warning" | "danger" | "neutral" {
  if (s === "active") return "success";
  if (s === "trial") return "warning";
  if (s === "blocked") return "danger";
  return "neutral";
}

const BR_DATE = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "America/Sao_Paulo",
});

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default async function AdminMasterPage() {
  const session = await getSession();
  if (!session || session.user.globalRole !== "admin_master") {
    redirect("/login?error=not-authorized");
  }
  const admin = createAdminClient();
  if (!admin) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        Service role do Supabase não configurado — a Visão geral precisa dele.
      </div>
    );
  }

  const now = new Date();
  // Janela pra MRR: pagamentos mensais nos últimos 35 dias, anuais nos últimos
  // 370 dias. Anual entra dividido por 12 pra virar contribuição mensal
  // recorrente equivalente.
  const mrrMonthlyCutoff = new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000);
  const mrrAnnualCutoff = new Date(now.getTime() - 370 * 24 * 60 * 60 * 1000);

  const [shopsRes, recentRes, totalRevRes, mrrPayRes] = await Promise.all([
    admin
      .from("petshops")
      .select("id, status")
      .is("deleted_at", null),
    admin
      .from("petshops")
      .select("id, name, subdomain, status, plan_name, created_at")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(10),
    // Faturamento Total = soma cumulativa de todos os pagamentos confirmados.
    admin
      .from("payments")
      .select("amount_cents")
      .eq("status", "paid")
      .is("deleted_at", null),
    // MRR: pega pagamentos confirmados dos últimos 370 dias e reduz pra 1 por
    // petshop (o mais recente). Anuais entram divididos por 12.
    admin
      .from("payments")
      .select("petshop_id, amount_cents, billing_cycle, paid_at")
      .eq("status", "paid")
      .is("deleted_at", null)
      .gte("paid_at", mrrAnnualCutoff.toISOString())
      .not("paid_at", "is", null)
      .order("paid_at", { ascending: false }),
  ]);

  type ShopRow = { id: string; status: PetshopStatus };
  const shops = (shopsRes.data ?? []) as ShopRow[];
  const totalShops = shops.length;
  const activeShops = shops.filter((s) => s.status === "active").length;
  const blockedShops = shops.filter((s) => s.status === "blocked").length;

  const totalRevenueCents = (totalRevRes.data ?? []).reduce(
    (sum, row) => sum + (row.amount_cents ?? 0),
    0,
  );

  const mrrContributingIds = new Set(
    shops
      .filter((s) => s.status === "active" || s.status === "trial")
      .map((s) => s.id),
  );
  const latestByShop = new Map<
    string,
    { amount: number; cycle: "monthly" | "annual"; paidAt: Date }
  >();
  for (const row of mrrPayRes.data ?? []) {
    const shopId = row.petshop_id as string | null;
    if (!shopId || !mrrContributingIds.has(shopId)) continue;
    if (latestByShop.has(shopId)) continue;
    latestByShop.set(shopId, {
      amount: row.amount_cents ?? 0,
      cycle: row.billing_cycle === "annual" ? "annual" : "monthly",
      paidAt: new Date(row.paid_at as string),
    });
  }
  let mrrCents = 0;
  for (const entry of latestByShop.values()) {
    if (entry.cycle === "monthly" && entry.paidAt >= mrrMonthlyCutoff) {
      mrrCents += entry.amount;
    } else if (entry.cycle === "annual" && entry.paidAt >= mrrAnnualCutoff) {
      mrrCents += Math.round(entry.amount / 12);
    }
  }

  const recent = recentRes.data ?? [];

  return (
    <div>
      <SectionHeading
        title="Visão geral"
        description="Snapshot da plataforma toda: faturamento, MRR e status das lojas."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-lg border-emerald-200 bg-emerald-50/40 shadow-none">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-emerald-800">
              <Wallet className="size-4 text-emerald-700" />
              Faturamento total
            </div>
            <p className="mt-2 text-2xl font-semibold text-zinc-950">
              {formatBRL(totalRevenueCents)}
            </p>
            <p className="text-xs text-emerald-800/70">
              Cumulativo desde o início — inclui anuais e mensais.
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-lg border-sky-200 bg-sky-50/40 shadow-none">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-sky-800">
              <TrendingUp className="size-4 text-sky-700" />
              MRR
            </div>
            <p className="mt-2 text-2xl font-semibold text-zinc-950">
              {formatBRL(mrrCents)}
            </p>
            <p className="text-xs text-sky-800/70">
              Recorrente mensal (anual ÷ 12) · {latestByShop.size} loja(s) contribuindo
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-500">
              <Store className="size-4 text-zinc-700" />
              Lojas totais
            </div>
            <p className="mt-2 text-2xl font-semibold text-zinc-950">{totalShops}</p>
            <p className="text-xs text-zinc-500">{blockedShops} bloqueadas</p>
          </CardContent>
        </Card>
        <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-500">
              <CheckCircle2 className="size-4 text-emerald-600" />
              Ativas
            </div>
            <p className="mt-2 text-2xl font-semibold text-zinc-950">{activeShops}</p>
            <p className="text-xs text-zinc-500">Pagando e operando</p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
        <CardContent className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-sm font-semibold text-zinc-950">Últimas lojas</h2>
            <Link
              href="/admin-master/lojas"
              className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-zinc-700 hover:text-zinc-950"
            >
              Ver todas <ArrowRight className="size-3" />
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="rounded-md border border-dashed border-zinc-200 p-6 text-center text-sm text-zinc-500">
              <Ban className="mx-auto mb-2 size-4" />
              Nenhuma loja cadastrada ainda.{" "}
              <Link
                href="/admin-master/lojas"
                className="font-medium underline underline-offset-2"
              >
                Criar a primeira
              </Link>
              .
            </div>
          ) : (
            <>
            <div className="space-y-3 md:hidden">
              {recent.map((petshop) => (
                <Link
                  key={petshop.id}
                  href="/admin-master/lojas"
                  className="block rounded-lg border border-zinc-200 bg-zinc-50/70 p-4 transition hover:border-zinc-300 hover:bg-zinc-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-950">{petshop.name}</p>
                      <p className="mt-1 truncate font-mono text-xs text-zinc-500">
                        {petshop.subdomain}.{ROOT_DOMAIN}
                      </p>
                    </div>
                    <StatusPill tone={statusTone(petshop.status as PetshopStatus)}>
                      {STATUS_LABEL[petshop.status as PetshopStatus]}
                    </StatusPill>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
                    <span>{petshop.plan_name}</span>
                    <span>{BR_DATE.format(new Date(petshop.created_at))}</span>
                  </div>
                </Link>
              ))}
            </div>
            <div className="hidden md:block">
              <Table className="min-w-[640px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Loja</TableHead>
                    <TableHead>Subdomínio</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criada em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>
                        <span className="font-mono text-xs text-zinc-700">
                          {p.subdomain}.{ROOT_DOMAIN}
                        </span>
                      </TableCell>
                      <TableCell>{p.plan_name}</TableCell>
                      <TableCell>
                        <StatusPill tone={statusTone(p.status as PetshopStatus)}>
                          {STATUS_LABEL[p.status as PetshopStatus]}
                        </StatusPill>
                      </TableCell>
                      <TableCell className="text-zinc-600">
                        {BR_DATE.format(new Date(p.created_at))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
