import { Bell, MessageCircle, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KpiCard } from "@/components/shared/kpi-card";
import { SectionHeading } from "@/components/app/section-heading";
import { StatusPill } from "@/components/shared/status-pill";

const kpis = [
  { label: "A cobrar agora", value: "9", icon: Bell },
  { label: "Cobradas no mês", value: "21", icon: Send },
  { label: "Sem resposta", value: "3", icon: MessageCircle },
];

const billings = [
  { shop: "Petshop ABC", owner: "Marina Costa", phone: "5519988880011", amount: "R$ 139,00", due: "10/06/2026", lastSent: "Nunca" },
  { shop: "Meu Pet", owner: "Gustavo Lima", phone: "5519977770202", amount: "R$ 229,00", due: "02/06/2026", lastSent: "12/06" },
  { shop: "Vet & Cia", owner: "Paula Ribeiro", phone: "5519966663030", amount: "R$ 349,00", due: "30/06/2026", lastSent: "—" },
];

function buildWaLink(phone: string, shop: string, amount: string, due: string) {
  const text = encodeURIComponent(
    [
      "Olá!",
      "",
      "Sua mensalidade do PETSISTEM encontra-se disponível.",
      "",
      `Loja: ${shop}`,
      `Valor: ${amount}`,
      `Vencimento: ${due}`,
      "",
      'Após o pagamento, acesse sua área de assinatura e clique em "Pago!" para análise e confirmação.',
    ].join("\n"),
  );
  return `https://wa.me/${phone}?text=${text}`;
}

export default function AdminCobrancasPage() {
  return (
    <div>
      <SectionHeading
        title="Cobranças"
        description="Envie cobranças via WhatsApp com a mensagem padrão do PETSISTEM."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      <Card className="mt-6 rounded-lg border-zinc-200 bg-white shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Clientes a cobrar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="min-w-[840px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Loja</TableHead>
                  <TableHead>Dono</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Última cobrança</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billings.map((b) => (
                  <TableRow key={b.shop}>
                    <TableCell className="font-medium">{b.shop}</TableCell>
                    <TableCell>{b.owner}</TableCell>
                    <TableCell className="font-mono text-xs text-zinc-600">+{b.phone}</TableCell>
                    <TableCell>{b.amount}</TableCell>
                    <TableCell>{b.due}</TableCell>
                    <TableCell>
                      <StatusPill tone={b.lastSent === "Nunca" || b.lastSent === "—" ? "warning" : "neutral"}>
                        {b.lastSent}
                      </StatusPill>
                    </TableCell>
                    <TableCell className="text-right">
                      <a
                        href={buildWaLink(b.phone, b.shop, b.amount, b.due)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
                      >
                        <MessageCircle className="size-4" />
                        COBRAR
                      </a>
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
