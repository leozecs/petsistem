import { Activity, CheckCircle2, CircleDollarSign, Clock, FileBarChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KpiCard } from "@/components/shared/kpi-card";
import { SectionHeading } from "@/components/app/section-heading";
import { StatusPill } from "@/components/shared/status-pill";

const kpis = [
  { label: "MRR", value: "R$ 41,8k", trend: "+R$ 2,1k", icon: CircleDollarSign },
  { label: "Pagas no mês", value: "32", icon: CheckCircle2 },
  { label: "A confirmar", value: "5", icon: Clock },
  { label: "Atrasadas", value: "4", icon: Activity },
];

const filters = ["Todas", "Pagas", "Pendentes", "Atrasadas", "A confirmar", "Bloqueadas"];

type Status = "Paga" | "Pendente" | "Atrasada" | "A confirmar" | "Bloqueada";

const subscriptions: {
  shop: string;
  plan: string;
  amount: string;
  due: string;
  status: Status;
  proof?: string;
}[] = [
  { shop: "Petgres", plan: "Profissional", amount: "R$ 229,00", due: "25/06/2026", status: "Paga" },
  { shop: "Petshop ABC", plan: "Starter", amount: "R$ 139,00", due: "10/06/2026", status: "Atrasada" },
  { shop: "Vet & Cia", plan: "Premium", amount: "R$ 349,00", due: "30/06/2026", status: "A confirmar", proof: "comprovante-vetcia.pdf" },
  { shop: "Meu Pet", plan: "Profissional", amount: "R$ 229,00", due: "02/06/2026", status: "Bloqueada" },
];

function toneFor(status: Status) {
  if (status === "Paga") return "success" as const;
  if (status === "Atrasada" || status === "Bloqueada") return "danger" as const;
  if (status === "A confirmar") return "warning" as const;
  return "neutral" as const;
}

export default function AdminAssinaturasPage() {
  return (
    <div>
      <SectionHeading
        title="Assinaturas"
        description="Acompanhe pagamentos, confirme Pix manuais e gerencie status financeiro das lojas."
        action={
          <Button variant="outline" className="rounded-md border-zinc-300 bg-white">
            <FileBarChart className="size-4" />
            Exportar
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {filters.map((filter, idx) => (
          <Button
            key={filter}
            variant={idx === 0 ? "default" : "outline"}
            size="sm"
            className={
              idx === 0
                ? "rounded-md bg-zinc-950 text-white hover:bg-zinc-800"
                : "rounded-md border-zinc-300 bg-white"
            }
          >
            {filter}
          </Button>
        ))}
      </div>

      <Card className="mt-6 rounded-lg border-zinc-200 bg-white shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Assinaturas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="min-w-[840px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Loja</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Comprovante</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((sub) => (
                  <TableRow key={sub.shop}>
                    <TableCell className="font-medium">{sub.shop}</TableCell>
                    <TableCell>{sub.plan}</TableCell>
                    <TableCell>{sub.amount}</TableCell>
                    <TableCell>{sub.due}</TableCell>
                    <TableCell>
                      <StatusPill tone={toneFor(sub.status)}>{sub.status}</StatusPill>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-zinc-600">{sub.proof ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {sub.status === "A confirmar" ? (
                          <Button size="sm" className="rounded-md bg-zinc-950 text-white hover:bg-zinc-800">
                            Confirmar pagamento
                          </Button>
                        ) : null}
                        <Button variant="outline" size="sm" className="rounded-md border-zinc-300 bg-white">
                          Ver detalhes
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
