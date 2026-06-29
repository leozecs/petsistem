import type { Metadata } from "next";
import { LegalDocument, Section } from "@/components/legal/legal-document";

export const metadata: Metadata = {
  title: "Política de Cookies",
};

export default function CookiesPage() {
  return (
    <LegalDocument title="Política de Cookies" updatedAt="29 de junho de 2026">
      <Section title="O que são cookies">
        <p>
          Cookies são pequenos arquivos guardados no seu navegador que
          permitem reconhecer sessões, lembrar preferências e medir uso. O
          PETSISTEM usa o mínimo necessário pra operar.
        </p>
      </Section>

      <Section title="Quais cookies usamos">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Sessão (essencial):</strong> mantém você logado no painel.
            Cookies do Supabase Auth. Sem isso, não dá pra usar o sistema.
          </li>
          <li>
            <strong>active_petshop_id (essencial):</strong> guarda qual loja
            está ativa quando o usuário tem múltiplas memberships.
          </li>
          <li>
            <strong>Analytics (performance):</strong> Vercel Analytics e Speed
            Insights coletam métricas anônimas de página e Core Web Vitals.
            Não identificam o visitante.
          </li>
        </ul>
      </Section>

      <Section title="Como gerenciar">
        <p>
          Você pode bloquear cookies no navegador, mas se bloquear os
          essenciais não vai conseguir entrar no painel. Cookies de
          analytics podem ser desativados via configuração do navegador ou
          extensão de privacidade sem afetar o uso.
        </p>
      </Section>

      <Section title="Cookies de terceiros">
        <p>
          Não usamos cookies de marketing nem de retargeting. Não há pixel do
          Facebook, Google Ads ou similares em nenhuma das nossas páginas.
        </p>
      </Section>

      <Section title="Mudanças">
        <p>
          Se passarmos a usar novos cookies, atualizamos esta página e
          comunicamos no painel das lojas.
        </p>
      </Section>
    </LegalDocument>
  );
}
