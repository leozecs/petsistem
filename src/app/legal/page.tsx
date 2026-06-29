import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

const pages = [
  {
    href: "/legal/privacidade",
    title: "Política de Privacidade",
    desc: "Como coletamos, usamos e protegemos os dados de tutores, equipe e pets.",
  },
  {
    href: "/legal/termos",
    title: "Termos de Uso",
    desc: "Regras de uso da plataforma, responsabilidades e limites de serviço.",
  },
  {
    href: "/legal/cookies",
    title: "Política de Cookies",
    desc: "Quais cookies usamos, pra quê e como gerenciar.",
  },
  {
    href: "/legal/lgpd",
    title: "LGPD",
    desc: "Direitos do titular, base legal e canal do encarregado.",
  },
];

export default function LegalIndex() {
  return (
    <div>
      <h1
        className="text-4xl font-medium tracking-tight text-zinc-950"
        style={{ fontFamily: "var(--font-bricolage)" }}
      >
        Legal
      </h1>
      <p className="mt-3 max-w-prose text-[15px] leading-7 text-zinc-700">
        Documentos legais do PETSISTEM. Atualizamos sempre que mexer aqui faça
        diferença pra você ou pro tutor.
      </p>

      <ul className="mt-8 divide-y divide-zinc-200 border-t border-zinc-200">
        {pages.map((p) => (
          <li key={p.href}>
            <Link
              href={p.href}
              className="group flex items-start justify-between gap-4 py-5 hover:bg-white/50"
            >
              <div>
                <p
                  className="text-[18px] font-medium tracking-tight text-zinc-950"
                  style={{ fontFamily: "var(--font-bricolage)" }}
                >
                  {p.title}
                </p>
                <p className="mt-1 text-[14px] text-zinc-600">{p.desc}</p>
              </div>
              <ArrowUpRight className="mt-2 size-4 shrink-0 text-zinc-400 transition group-hover:text-zinc-900" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
