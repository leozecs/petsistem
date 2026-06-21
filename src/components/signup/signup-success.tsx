"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  Mail,
  RefreshCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PetsistemLogo } from "@/components/brand/logo";
import { resendConfirmation } from "@/app/signup/actions";

export function SignupSuccess({ email }: { email: string }) {
  const [pending, startTransition] = useTransition();
  const [resent, setResent] = useState(false);

  function handleResend() {
    if (!email) {
      toast.error("Email não informado.");
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

  return (
    <main className="grid min-h-[100dvh] place-items-center bg-zinc-950 px-4 text-white">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex h-7 w-32 items-center overflow-hidden">
          <PetsistemLogo tone="light" className="w-32" />
        </div>

        <div className="mx-auto mt-10 flex size-16 items-center justify-center rounded-full bg-emerald-500/15">
          <Mail className="size-8 text-emerald-300" />
        </div>

        <h1 className="mt-6 text-3xl font-semibold tracking-tight">
          Confere seu email
        </h1>
        {email ? (
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            A gente mandou um link pra{" "}
            <span className="font-semibold text-zinc-200">{email}</span>. Clica
            no botão dentro do email pra confirmar sua conta e entrar pela
            primeira vez.
          </p>
        ) : (
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            A gente mandou um link de confirmação pro email que você cadastrou.
          </p>
        )}

        <ul className="mt-8 space-y-2 rounded-lg border border-white/10 bg-white/[0.03] p-4 text-left text-xs text-zinc-300">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-400" />
            <span>Confere a pasta de spam se não aparecer em até 2 min</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-400" />
            <span>O link expira em 24h. Clica logo!</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-400" />
            <span>
              Quando confirmar, você entra direto no painel da sua loja
            </span>
          </li>
        </ul>

        <div className="mt-8 flex flex-col gap-3">
          <Button
            type="button"
            onClick={handleResend}
            disabled={pending || resent}
            className="rounded-md border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10"
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Reenviando…
              </>
            ) : resent ? (
              <>
                <CheckCircle2 className="size-4 text-emerald-400" />
                Email reenviado
              </>
            ) : (
              <>
                <RefreshCcw className="size-4" />
                Não recebi · Reenviar
              </>
            )}
          </Button>

          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-400 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-300"
          >
            Já confirmei · Entrar
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </main>
  );
}
