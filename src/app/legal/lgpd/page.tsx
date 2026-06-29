import type { Metadata } from "next";
import { LegalDocument, Section } from "@/components/legal/legal-document";

export const metadata: Metadata = {
  title: "LGPD",
};

export default function LgpdPage() {
  return (
    <LegalDocument title="LGPD" updatedAt="29 de junho de 2026">
      <Section title="Quem é o controlador">
        <p>
          PETSISTEM é o controlador dos dados da plataforma (sistema, faturamento,
          login). Cada loja (petshop ou clínica) é controladora dos dados
          operacionais dos próprios tutores e pets. Operamos como operador
          quando processamos dados em nome da loja.
        </p>
      </Section>

      <Section title="Bases legais">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Execução de contrato:</strong> dados necessários pra
            prestar o serviço contratado pela loja.
          </li>
          <li>
            <strong>Cumprimento de obrigação legal:</strong> dados fiscais,
            auditoria e prazos legais de retenção.
          </li>
          <li>
            <strong>Legítimo interesse:</strong> métricas anônimas de uso pra
            melhoria contínua da plataforma.
          </li>
          <li>
            <strong>Consentimento:</strong> comunicações opcionais (resumo
            mensal, novidades).
          </li>
        </ul>
      </Section>

      <Section title="Direitos do titular">
        <p>Você pode, a qualquer momento, solicitar:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Confirmação de existência de tratamento dos seus dados.</li>
          <li>Acesso aos dados pessoais que armazenamos.</li>
          <li>Correção de dados incompletos, inexatos ou desatualizados.</li>
          <li>
            Anonimização, bloqueio ou eliminação de dados desnecessários,
            excessivos ou tratados em desconformidade.
          </li>
          <li>Portabilidade dos dados.</li>
          <li>Eliminação dos dados tratados com consentimento.</li>
          <li>Informação sobre compartilhamento.</li>
          <li>Revogação do consentimento.</li>
        </ul>
      </Section>

      <Section title="Como exercer">
        <p>
          Mande mensagem no WhatsApp{" "}
          <a
            href="https://wa.me/5511972871616"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-emerald-800 hover:underline"
          >
            (11) 97287-1616
          </a>{" "}
          identificando o pedido e o email cadastrado. Respondemos em até 15
          dias.
        </p>
      </Section>

      <Section title="Incidentes de segurança">
        <p>
          Em caso de incidente que coloque em risco dados pessoais, a ANPD
          (Autoridade Nacional de Proteção de Dados) e os titulares afetados
          serão comunicados em prazo razoável conforme art. 48 da LGPD.
        </p>
      </Section>

      <Section title="Encarregado (DPO)">
        <p>
          Contato do encarregado:{" "}
          <a
            href="https://wa.me/5511972871616"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-emerald-800 hover:underline"
          >
            WhatsApp (11) 97287-1616
          </a>
          .
        </p>
      </Section>
    </LegalDocument>
  );
}
