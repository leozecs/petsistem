import Image from "next/image";
import { notFound } from "next/navigation";
import { Camera, Check, Clock, PawPrint } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidTrackingSlug } from "@/lib/tracking/slug";
import { cn } from "@/lib/utils";

// Página pública SEM auth. Regras estritas:
//  - createAdminClient (RLS bloqueia anon read)
//  - select hardcoded de colunas seguras; ZERO PII (sem telefone, valor, tutor)
//  - slug validado por regex antes da query (anti path-injection)
//  - cache off pra refletir avanços
//  - fotos via signed URL (60min) — bucket privado nunca expõe path bruto
export const dynamic = "force-dynamic";

const SIGNED_URL_TTL_SECONDS = 60 * 60; // 60 min

const STATUS_LABEL: Record<string, { label: string; tone: "amber" | "emerald" | "rose" | "sky" }> = {
  pending: { label: "Aguardando confirmação", tone: "amber" },
  confirmed: { label: "Agendamento confirmado", tone: "sky" },
  checked_in: { label: "Chegou na loja", tone: "amber" },
  in_progress: { label: "Em atendimento", tone: "amber" },
  finished: { label: "Pronto pra retirada", tone: "emerald" },
  cancelled: { label: "Atendimento cancelado", tone: "rose" },
  no_show: { label: "Não compareceu", tone: "rose" },
};

