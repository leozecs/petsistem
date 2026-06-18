import { ShieldCheck, UserCheck, UserCog, UserPlus, Users, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KpiCard } from "@/components/shared/kpi-card";
import { SectionHeading } from "@/components/app/section-heading";
import { StatusPill } from "@/components/shared/status-pill";

const kpis = [
  { label: "Total de usuários", value: "146", icon: Users },
  { label: "Donos", value: "42", icon: ShieldCheck },
  { label: "Atendentes", value: "61", icon: UserCog },
  { label: "Veterinários", value: "39", icon: UserCheck },
];

type Role = "Admin Master" | "Dono" | "Atendente" | "Veterinário";
type UserStatus = "Ativo" | "Suspenso" | "Convidado";

const users: { name: string; email: string; shop: string; role: Role; status: UserStatus; since: string }[] = [
  { name: "Leonardo Rodrigues", email: "leocodes.dev@gmail.com", shop: "Plataforma", role: "Admin Master", status: "Ativo", since: "12/05" },
  { name: "Marina Costa", email: "marina@petgres.com.br", shop: "Petgres", role: "Dono", status: "Ativo", since: "14/05" },
  { name: "Camila Souza", email: "camila@petgres.com.br", shop: "Petgres", role: "Atendente", status: "Ativo", since: "18/05" },
  { name: "Dra. Ana", email: "ana@petgres.com.br", shop: "Petgres", role: "Veterinário", status: "Ativo", since: "22/05" },
  { name: "Gustavo Lima", email: "gustavo@meupet.com.br", shop: "Meu Pet", role: "Dono", status: "Suspenso", since: "01/04" },
];

function roleTone(role: Role) {
  if (role === "Admin Master") return "neutral" as const;
  if (role === "Dono") return "success" as const;
  if (role === "Veterinário") return "warning" as const;
  return "neutral" as const;
}

function statusTone(s: UserStatus) {
  if (s === "Ativo") return "success" as const;
  if (s === "Suspenso") return "danger" as const;
  return "warning" as const;
}

export default function AdminUsuariosPage() {
  return (
    <div>
      <SectionHeading
        title="Usuários"
        description="Gestão de todos os usuários da plataforma, agrupados por loja e role."
        action={
          <Button className="rounded-md bg-zinc-950 text-white hover:bg-zinc-800">
            <UserPlus className="size-4" />
            Convidar usuário
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
          <CardTitle className="text-base">Diretório</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="min-w-[920px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Loja</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cadastro</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.email}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell className="text-zinc-600">{u.email}</TableCell>
                    <TableCell>{u.shop}</TableCell>
                    <TableCell>
                      <StatusPill tone={roleTone(u.role)}>{u.role}</StatusPill>
                    </TableCell>
                    <TableCell>
                      <StatusPill tone={statusTone(u.status)}>{u.status}</StatusPill>
                    </TableCell>
                    <TableCell>{u.since}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="outline" size="sm" className="rounded-md border-zinc-300 bg-white">
                          Editar
                        </Button>
                        <Button variant="outline" size="sm" className="rounded-md border-zinc-300 bg-white">
                          {u.status === "Suspenso" ? <UserCheck className="size-4" /> : <UserX className="size-4" />}
                          {u.status === "Suspenso" ? "Reativar" : "Suspender"}
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
