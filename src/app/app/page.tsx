import { Plus, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SectionHeading } from "@/components/app/section-heading";
import { KpiCard } from "@/components/shared/kpi-card";
import { StatusPill } from "@/components/shared/status-pill";
import { appointments, ownerKpis } from "@/lib/data/demo";

export default function AppDashboardPage() {
  return (
    <div>
      <SectionHeading
        title="Dashboard"
        description="Visão do dono para acompanhar agenda, veterinária e operação do dia."
        action={
          <Button className="rounded-md bg-zinc-950 text-white hover:bg-zinc-800">
            <Plus className="size-4" />
            Novo agendamento
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {ownerKpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Próximos agendamentos</CardTitle>
            <Button variant="outline" size="sm" className="rounded-md border-zinc-300 bg-white">
              Ver calendário
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table className="min-w-[720px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Horário</TableHead>
                    <TableHead>Pet</TableHead>
                    <TableHead>Serviço</TableHead>
                    <TableHead>Profissional</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.map((appointment) => (
                    <TableRow key={`${appointment.time}-${appointment.pet}`}>
                      <TableCell className="font-medium">{appointment.time}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-zinc-950">{appointment.pet}</p>
                          <p className="text-xs text-zinc-500">{appointment.tutor}</p>
                        </div>
                      </TableCell>
                      <TableCell>{appointment.service}</TableCell>
                      <TableCell>{appointment.professional}</TableCell>
                      <TableCell>
                        <StatusPill
                          tone={
                            appointment.status === "Em atendimento"
                              ? "success"
                              : appointment.status === "Pendente"
                                ? "warning"
                                : "neutral"
                          }
                        >
                          {appointment.status}
                        </StatusPill>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg border-zinc-200 bg-zinc-950 text-white shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Stethoscope className="size-4" />
              Veterinária
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-white/8 p-4">
              <p className="text-sm text-zinc-400">Consultas do dia</p>
              <p className="mt-2 text-4xl font-semibold">7</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-white/8 p-4">
                <p className="text-sm text-zinc-400">Retornos</p>
                <p className="mt-2 text-2xl font-semibold">2</p>
              </div>
              <div className="rounded-lg bg-white/8 p-4">
                <p className="text-sm text-zinc-400">Próximas</p>
                <p className="mt-2 text-2xl font-semibold">3</p>
              </div>
            </div>
            <p className="text-sm leading-6 text-zinc-300">
              A agenda veterinária é independente da agenda de banho e tosa, mantendo equipes e disponibilidade
              separadas.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
