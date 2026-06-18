import { Check, ClipboardCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeading } from "@/components/app/section-heading";
import { checklistSteps } from "@/lib/data/demo";
import { cn } from "@/lib/utils";

export default function ChecklistPage() {
  return (
    <div>
      <SectionHeading
        title="Checklist operacional"
        description="Fluxo timestampado por usuário para banho, tosa e retirada."
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
          <CardContent className="p-6">
            <div className="space-y-4">
              {checklistSteps.map((step, index) => (
                <div key={step.label} className="flex gap-4">
                  <div
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-lg border text-sm font-semibold",
                      step.done && "border-emerald-200 bg-emerald-50 text-emerald-700",
                      step.current && "border-amber-200 bg-amber-50 text-amber-700",
                      !step.done && !step.current && "border-zinc-200 bg-zinc-50 text-zinc-400",
                    )}
                  >
                    {step.done ? <Check className="size-4" /> : index + 1}
                  </div>
                  <div className="min-w-0 flex-1 border-b border-zinc-100 pb-4">
                    <p className="font-medium text-zinc-950">{step.label}</p>
                    <p className="mt-1 text-sm text-zinc-500">{step.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg border-zinc-200 bg-zinc-950 text-white shadow-none">
          <CardContent className="p-6">
            <ClipboardCheck className="size-7" />
            <h2 className="mt-5 text-xl font-semibold">Link do tutor</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-300">
              Cada checklist gera um código público para acompanhamento sem login. As atualizações usam Supabase
              Realtime quando o projeto estiver conectado.
            </p>
            <div className="mt-5 rounded-lg bg-white/10 p-4 font-mono text-sm">
              /acompanhamento/ABC123
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
