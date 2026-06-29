import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PetsistemLogo } from "@/components/brand/logo";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="min-h-[100dvh] bg-[#f7f5ef] text-zinc-950"
      style={{ fontFamily: "var(--font-hanken), ui-sans-serif, system-ui" }}
    >
      <header className="border-b border-zinc-200/70">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4 sm:px-6">
          <Link href="/" className="flex h-7 w-32 items-center overflow-hidden">
            <PetsistemLogo tone="dark" className="w-32" />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-zinc-700 hover:text-zinc-950"
          >
            <ArrowLeft className="size-3.5" />
            Voltar
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-5 py-12 sm:px-6 sm:py-16">
        {children}
      </article>

      <footer className="border-t border-zinc-200/70 bg-[#f7f5ef] py-8">
        <div className="mx-auto max-w-3xl px-5 sm:px-6">
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-[12.5px] text-zinc-600">
            <Link href="/legal/privacidade" className="hover:text-zinc-900">
              Privacidade
            </Link>
            <Link href="/legal/termos" className="hover:text-zinc-900">
              Termos
            </Link>
            <Link href="/legal/cookies" className="hover:text-zinc-900">
              Cookies
            </Link>
            <Link href="/legal/lgpd" className="hover:text-zinc-900">
              LGPD
            </Link>
            <Link href="/#contato" className="hover:text-zinc-900">
              Contato
            </Link>
          </nav>
          <p className="mt-4 text-[12px] text-zinc-500">
            © {new Date().getFullYear()} PETSISTEM
          </p>
        </div>
      </footer>
    </main>
  );
}
