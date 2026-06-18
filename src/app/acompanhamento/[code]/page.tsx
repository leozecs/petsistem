import Link from "next/link";
import { ArrowLeft, Check, Clock, PawPrint } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { checklistSteps, tenant } from "@/lib/data/demo";
import { cn } from "@/lib/utils";

export default async function TrackingPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  return (
    <main className="min-h-[100dvh] bg-[#f5f7f1] px-4 py-6 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href={`/loja/${tenant.slug}`}
          className={cn(buttonVariants({ variant: "outline" }), "mb-6 rounded-md border-zinc-300 bg-white")}
        >
            <ArrowLeft className="size-4" />
            Voltar para a loja
        </Link>

        <Card className="rounded-xl border-zinc-200 bg-white shadow-none">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-zinc-500">Acompanhamento {code}</p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight">Luna está em atendimento</h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-600">
                  Timeline pública sem login. Quando conectado ao Supabase, esta tela recebe atualizações via Realtime.
                </p>
              </div>
              <div className="flex size-14 items-center justify-center rounded-lg bg-zinc-950 text-white">
                <PawPrint className="size-6" />
              </div>
            </div>

            <div className="mt-8 space-y-4">
              {checklistSteps.map((step) => (
                <div key={step.label} className="flex gap-4">
                  <div
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-lg border",
                      step.done && "border-emerald-200 bg-emerald-50 text-emerald-700",
                      step.current && "border-amber-200 bg-amber-50 text-amber-700",
                      !step.done && !step.current && "border-zinc-200 bg-zinc-50 text-zinc-400",
                    )}
                  >
                    {step.done ? <Check className="size-4" /> : <Clock className="size-4" />}
                  </div>
                  <div className="min-w-0 flex-1 border-b border-zinc-100 pb-4">
                    <p className="font-medium">{step.label}</p>
                    <p className="mt-1 text-sm text-zinc-500">{step.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
