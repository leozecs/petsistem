"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import {
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Link as LinkIcon,
  MessageCircle,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import {
  deleteStepPhoto,
  toggleChecklistStep,
  uploadStepPhoto,
} from "@/app/app/checklist/actions";
import { cn } from "@/lib/utils";
import { ChecklistConfigDialog, type ChecklistTemplate } from "@/components/checklist/checklist-config-dialog";

type Status = "confirmed" | "checked_in" | "in_progress";

export type ChecklistStep = {
  stepId: string;
  label: string;
  done: boolean;
  photos: Array<{ id: string; url: string }>;
};

export type ChecklistCard = {
  appointmentId: string;
  petName: string;
  serviceName: string;
  area: "grooming" | "veterinary";
  status: Status;
  startIso: string;
  trackingSlug: string | null;
  tutorWhatsapp: string | null;
  tutorName: string | null;
  steps: ChecklistStep[];
};

const STATUS_LABEL: Record<Status, { label: string; tone: "amber" | "sky" | "emerald" }> = {
  confirmed: { label: "Agendado", tone: "sky" },
  checked_in: { label: "Chegou", tone: "amber" },
  in_progress: { label: "Em atendimento", tone: "emerald" },
};

const HOUR_FMT = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "America/Sao_Paulo",
});

export function ChecklistDayView({ cards, templates = [], canConfigure = false }: { cards: ChecklistCard[]; templates?: ChecklistTemplate[]; canConfigure?: boolean }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Checklist do dia</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Atendimentos de hoje com status agendado, chegou ou em atendimento. Clique no card pra
          expandir e marcar as etapas. Foto opcional por etapa.
        </p></div>
        {canConfigure ? <ChecklistConfigDialog templates={templates} /> : null}
      </div>

      {cards.length === 0 ? (
        <Card className="rounded-xl border-zinc-200 bg-white shadow-none">
          <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
            <ClipboardList className="size-8 text-zinc-300" />
            <p className="text-sm text-zinc-500">
              Nenhum atendimento na fila pra hoje. Quando alguém agendar e confirmar, aparece aqui.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {cards.map((c) => (
            <ChecklistCardItem key={c.appointmentId} card={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function ChecklistCardItem({ card }: { card: ChecklistCard }) {
  const [expanded, setExpanded] = useState(card.status === "in_progress");
  const doneCount = card.steps.filter((s) => s.done).length;
  const total = card.steps.length;
  const pct = total === 0 ? 0 : Math.round((doneCount / total) * 100);
  const tone = STATUS_LABEL[card.status];

  return (
    <Card className="rounded-xl border-zinc-200 bg-white shadow-none transition hover:border-zinc-300">
      <CardContent className="p-0">
        <div
          role="button"
          tabIndex={0}
          onClick={() => setExpanded((v) => !v)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setExpanded((v) => !v);
            }
          }}
          className="flex w-full cursor-pointer items-center gap-3 p-4 text-left"
        >
          <div className="font-mono text-sm tabular-nums text-zinc-500">
            {HOUR_FMT.format(new Date(card.startIso))}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-zinc-950">{card.petName}</p>
            <p className="truncate text-xs text-zinc-500">{card.serviceName}</p>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
              tone.tone === "sky" && "bg-sky-50 text-sky-700",
              tone.tone === "amber" && "bg-amber-50 text-amber-700",
              tone.tone === "emerald" && "bg-emerald-50 text-emerald-700",
            )}
          >
            {tone.label}
          </span>
          {total > 0 ? (
            <span className="font-mono text-xs tabular-nums text-zinc-500">
              {doneCount}/{total}
            </span>
          ) : null}
          {card.trackingSlug ? (
            <CopyLinkIconButton slug={card.trackingSlug} petName={card.petName} />
          ) : null}
          {expanded ? (
            <ChevronUp className="size-4 text-zinc-400" />
          ) : (
            <ChevronDown className="size-4 text-zinc-400" />
          )}
        </div>

        {expanded ? (
          <div className="border-t border-zinc-100 p-4">
            {total > 0 ? (
              <>
                <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className="h-full rounded-full bg-emerald-600 transition-[width]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <ul className="space-y-3">
                  {card.steps.map((step) => (
                    <StepRow
                      key={step.stepId}
                      appointmentId={card.appointmentId}
                      step={step}
                    />
                  ))}
                </ul>
              </>
            ) : (
              <p className="rounded-md bg-amber-50 p-3 text-xs text-amber-800">
                Esse serviço não tem etapas configuradas. Cadastre as etapas em
                Configurações &gt; Serviços (ou globais por loja).
              </p>
            )}
            {card.trackingSlug ? (
              <TrackingLinkButton
                slug={card.trackingSlug}
                petName={card.petName}
                tutorWhatsapp={card.tutorWhatsapp}
              />
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function StepRow({
  appointmentId,
  step,
}: {
  appointmentId: string;
  step: ChecklistStep;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  const toggle = () => {
    startTransition(async () => {
      const res = await toggleChecklistStep({
        appointment_id: appointmentId,
        step_id: step.stepId,
        done: !step.done,
      });
      if (!res.ok) toast.error(res.error);
    });
  };

  const uploadPhoto = (file: File) => {
    const fd = new FormData();
    fd.set("appointment_id", appointmentId);
    fd.set("step_id", step.stepId);
    fd.set("file", file);
    startTransition(async () => {
      const res = await uploadStepPhoto(fd);
      if (res.ok) toast.success("Foto enviada.");
      else toast.error(res.error);
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Apagar essa foto?")) return;
    startTransition(async () => {
      const res = await deleteStepPhoto({ id });
      if (res.ok) toast.success("Foto removida.");
      else toast.error(res.error);
    });
  };

  return (
    <li>
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={toggle}
          disabled={pending}
          className={cn(
            "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border transition",
            step.done
              ? "border-emerald-600 bg-emerald-600 text-white"
              : "border-zinc-300 bg-white text-transparent hover:border-zinc-500",
          )}
          aria-pressed={step.done}
          aria-label={step.done ? "Desmarcar etapa" : "Marcar etapa concluída"}
        >
          <Check className="size-4" strokeWidth={3} />
        </button>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-sm",
              step.done ? "text-zinc-400 line-through" : "font-medium text-zinc-900",
            )}
          >
            {step.label}
          </p>
          {step.photos.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-2">
              {step.photos.map((p) => (
                <li key={p.id} className="group relative">
                  <Image
                    src={p.url}
                    alt="Foto da etapa"
                    width={80}
                    height={80}
                    className="size-20 rounded-md object-cover"
                    unoptimized
                  />
                  <button
                    type="button"
                    onClick={() => handleDelete(p.id)}
                    disabled={pending}
                    className="absolute -right-1 -top-1 hidden size-6 items-center justify-center rounded-full bg-zinc-950 text-white shadow group-hover:flex"
                    aria-label="Apagar foto"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={pending}
            className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-[12px] font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
          >
            <Camera className="size-3.5" />
            {step.photos.length === 0 ? "Adicionar foto" : "Mais uma foto"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadPhoto(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>
    </li>
  );
}

function CopyLinkIconButton({ slug, petName }: { slug: string; petName: string }) {
  const copy = async (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/acompanhamento/${slug}`
        : `/acompanhamento/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link do tutor copiado.");
    } catch {
      toast.error("Não consegui copiar.");
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") copy(e);
      }}
      className="inline-flex size-7 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-900"
      aria-label={`Copiar link de acompanhamento de ${petName}`}
      title="Copiar link do tutor"
    >
      <LinkIcon className="size-3.5" />
    </button>
  );
}

function TrackingLinkButton({
  slug,
  petName,
  tutorWhatsapp,
}: {
  slug: string;
  petName: string;
  tutorWhatsapp: string | null;
}) {
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/acompanhamento/${slug}`
      : `/acompanhamento/${slug}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link do tutor copiado.");
    } catch {
      toast.error("Não consegui copiar.");
    }
  };

  // wa.me espera só dígitos. Se tem whatsapp do tutor, abre conversa direta com
  // texto pronto. Sem whatsapp, abre wa.me sem número (tutor escolhe contato).
  const waDigits = tutorWhatsapp ? tutorWhatsapp.replace(/\D/g, "") : "";
  const waText = encodeURIComponent(
    `Oi! Acompanhe o atendimento de ${petName} pelo link: ${url}`,
  );
  const waUrl = waDigits
    ? `https://wa.me/${waDigits}?text=${waText}`
    : `https://wa.me/?text=${waText}`;

  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
        <LinkIcon className="size-4 shrink-0 text-zinc-500" />
        <code className="flex-1 truncate font-mono text-[12px] text-zinc-700">{url}</code>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-md bg-zinc-950 px-2.5 py-1 text-[12px] font-medium text-white transition hover:bg-zinc-800"
          aria-label={`Copiar link de acompanhamento de ${petName}`}
        >
          Copiar
        </button>
      </div>
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-emerald-600 bg-emerald-600 px-3 py-2 text-[13px] font-semibold text-white transition hover:bg-emerald-700"
      >
        <MessageCircle className="size-4" />
        {waDigits
          ? "Enviar link pelo WhatsApp"
          : "Compartilhar link no WhatsApp"}
      </a>
    </div>
  );
}