const MACRO_FLOW = ["confirmed", "checked_in", "in_progress", "finished"] as const;
const MACRO_LABEL: Record<(typeof MACRO_FLOW)[number], string> = {
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
  petshop_id: string;
  status: string;
  starts_at: string;
  ends_at: string;
  service_id: string | null;
  pet: { name: string; species: string } | null;
  service: { name: string } | null;
  petshop: { name: string; primary_color: string | null; whatsapp: string | null } | null;
  checklist_meta: {
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
  if (!isValidTrackingSlug(code)) notFound();

  const admin = createAdminClient();
  if (!admin) notFound();

  const { data, error } = await admin
    .from("appointments")
    .select(
      "id, petshop_id, status, starts_at, ends_at, service_id, pet:pets(name, species), service:services(name), petshop:petshops(name, primary_color, whatsapp), checklist_meta:appointment_checklists(products, arrival_condition, notes)",
    )
    .eq("tracking_slug", code)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) notFound();
  const appt = data as unknown as RawAppt;

  const status = appt.status;
  const statusInfo = STATUS_LABEL[status] ?? { label: "Status atual", tone: "amber" as const };
  const isTerminal = status === "cancelled" || status === "no_show";
  const petName = appt.pet?.name ?? "Seu pet";
  const serviceName = appt.service?.name ?? "Atendimento";
  const shopName = appt.petshop?.name ?? "Petshop";

  // Fetch etapas REAIS do serviço (com fallback global)
  type Step = { id: string; label: string; position: number; done: boolean; doneAt: string | null; photos: string[] };
  let steps: Step[] = [];

  if (appt.service_id) {
    const { data: specific } = await admin
      .from("checklist_steps")
      .select("id, label, position")
      .eq("petshop_id", appt.petshop_id)
      .eq("active", true)
      .eq("service_id", appt.service_id)
      .order("position");
    if ((specific ?? []).length === 0) {
      const { data: global } = await admin
        .from("checklist_steps")
        .select("id, label, position")
        .eq("petshop_id", appt.petshop_id)
        .eq("active", true)
        .is("service_id", null)
        .order("position");
      steps = (global ?? []).map((s) => ({
        id: s.id,
        label: s.label,
        position: s.position,
        done: false,
        doneAt: null,
        photos: [],
      }));
    } else {
      steps = (specific ?? []).map((s) => ({
        id: s.id,
        label: s.label,
        position: s.position,
        done: false,
        doneAt: null,
        photos: [],
      }));
    }
  } else {
    const { data: global } = await admin
      .from("checklist_steps")
      .select("id, label, position")
      .eq("petshop_id", appt.petshop_id)
      .eq("active", true)
      .is("service_id", null)
      .order("position");
    steps = (global ?? []).map((s) => ({
      id: s.id,
      label: s.label,
      position: s.position,
      done: false,
      doneAt: null,
      photos: [],
    }));
  }

  // Marca status real das etapas + colhe fotos
  if (steps.length > 0) {
    const { data: rows } = await admin
      .from("checklists")
      .select("id, step_id, completed_at")
      .eq("appointment_id", appt.id);

    const rowsArr = rows ?? [];
    const checklistIdByStep = new Map<string, string>();
    for (const r of rowsArr) {
      checklistIdByStep.set(r.step_id, r.id);
      const idx = steps.findIndex((s) => s.id === r.step_id);
      if (idx >= 0 && r.completed_at) {
        steps[idx]!.done = true;
        steps[idx]!.doneAt = r.completed_at;
      }
    }

    const checklistIds = rowsArr.map((r) => r.id);
    if (checklistIds.length > 0) {
      const { data: photos } = await admin
        .from("appointment_step_photos")
        .select("checklist_id, photo_path")
        .in("checklist_id", checklistIds)
        .order("created_at");

      const paths = (photos ?? []).map((p) => p.photo_path);
      const signedByPath = new Map<string, string>();
      if (paths.length > 0) {
        const { data: signed } = await admin.storage
          .from("appointment-photos")
          .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
        for (const s of signed ?? []) {
          if (s.path && s.signedUrl) signedByPath.set(s.path, s.signedUrl);
        }
      }

      for (const ph of photos ?? []) {
        const stepIdForChecklist = rowsArr.find((r) => r.id === ph.checklist_id)?.step_id;
        if (!stepIdForChecklist) continue;
        const idx = steps.findIndex((s) => s.id === stepIdForChecklist);
        const url = signedByPath.get(ph.photo_path);
        if (idx >= 0 && url) steps[idx]!.photos.push(url);
      }
    }
  }

  const doneCount = steps.filter((s) => s.done).length;
  const pct = steps.length > 0 ? Math.round((doneCount / steps.length) * 100) : 0;
  const macroIdx = MACRO_FLOW.indexOf(status as (typeof MACRO_FLOW)[number]);

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
                statusInfo.tone === "sky" && "border-sky-200 bg-sky-50 text-sky-800",
                statusInfo.tone === "rose" &&
                  "border-rose-200 bg-rose-50 text-rose-800",
              )}
            >
              <span
                className={cn(
                  "size-2 rounded-full",
                  statusInfo.tone === "emerald" && "bg-emerald-600",
                  statusInfo.tone === "amber" && "bg-amber-600",
                  statusInfo.tone === "sky" && "bg-sky-600",
                  statusInfo.tone === "rose" && "bg-rose-600",
                )}
              />
              {statusInfo.label}
            </div>
          </CardContent>
        </Card>

        {!isTerminal && steps.length > 0 ? (
          <Card className="rounded-2xl border-zinc-200 bg-white shadow-sm">
            <CardContent className="p-6 sm:p-8">
              <div className="flex items-baseline justify-between">
                <p className="text-sm font-semibold text-zinc-900">
                  Etapas do atendimento
                </p>
                <span className="font-mono text-xs tabular-nums text-zinc-500">
                  {doneCount}/{steps.length}
                </span>
              </div>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-emerald-600 transition-[width]"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <ol className="mt-5 space-y-4">
                {steps.map((step) => (
                  <li key={step.id} className="flex gap-4">
                    <div
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-lg border",
                        step.done
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-zinc-200 bg-zinc-50 text-zinc-400",
                      )}
                    >
                      {step.done ? (
                        <Check className="size-4" strokeWidth={3} />
                      ) : (
                        <Clock className="size-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-sm",
                          step.done ? "font-medium text-zinc-900" : "text-zinc-500",
                        )}
                      >
                        {step.label}
                      </p>
                      {step.photos.length > 0 ? (
                        <ul className="mt-3 flex flex-wrap gap-2">
                          {step.photos.map((url, i) => (
                            <li key={i}>
                              <Image
                                src={url}
                                alt={`Foto da etapa ${step.label}`}
                                width={96}
                                height={96}
                                className="size-24 rounded-md object-cover"
                                unoptimized
                              />
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        ) : !isTerminal ? (
          // Fallback macro: serviço ainda não tem etapas configuradas
          <Card className="rounded-2xl border-zinc-200 bg-white shadow-sm">
            <CardContent className="p-6 sm:p-8">
              <p className="text-sm font-semibold text-zinc-900">Acompanhamento</p>
              <ol className="mt-4 space-y-3">
                {MACRO_FLOW.map((step, idx) => {
                  const done = macroIdx >= idx;
                  const current = macroIdx === idx && status !== "finished";
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
                          {MACRO_LABEL[step]}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </CardContent>
          </Card>
        ) : null}

        {appt.checklist_meta &&
        (status === "in_progress" || status === "finished") &&
        (appt.checklist_meta.arrival_condition ||
          (appt.checklist_meta.products && appt.checklist_meta.products.length > 0) ||
          appt.checklist_meta.notes) ? (
          <Card className="rounded-2xl border-zinc-200 bg-white shadow-sm">
            <CardContent className="p-6 sm:p-8">
              <p className="text-sm font-semibold text-zinc-900">Observações</p>
              {appt.checklist_meta.arrival_condition ? (
                <p className="mt-3 text-sm text-zinc-700">
                  <span className="font-medium">Chegada: </span>
                  {appt.checklist_meta.arrival_condition}
                </p>
              ) : null}
              {appt.checklist_meta.products && appt.checklist_meta.products.length > 0 ? (
                <div className="mt-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Produtos usados
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {appt.checklist_meta.products.map((p) => (
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
              {appt.checklist_meta.notes ? (
                <div className="mt-3 rounded-lg bg-zinc-50 p-3 text-sm text-zinc-700">
                  {appt.checklist_meta.notes}
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {steps.length === 0 && !isTerminal ? (
          <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white p-3 text-xs text-zinc-500">
            <Camera className="size-3.5" />
            Quando o atendimento começar, as etapas e fotos aparecem aqui.
          </div>
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
