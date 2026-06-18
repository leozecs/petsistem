import { CalendarPlus, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SectionHeading } from "@/components/app/section-heading";
import { StatusPill } from "@/components/shared/status-pill";
import { appointments } from "@/lib/data/demo";

const hours = ["08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"];

export default function CalendarsPage() {
  return (
    <div>
      <SectionHeading
        title="Calendários"
        description="Visualização operacional das agendas de banho e tosa e veterinária."
        action={
          <Button className="rounded-md bg-zinc-950 text-white hover:bg-zinc-800">
            <CalendarPlus className="size-4" />
            Criar horário
          </Button>
        }
      />

      <Tabs defaultValue="grooming" className="space-y-6">
        <TabsList className="rounded-lg bg-white p-1">
          <TabsTrigger value="grooming" className="rounded-md">Banho e Tosa</TabsTrigger>
          <TabsTrigger value="vet" className="rounded-md">Veterinária</TabsTrigger>
        </TabsList>
        {[
          ["grooming", "Banho e Tosa"],
          ["vet", "Veterinária"],
        ].map(([value, area]) => (
          <TabsContent key={value} value={value}>
            <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
              <CardContent className="p-0">
                <div className="grid border-b border-zinc-200 md:grid-cols-3">
                  {["Mensal", "Semanal", "Diária"].map((mode) => (
                    <button
                      key={mode}
                      className="h-12 border-b border-zinc-200 text-sm font-medium text-zinc-600 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0"
                    >
                      {mode}
                    </button>
                  ))}
                </div>
                <div className="grid divide-y divide-zinc-100">
                  {hours.map((hour) => {
                    const booked = appointments.find((appointment) => appointment.time.startsWith(hour.slice(0, 2)));
                    return (
                      <div key={`${area}-${hour}`} className="grid gap-4 p-4 md:grid-cols-[100px_1fr] md:items-center">
                        <div className="flex items-center gap-2 text-sm font-medium text-zinc-600">
                          <Clock className="size-4" />
                          {hour}
                        </div>
                        {booked && booked.area === area ? (
                          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="font-medium text-zinc-950">{booked.pet} - {booked.service}</p>
                                <p className="mt-1 text-sm text-zinc-500">{booked.tutor} com {booked.professional}</p>
                              </div>
                              <StatusPill tone="neutral">{booked.status}</StatusPill>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-500">
                            Horário disponível
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
