import { ArrowDownRight, ArrowUpRight, CalendarRange, Filter, Plus, Receipt, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KpiCard } from "@/components/shared/kpi-card";
import { SectionHeading } from "@/components/app/section-heading";
import { StatusPill } from "@/components/shared/status-pill";

const kpis = [
  { label: "Receita do mês", value: "R$ 18.430", trend: "+12%", icon: ArrowUpRight },
  { label: "Despesa do mês", value: "R$ 7.890", trend: "−4%", icon: ArrowDownRight },
  { label: "Lucro líquido", value: "R$ 10.540", trend: "+18%", icon: TrendingUp },
  { label: "Tickets pagos", value: "126", icon: Receipt },
];

const revenues = [
  { date: "18/06", description: "Banho + Tosa - Luna", category: "Banho e Tosa", amount: "R$ 140,00" },
  { date: "18/06", description: "Consulta - Thor", category: "Veterinária", amount: "R$ 160,00" },
  { date: "17/06", description: "Vacinação - Nina", category: "Veterinária", amount: "R$ 120,00" },
  { date: "17/06", description: "Hidratação - Bob", category: "Banho e Tosa", amount: "R$ 95,00" },
  { date: "16/06", description: "Banho - Pipoca", category: "Banho e Tosa", amount: "R$ 70,00" },
  { date: "16/06", description: "Consulta - Apolo", category: "Veterinária", amount: "R$ 160,00" },
  { date: "15/06", description: "Tosa - Mel", category: "Banho e Tosa", amount: "R$ 90,00" },
  { date: "15/06", description: "Banho + Tosa - Belinha", category: "Banho e Tosa", amount: "R$ 140,00" },
  { date: "14/06", description: "Consulta - Rex", category: "Veterinária", amount: "R$ 160,00" },
  { date: "14/06", description: "Vacinação - Toby", category: "Veterinária", amount: "R$ 120,00" },
];

const expenses = [
  { date: "18/06", description: "Shampoo profissional", category: "Insumos", amount: "R$ 320,00" },
  { date: "17/06", description: "Aluguel", category: "Fixa", amount: "R$ 2.400,00" },
  { date: "17/06", description: "Conta de luz", category: "Utilidades", amount: "R$ 480,00" },
  { date: "16/06", description: "Internet", category: "Utilidades", amount: "R$ 199,00" },
  { date: "15/06", description: "Salário Camila", category: "Folha", amount: "R$ 2.100,00" },
  { date: "15/06", description: "Salário Renan", category: "Folha", amount: "R$ 1.900,00" },
  { date: "14/06", description: "Material veterinário", category: "Insumos", amount: "R$ 540,00" },
  { date: "13/06", description: "Contador", category: "Serviços", amount: "R$ 380,00" },
  { date: "12/06", description: "Toalhas e descartáveis", category: "Insumos", amount: "R$ 210,00" },
  { date: "11/06", description: "Manutenção tosadora", category: "Manutenção", amount: "R$ 180,00" },
];

const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export default function FinanceiroPage() {
  return (
    <div>
      <SectionHeading
        title="Financeiro"
        description="Receitas e despesas da loja com filtros por mês, ano e categoria."
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" className="rounded-md border-zinc-300 bg-white">
              <Filter className="size-4" />
              Filtros
            </Button>
            <Button className="rounded-md bg-zinc-950 text-white hover:bg-zinc-800">
              <Plus className="size-4" />
              Novo lançamento
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      <Card className="mt-6 rounded-lg border-zinc-200 bg-white shadow-none">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-700">
            <CalendarRange className="size-4" />
            Período
          </div>
          <Select defaultValue="6">
            <SelectTrigger className="h-9 w-40 rounded-md border-zinc-300 bg-white">
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent>
              {months.map((m, i) => (
                <SelectItem key={m} value={String(i + 1)}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select defaultValue="2026">
            <SelectTrigger className="h-9 w-28 rounded-md border-zinc-300 bg-white">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2026">2026</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
            </SelectContent>
          </Select>
          <StatusPill tone="neutral">Junho/2026</StatusPill>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowUpRight className="size-4 text-emerald-600" />
              Receitas
            </CardTitle>
            <Button variant="outline" size="sm" className="rounded-md border-zinc-300 bg-white">
              Ver mais
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revenues.map((r, i) => (
                    <TableRow key={`${r.date}-${i}`}>
                      <TableCell className="font-mono text-xs text-zinc-600">{r.date}</TableCell>
                      <TableCell className="font-medium">{r.description}</TableCell>
                      <TableCell className="text-zinc-600">{r.category}</TableCell>
                      <TableCell className="text-right font-semibold text-emerald-700">{r.amount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowDownRight className="size-4 text-rose-600" />
              Despesas
            </CardTitle>
            <Button variant="outline" size="sm" className="rounded-md border-zinc-300 bg-white">
              Ver mais
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((e, i) => (
                    <TableRow key={`${e.date}-${i}`}>
                      <TableCell className="font-mono text-xs text-zinc-600">{e.date}</TableCell>
                      <TableCell className="font-medium">{e.description}</TableCell>
                      <TableCell className="text-zinc-600">{e.category}</TableCell>
                      <TableCell className="text-right font-semibold text-rose-700">{e.amount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
