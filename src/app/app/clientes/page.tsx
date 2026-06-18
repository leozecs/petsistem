import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SectionHeading } from "@/components/app/section-heading";
import { clients } from "@/lib/data/demo";

export default function ClientsPage() {
  return (
    <div>
      <SectionHeading
        title="Clientes"
        description="CRUD de tutores com telefone, WhatsApp, email e endereço."
        action={<Button className="rounded-md bg-zinc-950 text-white hover:bg-zinc-800"><UserPlus className="size-4" />Novo cliente</Button>}
      />
      <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
          <Table className="min-w-[620px]">
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Pets</TableHead>
                <TableHead>Última visita</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.phone}>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>{client.phone}</TableCell>
                  <TableCell>{client.pets}</TableCell>
                  <TableCell>{client.lastVisit}</TableCell>
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
