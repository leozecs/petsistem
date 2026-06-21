import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Clock, MessageCircle } from "lucide-react";
import { PetsistemLogo } from "@/components/brand/logo";

export const metadata: Metadata = {
  title: "Cadastro · PETSISTEM",
};

// Placeholder enquanto a Fase 12 (self-signup + email confirmation) não chega.
// Mantém um link de fallback pro WhatsApp pra capturar leads agora.
export default function SignupPage() {
  return (
    <main className="grid min-h-[100dvh] place-items-center bg-zinc-950 px-4 text-white">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex h-7 w-32 items-center overflow-hidden">
          <PetsistemLogo tone="light" className="w-32" />
        </div>

        <div className="mt-10 inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-500/10 px-3 py-1 text-xs text-amber-200">
          <Clock className="size-3" />
          Em breve
        </div>

        <h1 className="mt-6 text-3xl font-semibold tracking-tight">
          O cadastro automático está chegando
        </h1>
        <p className="mt-4 text-sm leading-7 text-zinc-400">
          Em poucos dias você poderá criar sua loja em segundos, direto por
          aqui. Enquanto isso, manda uma mensagem que a gente abre sua conta
          manualmente — geralmente em menos de 1 hora.
        </p>

        <a
          href="https://wa.me/5519999990000?text=Quero%20criar%20minha%20loja%20no%20PETSISTEM"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 inline-flex items-center gap-2 rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100"
        >
          <MessageCircle className="size-4" />
          Falar com a gente
        </a>

        <div className="mt-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 transition hover:text-zinc-300"
          >
            <ArrowLeft className="size-3" />
            Voltar pra landing
          </Link>
        </div>
      </div>
    </main>
  );
}
