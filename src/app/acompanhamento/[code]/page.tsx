import { notFound } from "next/navigation";
import { Check, Clock, PawPrint } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidTrackingSlug } from "@/lib/tracking/slug";
import { cn } from "@/lib/utils";

// Página pública SEM auth. Tutor abre o link no celular. Endpoint segue regras
// estritas:
//  - usa createAdminClient (RLS não deixaria anon ler)
//  - select hardcoded de colunas seguras: pet.name, service.name, status,
//    starts_at, petshop.name + checklist resumido. NUNCA telefone, valor,
//    tutor_name explícito, notes internas.
//  - slug humano-friendly inclui token random anti-enumerável; ainda assim
//    validamos formato pra evitar SSRF/path injection.
//  - cache off pra refletir avanço de status sem stale.
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, { label: string; tone: "amber" | "emerald" | "rose" }> = {
  pending: { label: "Aguardando confirmação", tone: "amber" },
  confirmed: { label: "Agendamento confirmado", tone: "amber" },
  checked_in: { label: "Chegou na loja", tone: "amber" },
  in_progress: { label: "Em atendimento", tone: "amber" },
  finished: { label: "Pronto pra retirada", tone: "emerald" },
  cancelled: { label: "Atendimento cancelado", tone: "rose" },
  no_show: { label: "Não compareceu", tone: "rose" },
};

const FLOW = ["confirmed", "checked_in", "in_progress", "finished"] as const;
const FLOW_LABEL: Record<(typeof FLOW)[number], string> = {
  confirmed: "Agendado",
  checked_in: "Chegou",
  in_progress: "Em atendimento",
  finished: "Pronto",
};

function formatDateTimeBR(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

type RawAppt = {
  id: string;
  status: string;
  starts_at: string;
  ends_at: string;
  pet: { name: string; species: string } | null;
  service: { name: string } | null;
  petshop: { name: string; primary_color: string | null; whatsapp: string | null } | null;
  checklist: {
    products: string[] | null;
    arrival_condition: string | null;
    notes: string | null;
  } | null;
};

export default async function TrackingPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  if (!isValidTrackingSlug(code)) {
    notFound();
  }

  const admin = createAdminClient();
  if (!admin) notFound();

  const { data, error } = await admin
    .from("appointments")
    .select(
      "id, status, starts_at, ends_at, pet:pets(name, species), service:services(name), petshop:petshops(name, primary_color, whatsapp), checklist:appointment_checklists(products, arrival_condition, notes)",
    )
    .eq("tracking_slug", code)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) notFound();
  const appt = data as unknown as RawAppt;

  const status = appt.status;
  const statusInfo = STATUS_LABEL[status] ?? { label: "Status atual", tone: "amber" as const };
  const currentStepIdx = FLOW.indexOf(status as (typeof FLOW)[number]);
  const isTerminal = status === "cancelled" || status === "no_show";
  const petName = appt.pet?.name ?? "Seu pet";
  const serviceName = appt.service?.name ?? "Atendimento";
  const shopName = appt.petshop?.name ?? "Petshop";
  const showChecklist =
    appt.checklist && (status === "in_progress" || status === "finished");

  return (
    <main className="min-h-[100dvh] bg-[#f7f5ef] px-4 py-6 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl space-y-4">
        <Card className="rounded-2xl border-zinc-200 bg-white shadow-sm">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  {shopName}
                </p>
                <h1
                  className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950"
                  style={{ fontFamily: "var(--font-bricolage)" }}
                >
                  {petName}
                </h1>
                <p className="mt-1 text-sm text-zinc-600">{serviceName}</p>
                <p className="mt-2 text-xs text-zinc-500">{formatDateTimeBR(appt.starts_at)}</p>
              </div>
              <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-[#f7f5ef]">
                <PawPrint className="size-6" />
              </div>
            </div>

            <div
              className={cn(
                "mt-6 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium",
                statusInfo.tone === "emerald" &&
                  "border-emerald-200 bg-emerald-50 text-emerald-800",
                statusInfo.tone === "amber" &&
                  "border-amber-200 bg-amber-50 text-amber-800",
                statusInfo.tone === "rose" &&
                  "border-rose-200 bg-rose-50 text-rose-800",
              )}
            >
              <span
                className={cn(
                  "size-2 rounded-full",
                  statusInfo.tone === "emerald" && "bg-emerald-600",
                  statusInfo.tone === "amber" && "bg-amber-600",
                  statusInfo.tone === "rose" && "bg-rose-600",
                )}
              />
              {statusInfo.label}
            </div>
          </CardContent>
        </Card>

        {!isTerminal ? (
          <Card className="rounded-2xl border-zinc-200 bg-white shadow-sm">
            <CardContent className="p-6 sm:p-8">
              <p className="text-sm font-semibold text-zinc-900">Acompanhamento</p>
              <ol className="mt-4 space-y-3">
                {FLOW.map((step, idx) => {
                  const done = currentStepIdx >= idx;
                  const current = currentStepIdx === idx && status !== "finished";
                  return (
                    <li key={step} className="flex gap-4">
                      <div
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-lg border",
                          done && !current && "border-emerald-200 bg-emerald-50 text-emerald-700",
                          current && "border-amber-200 bg-amber-50 text-amber-700",
                          !done && "border-zinc-200 bg-zinc-50 text-zinc-400",
                        )}
                      >
                        {done && !current ? (
                          <Check className="size-4" strokeWidth={3} />
                        ) : (
                          <Clock className="size-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 border-b border-zinc-100 pb-3">
                        <p
                          className={cn(
                            "text-sm",
                            (done || current) ? "font-medium text-zinc-900" : "text-zinc-500",
                          )}
                        >
                          {FLOW_LABEL[step]}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </CardContent>
          </Card>
        ) : null}

        {showChecklist ? (
          <Card className="rounded-2xl border-zinc-200 bg-white shadow-sm">
            <CardContent className="p-6 sm:p-8">
              <p className="text-sm font-semibold text-zinc-900">O que foi feito</p>
              {appt.checklist?.arrival_condition ? (
                <p className="mt-3 text-sm text-zinc-700">
                  <span className="font-medium">Chegada: </span>
                  {appt.checklist.arrival_condition}
                </p>
              ) : null}
              {appt.checklist?.products && appt.checklist.products.length > 0 ? (
                <div className="mt-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Produtos usados
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {appt.checklist.products.map((p) => (
                      <li
                        key={p}
                        className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs text-zinc-800"
                      >
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {appt.checklist?.notes ? (
                <div className="mt-3 rounded-lg bg-zinc-50 p-3 text-sm text-zinc-700">
                  {appt.checklist.notes}
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        <p className="text-center text-xs text-zinc-500">
          Esta página atualiza sozinha conforme o atendimento avança. Em caso de dúvida, fale com
          {appt.petshop?.whatsapp ? (
            <>
              {" "}
              o {shopName} no WhatsApp{" "}
              <a
                href={`https://wa.me/${appt.petshop.whatsapp.replace(/\D/g, "")}`}
                className="font-medium text-emerald-800 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                aqui
              </a>
              .
            </>
          ) : (
            ` o ${shopName}.`
          )}
        </p>
      </div>
    </main>
  );
}
