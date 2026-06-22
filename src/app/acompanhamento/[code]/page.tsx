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

  // Tudo que não é checklist foi removido a pedido: a página pública é APENAS
  // o checklist. Mantemos um header mínimo (loja + pet + serviço) só pra dar
  // contexto pro tutor de qual atendimento é. Nada de data/hora, status badge,
  // observações internas, WhatsApp ou macro fallback.
  void statusInfo;
  void formatDateTimeBR;
  void macroIdx;
  void MACRO_LABEL;

  return (
    <main className="min-h-[100dvh] bg-[#f7f5ef] px-4 py-8 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-xl space-y-4">
        <div className="flex items-center gap-3 px-2">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-[#f7f5ef]">
            <PawPrint className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              {shopName}
            </p>
            <p
              className="truncate text-xl font-semibold tracking-tight text-zinc-950"
              style={{ fontFamily: "var(--font-bricolage)" }}
            >
              {petName}
            </p>
            <p className="truncate text-xs text-zinc-500">{serviceName}</p>
          </div>
        </div>

        {!isTerminal && steps.length > 0 ? (
          <Card className="rounded-2xl border-zinc-200 bg-white shadow-sm">
            <CardContent className="p-6 sm:p-8">
              <div className="flex items-baseline justify-between">
                <p className="text-sm font-semibold text-zinc-900">Checklist</p>
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
        ) : isTerminal ? (
          <Card className="rounded-2xl border-zinc-200 bg-white shadow-sm">
            <CardContent className="p-6 text-center">
              <p className="text-sm text-zinc-600">
                {status === "cancelled"
                  ? "Atendimento cancelado."
                  : "Pet não compareceu."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-2xl border-zinc-200 bg-white shadow-sm">
            <CardContent className="flex items-center gap-2 p-5">
              <Camera className="size-4 shrink-0 text-zinc-400" />
              <p className="text-sm text-zinc-600">
                O atendimento ainda não começou. As etapas aparecem aqui quando
                {" "}o pet entrar no banho.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
