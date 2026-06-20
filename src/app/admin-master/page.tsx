import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Ban,
  CalendarCheck,
  CheckCircle2,
  Store,
  Users,
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
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  const [shopsRes, usersRes, apptRes, recentRes] = await Promise.all([
    admin.from("petshops").select("status").is("deleted_at", null),
    admin
      .from("users")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null),
    admin
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .gte("starts_at", monthStart.toISOString())
      .lt("starts_at", monthEnd.toISOString())
      .is("deleted_at", null),
    admin
      .from("petshops")
      .select("id, name, subdomain, status, plan_name, created_at")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  type ShopStat = { status: PetshopStatus };
  const shops = (shopsRes.data ?? []) as ShopStat[];
  const totalShops = shops.length;
  const activeShops = shops.filter((s) => s.status === "active").length;
  const blockedShops = shops.filter((s) => s.status === "blocked").length;

  const totalUsers = usersRes.count ?? 0;
  const monthAppts = apptRes.count ?? 0;

  const recent = recentRes.data ?? [];

  return (
    <div>
      <SectionHeading
        title="Visão geral"
        description="Snapshot da plataforma toda: lojas ativas, usuários e agendamentos do mês."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-500">
              <Store className="size-4 text-zinc-700" />
              Lojas totais
            </div>
            <p className="mt-2 text-2xl font-semibold text-zinc-950">{totalShops}</p>
          </CardContent>
        </Card>
        <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-500">
              <CheckCircle2 className="size-4 text-emerald-600" />
              Ativas
            </div>
            <p className="mt-2 text-2xl font-semibold text-zinc-950">{activeShops}</p>
            <p className="text-xs text-zinc-500">{blockedShops} bloqueadas</p>
          </CardContent>
        </Card>
        <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-500">
              <Users className="size-4 text-zinc-700" />
              Usuários totais
            </div>
            <p className="mt-2 text-2xl font-semibold text-zinc-950">{totalUsers}</p>
            <p className="text-xs text-zinc-500">Inclui Admin Master + tenants</p>
          </CardContent>
        </Card>
        <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-500">
              <CalendarCheck className="size-4 text-zinc-700" />
              Agend. neste mês
            </div>
            <p className="mt-2 text-2xl font-semibold text-zinc-950">{monthAppts}</p>
            <p className="text-xs text-zinc-500">Todas as lojas</p>
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
            <div className="overflow-x-auto">
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
