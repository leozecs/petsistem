"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, CheckCircle2, ClipboardCheck, MessageCircle, MoreHorizontal, Play, Send } from "lucide-react";
import { toast } from "sonner";
import { updateAppointmentStatus } from "@/app/app/calendarios/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Database } from "@/lib/supabase/database.types";

type Status = Database["public"]["Enums"]["appointment_status"];
export type AtendimentoCard = { id: string; startsAt: string; status: Status; trackingSlug: string | null; serviceName: string; area: "grooming" | "veterinary"; petName: string; tutorName: string; whatsapp: string | null };
const STATUS: Record<Status, string> = { pending: "A confirmar", confirmed: "Confirmado", checked_in: "Chegou", in_progress: "Em atendimento", finished: "Finalizado", cancelled: "Cancelado", no_show: "Não compareceu" };

export function AtendimentosView({ cards }: { cards: AtendimentoCard[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<AtendimentoCard | null>(null);
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const advance = (status: Status) => {
    if (!selected) return;
    startTransition(async () => {
      const result = await updateAppointmentStatus(selected.id, status);
      if (!result.ok) { toast.error(result.error ?? "Erro ao atualizar."); return; }
      toast.success("Atendimento atualizado."); setSelected(null); router.refresh();
    });
  };
  return <div className="space-y-5"><div><h1 className="text-2xl font-semibold tracking-tight">Atendimentos</h1><p className="mt-1 text-sm text-zinc-600">Controle central dos atendimentos de hoje.</p></div>
    {cards.length === 0 ? <Card className="border-zinc-200 shadow-none"><CardContent className="p-10 text-center text-sm text-zinc-500">Nenhum atendimento hoje.</CardContent></Card> : <div className="grid gap-3 lg:grid-cols-2">{cards.map((card) => <Card key={card.id} className="border-zinc-200 bg-white shadow-none"><CardContent className="flex items-center gap-4 p-5"><div className="font-mono text-sm font-semibold">{new Date(card.startsAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div><div className="min-w-0 flex-1"><p className="truncate font-semibold">{card.petName} · {card.serviceName}</p><p className="text-xs text-zinc-500">{card.tutorName} · {STATUS[card.status]}</p></div><Button size="sm" variant="outline" onClick={() => setSelected(card)}><MoreHorizontal className="size-4" /> Gerenciar</Button></CardContent></Card>)}</div>}
    <Dialog open={selected !== null} onOpenChange={(open) => { if (!open) { setSelected(null); setWhatsappOpen(false); } }}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>{selected?.petName} · {selected?.serviceName}</DialogTitle></DialogHeader>{selected ? <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">{selected.status === "pending" ? <Button onClick={() => advance("confirmed")} disabled={pending}><CheckCircle2 className="size-4" /> Confirmar</Button> : null}{selected.status === "confirmed" ? <Button onClick={() => advance("checked_in")} disabled={pending}><CheckCircle2 className="size-4" /> Registrar chegada</Button> : null}{selected.status === "checked_in" ? <Button onClick={() => advance("in_progress")} disabled={pending}><Play className="size-4" /> Iniciar</Button> : null}<Button variant="outline" onClick={() => setWhatsappOpen((value) => !value)}><MessageCircle className="size-4" /> WhatsApp</Button><Button variant="outline" render={<Link href="/app/checklist" />}><ClipboardCheck className="size-4" /> Ver checklist</Button><Button variant="outline" render={<Link href="/app/calendarios" />}><CalendarClock className="size-4" /> Reagendar / finalizar</Button></div>
      {whatsappOpen ? <WhatsappOptions card={selected} /> : null}
    </div> : null}</DialogContent></Dialog>
  </div>;
}

function WhatsappOptions({ card }: { card: AtendimentoCard }) {
  const phone = (card.whatsapp ?? "").replace(/\D/g, "");
  const tracking = card.trackingSlug && typeof window !== "undefined" ? `${window.location.origin}/acompanhamento/${card.trackingSlug}` : "";
  const options = [
    `Olá, ${card.tutorName}! Confirmamos o agendamento de ${card.petName}.`,
    `Acompanhe o atendimento de ${card.petName}: ${tracking}`,
    `O atendimento de ${card.petName} foi finalizado. Já pode vir buscar ou aguardar a entrega, conforme combinado.`,
  ];
  return <div className="space-y-2 rounded-lg bg-zinc-50 p-3">{options.map((message, index) => <a key={message} href={`https://wa.me/${phone}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-md border border-zinc-200 bg-white p-3 text-sm font-medium hover:bg-zinc-50"><Send className="size-4 text-emerald-600" />{index === 0 ? "Confirmar agendamento" : index === 1 ? "Enviar acompanhamento" : "Avisar finalização"}</a>)}</div>;
}
