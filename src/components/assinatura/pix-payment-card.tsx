"use client";

import { useState, useTransition } from "react";
import { Check, Copy, CreditCard, ScanLine } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { reportSubscriptionPaid } from "@/app/app/assinatura/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { pixPayloadForPlan } from "@/lib/billing/pix-payloads";

type PixPaymentCardProps = {
  planName: string;
  subscriptionId: string;
  status: string;
};

export function PixPaymentCard({
  planName,
  subscriptionId,
  status,
}: PixPaymentCardProps) {
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const payload = pixPayloadForPlan(planName);
  const confirming = status === "confirming";

  async function copyPix() {
    await navigator.clipboard.writeText(payload);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  }

  function reportPaid() {
    startTransition(async () => {
      const result = await reportSubscriptionPaid(subscriptionId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Pagamento enviado para validação.");
    });
  }

  return (
    <Card className="rounded-lg border-zinc-800 bg-zinc-950 text-white shadow-none">
      <CardContent className="p-6">
        <CreditCard className="size-7" />
        <h2 className="mt-4 text-xl font-semibold">Pagamento via Pix</h2>
        <p className="mt-2 text-sm text-zinc-300">
          Escaneie o QR Code ou copie o código do plano {planName}.
        </p>

        <div className="mt-5 flex items-center justify-center gap-2 rounded-lg bg-emerald-400/10 px-3 py-2 text-center text-sm font-semibold text-emerald-200">
          <ScanLine className="size-4" />
          Ler QR Code com o app do seu banco
        </div>
        <div className="mx-auto mt-3 w-fit rounded-xl bg-white p-3">
          <QRCodeSVG value={payload} size={190} level="M" />
        </div>

        <Button onClick={copyPix} className="mt-5 w-full bg-white text-zinc-950 hover:bg-zinc-200">
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Pix copiado" : "Copiar Pix copia e cola"}
        </Button>
        <Button
          onClick={reportPaid}
          disabled={pending || confirming || status === "paid"}
          variant="outline"
          className="mt-2 w-full border-emerald-400/40 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/20"
        >
          {confirming
            ? "Aguardando validação do Admin"
            : pending
              ? "Enviando…"
              : "Já paguei"}
        </Button>
      </CardContent>
    </Card>
  );
}
