"use client";

import { useState } from "react";
import { Check, Copy, CreditCard } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { pixPayloadForPlan } from "@/lib/billing/pix-payloads";

export function PixPaymentCard({ planName }: { planName: string }) {
  const [copied, setCopied] = useState(false);
  const payload = pixPayloadForPlan(planName);
  const copy = async () => {
    await navigator.clipboard.writeText(payload);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  };
  return <Card className="rounded-lg border-zinc-800 bg-zinc-950 text-white shadow-none"><CardContent className="p-6"><CreditCard className="size-7" /><h2 className="mt-4 text-xl font-semibold">Pagamento via Pix</h2><p className="mt-2 text-sm text-zinc-300">Escaneie o QR Code ou copie o código do plano {planName}.</p><div className="mx-auto mt-5 w-fit rounded-xl bg-white p-3"><QRCodeSVG value={payload} size={190} level="M" /></div><Button onClick={copy} className="mt-5 w-full bg-white text-zinc-950 hover:bg-zinc-200">{copied ? <Check className="size-4" /> : <Copy className="size-4" />}{copied ? "Pix copiado" : "Copiar Pix copia e cola"}</Button></CardContent></Card>;
}
