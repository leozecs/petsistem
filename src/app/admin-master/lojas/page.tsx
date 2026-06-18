import { Ban, CheckCircle2, ExternalLink, PenLine, Store, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KpiCard } from "@/components/shared/kpi-card";
import { SectionHeading } from "@/components/app/section-heading";
import { StatusPill } from "@/components/shared/status-pill";

const kpis = [
  { label: "Lojas totais", value: "42", icon: Store },
  { label: "Ativas", value: "36", icon: CheckCircle2 },
  { label: "Bloqueadas", value: "2", icon: Ban },
  { label: "Atrasadas", value: "4", icon: Ban },
];

const shops = [
  { name: "Petgres", slug: "petgres", plan: "Profissional", status: "Ativa", owner: "Leonardo Rodrigues", since: "12/05/2026" },
  { name: "Petshop ABC", slug: "petshopabc", plan: "Essencial", status: "Atrasada", owner: "Marina Costa", since: "03/04/2026" },
  { name: "Meu Pet", slug: "meupet", plan: "Profissional", status: "Bloqueada", owner: "Gustavo Lima", since: "21/03/2026" },
  { name: "Vet & Cia", slug: "vetcia", plan: "Premium", status: "Ativa", owner: "Paula Ribeiro", since: "14/02/2026" },
];

export default function AdminLojasPage() {
  return (
    <div>
      <SectionHeading
        title="Lojas"
        description="Cadastre, edite, bloqueie ou acesse como suporte qualquer loja da plataforma."
        action={
          <Button className="rounded-md bg-zinc-950 text-white hover:bg-zinc-800">
            <Store className="size-4" />
            Nova loja
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      <Card className="mt-6 rounded-lg border-zinc-200 bg-white shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Lojas cadastradas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="min-w-[960px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Loja</TableHead>
                  <TableHead>Subdomínio</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Dono</TableHead>
                  <TableHead>Cadastro</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shops.map((shop) => (
                  <TableRow key={shop.slug}>
                    <TableCell className="font-medium">{shop.name}</TableCell>
                    <TableCell className="font-mono text-xs text-zinc-600">{shop.slug}.petsistem.com.br</TableCell>
                    <TableCell>{shop.plan}</TableCell>
                    <TableCell>{shop.owner}</TableCell>
                    <TableCell>{shop.since}</TableCell>
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
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="outline" size="sm" className="rounded-md border-zinc-300 bg-white">
                          <ExternalLink className="size-4" />
                          Acessar
                        </Button>
                        <Button variant="outline" size="sm" className="rounded-md border-zinc-300 bg-white">
                          <PenLine className="size-4" />
                          Editar
                        </Button>
                        <Button variant="outline" size="sm" className="rounded-md border-zinc-300 bg-white">
                          {shop.status === "Bloqueada" ? <CheckCircle2 className="size-4" /> : <Ban className="size-4" />}
                          {shop.status === "Bloqueada" ? "Reativar" : "Bloquear"}
                        </Button>
                        <Button variant="outline" size="sm" className="rounded-md border-rose-200 bg-white text-rose-700 hover:bg-rose-50">
                          <Trash2 className="size-4" />
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
