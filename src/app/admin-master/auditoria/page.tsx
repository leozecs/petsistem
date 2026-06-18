import { Filter, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SectionHeading } from "@/components/app/section-heading";
import { StatusPill } from "@/components/shared/status-pill";

type EventTone = "success" | "warning" | "danger" | "neutral";

const events: { when: string; actor: string; action: string; entity: string; shop: string; tone: EventTone }[] = [
  { when: "18/06 14:32", actor: "Leonardo Rodrigues", action: "Acesso suporte", entity: "petshops/petgres", shop: "Petgres", tone: "warning" },
  { when: "18/06 13:18", actor: "Marina Costa", action: "Confirmou pagamento", entity: "payments/2c3a", shop: "Petgres", tone: "success" },
  { when: "18/06 09:04", actor: "Sistema", action: "Bloqueio automático", entity: "petshops/meupet", shop: "Meu Pet", tone: "danger" },
  { when: "17/06 16:51", actor: "Gustavo Lima", action: "Editou checklist", entity: "checklist_steps/8f01", shop: "Meu Pet", tone: "neutral" },
  { when: "17/06 11:23", actor: "Camila Souza", action: "Cadastrou cliente", entity: "clients/a91c", shop: "Petgres", tone: "neutral" },
];

export default function AdminAuditoriaPage() {
  return (
    <div>
      <SectionHeading
        title="Auditoria"
        description="Trilha completa de ações administrativas, suporte e mudanças de status."
        action={
          <Button variant="outline" className="rounded-md border-zinc-300 bg-white">
            <Filter className="size-4" />
            Filtrar
          </Button>
        }
      />

      <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Eventos recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="min-w-[840px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Quando</TableHead>
                  <TableHead>Ator</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Entidade</TableHead>
                  <TableHead>Loja</TableHead>
                  <TableHead>Severidade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((e, i) => (
                  <TableRow key={`${e.when}-${i}`}>
                    <TableCell className="font-mono text-xs text-zinc-600">{e.when}</TableCell>
                    <TableCell className="font-medium">{e.actor}</TableCell>
                    <TableCell>{e.action}</TableCell>
                    <TableCell className="font-mono text-xs text-zinc-600">{e.entity}</TableCell>
                    <TableCell>{e.shop}</TableCell>
                    <TableCell>
                      <StatusPill tone={e.tone}>
                        {e.tone === "success" ? "Info" : e.tone === "warning" ? "Atenção" : e.tone === "danger" ? "Crítico" : "Neutro"}
                      </StatusPill>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
            <ShieldCheck className="size-4" />
            Toda ação de suporte (Admin Master entrando em uma loja) é registrada com o ID do alvo.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
