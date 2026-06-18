import { Ban, CheckCircle2, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KpiCard } from "@/components/shared/kpi-card";
import { SectionHeading } from "@/components/app/section-heading";
import { StatusPill } from "@/components/shared/status-pill";
import { adminKpis } from "@/lib/data/demo";

const shops = [
  { name: "Petgres", subdomain: "petgres", status: "Ativa", revenue: "R$ 997,00", due: "25/06" },
  { name: "Petshop ABC", subdomain: "petshopabc", status: "Atrasado", revenue: "R$ 797,00", due: "10/06" },
  { name: "Meu Pet", subdomain: "meupet", status: "Bloqueada", revenue: "R$ 997,00", due: "02/06" },
];

export default function AdminMasterPage() {
  return (
    <div>
      <SectionHeading
        title="Visão geral"
        description="Gestão SaaS de lojas, assinaturas, bloqueios e métricas globais."
        action={
          <Button className="rounded-md bg-zinc-950 text-white hover:bg-zinc-800">
            <Store className="size-4" />
            Nova loja
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {adminKpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      <Card className="mt-6 rounded-lg border-zinc-200 bg-white shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Lojas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="min-w-[840px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Loja</TableHead>
                  <TableHead>Subdomínio</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Mensalidade</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shops.map((shop) => (
                  <TableRow key={shop.subdomain}>
                    <TableCell className="font-medium">{shop.name}</TableCell>
                    <TableCell>{shop.subdomain}.petsistem.com.br</TableCell>
                    <TableCell>
                      <StatusPill
                        tone={
                          shop.status === "Ativa"
                            ? "success"
                            : shop.status === "Bloqueada"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {shop.status}
                      </StatusPill>
                    </TableCell>
                    <TableCell>{shop.revenue}</TableCell>
                    <TableCell>{shop.due}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-md border-zinc-300 bg-white"
                        >
                          <CheckCircle2 className="size-4" />
                          Reativar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-md border-zinc-300 bg-white"
                        >
                          <Ban className="size-4" />
                          Bloquear
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
