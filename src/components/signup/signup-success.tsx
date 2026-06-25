"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import {
  ArrowRight,
  CheckCircle2,
  Clipboard,
  Loader2,
  Mail,
  MessageCircle,
  QrCode,
  RefreshCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PetsistemLogo } from "@/components/brand/logo";
import { resendConfirmation } from "@/app/signup/actions";
import { buildWhatsappUrl } from "@/lib/whatsapp";

const OFFICIAL_PIX_KEY = "11972871616";
const OFFICIAL_WHATSAPP = "11972871616";

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function SignupSuccess({
  email,
  mode = "trial",
  shopName = "",
  planName = "",
  amountCents = 0,
  billing = "monthly",
}: {
  email: string;
  mode?: "trial" | "paid";
  shopName?: string;
  planName?: string;
  amountCents?: number;
  billing?: "monthly" | "annual";
}) {
  const [pending, startTransition] = useTransition();
  const [resent, setResent] = useState(false);
  const paidSignup = mode === "paid";
  const whatsappUrl = useMemo(() => {
    const message = [
      "Ola, fiz cadastro no PetSistem e vou enviar o comprovante do Pix.",
      shopName ? `Loja: ${shopName}` : null,
      planName ? `Plano: ${planName}` : null,
      amountCents ? `Valor: ${formatBRL(amountCents)}` : null,
      `Ciclo: ${billing === "annual" ? "anual" : "mensal"}`,
      email ? `Email: ${email}` : null,
    ]
      .filter(Boolean)
      .join("\n");
    return buildWhatsappUrl(OFFICIAL_WHATSAPP, message);
  }, [amountCents, billing, email, planName, shopName]);

  function handleResend() {
    if (!email) {
      toast.error("Email nao informado.");
      return;
    }
    startTransition(async () => {
      const result = await resendConfirmation(email);
      if (result.ok) {
        setResent(true);
        toast.success("Email reenviado");
      } else {
        toast.error(result.error ?? "Erro ao reenviar");
      }
    });
  }

  async function copyPixKey() {
    await navigator.clipboard.writeText(OFFICIAL_PIX_KEY);
    toast.success("Chave Pix copiada");
  }

  return (
    <main className="grid min-h-[100dvh] place-items-center bg-zinc-950 px-4 py-10 text-white">
      <div className="w-full max-w-3xl">
        <div className="mx-auto flex h-7 w-32 items-center overflow-hidden">
          <PetsistemLogo tone="light" className="w-32" />
        </div>

        <div className="mx-auto mt-10 flex size-16 items-center justify-center rounded-full bg-emerald-500/15">
          {paidSignup ? (
            <QrCode className="size-8 text-emerald-300" />
          ) : (
            <Mail className="size-8 text-emerald-300" />
          )}
        </div>

        <div className="mx-auto max-w-md text-center">
          <h1 className="mt-6 text-3xl font-semibold tracking-tight">
            {paidSignup ? "Agora falta o Pix" : "Confere seu email"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            {paidSignup
              ? "Pague o valor do plano, envie o comprovante no WhatsApp oficial e aguarde validacao manual. Depois disso seu login sera liberado."
              : email
                ? `A gente mandou um link para ${email}. Clique no botao dentro do email para confirmar sua conta e entrar.`
                : "A gente mandou um link de confirmacao pro email cadastrado."}
          </p>
        </div>

        {paidSignup ? (
          <div className="mt-8 grid gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:grid-cols-[220px_1fr]">
            <div className="rounded-xl bg-white p-4">
              <QRCodeSVG value={OFFICIAL_PIX_KEY} size={188} level="M" />
            </div>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wider text-emerald-300">
                  Chave Pix oficial
                </p>
                <p className="mt-1 font-mono text-lg font-semibold text-white">
                  {OFFICIAL_PIX_KEY}
                </p>
              </div>
              <div className="grid gap-2 text-zinc-300 sm:grid-cols-2">
                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-xs text-zinc-500">Plano</p>
                  <p className="font-semibold">{planName || "Selecionado"}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-xs text-zinc-500">Valor</p>
                  <p className="font-semibold">{formatBRL(amountCents)}</p>
                </div>
              </div>
              <p className="text-xs leading-5 text-zinc-400">
                O QR Code aponta para a chave Pix. Confira o valor acima no app do banco.
                Depois mande o comprovante no WhatsApp.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  onClick={copyPixKey}
                  className="rounded-md border border-white/10 bg-white/5 text-zinc-100 hover:bg-white/10"
                >
                  <Clipboard className="size-4" />
                  Copiar chave Pix
                </Button>
                {whatsappUrl ? (
                  <Button
                    type="button"
                    className="rounded-md bg-emerald-400 font-semibold text-zinc-950 hover:bg-emerald-300"
                    render={<a href={whatsappUrl} target="_blank" rel="noopener noreferrer" />}
                  >
                    <MessageCircle className="size-4" />
                    Enviar comprovante
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <ul className="mx-auto mt-8 max-w-md space-y-2 rounded-lg border border-white/10 bg-white/[0.03] p-4 text-left text-xs text-zinc-300">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-400" />
              <span>Confere a pasta de spam se nao aparecer em ate 2 min</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-400" />
              <span>O link expira em 24h. Clique logo.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-400" />
              <span>Quando confirmar, voce entra direto no painel em trial</span>
            </li>
          </ul>
        )}

        <div className="mx-auto mt-8 flex max-w-md flex-col gap-3">
          <Button
            type="button"
            onClick={handleResend}
            disabled={pending || resent}
            className="rounded-md border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10"
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Reenviando...
              </>
            ) : resent ? (
              <>
                <CheckCircle2 className="size-4 text-emerald-400" />
                Email reenviado
              </>
            ) : (
              <>
                <RefreshCcw className="size-4" />
                Nao recebi email · Reenviar
              </>
            )}
          </Button>

          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-400 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-300"
          >
            Ja confirmei · Entrar
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </main>
  );
}
