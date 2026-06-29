"use client";

import { useState, useTransition } from "react";
import { Check, Copy, CreditCard } from "lucide-react";
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
          Copie o código Pix do plano {planName} e cole no app do seu banco.
        </p>

        <div className="mt-5 rounded-lg border border-zinc-800 bg-zinc-900 p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-300">
            Pix copia e cola
          </p>
          <p className="mt-1 break-all font-mono text-xs text-zinc-200">
            {payload}
          </p>
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
