import type { Metadata } from "next";
import { LegalDocument, Section } from "@/components/legal/legal-document";

export const metadata: Metadata = {
  title: "Política de Privacidade",
};

export default function PrivacidadePage() {
  return (
    <LegalDocument title="Política de Privacidade" updatedAt="29 de junho de 2026">
      <Section title="Quem somos">
        <p>
          O PETSISTEM é uma plataforma operacional para petshops e clínicas
          veterinárias no Brasil. Operamos o serviço de software como serviço
          (SaaS) que coleta e processa dados em nome dos petshops contratantes.
        </p>
      </Section>

      <Section title="Quais dados coletamos">
        <p>Coletamos três grupos de dados:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Dados da loja:</strong> nome, CNPJ ou nome legal, endereço,
            telefone, email, logo e configurações operacionais.
          </li>
          <li>
            <strong>Dados da equipe:</strong> nome completo, email, telefone,
            papel (dono, atendente, veterinário), senha (armazenada com hash).
          </li>
          <li>
            <strong>Dados de tutores e pets:</strong> nome do tutor, WhatsApp,
            email opcional, endereço opcional, nome do pet, espécie, raça,
            peso, fotos do atendimento, histórico clínico.
          </li>
        </ul>
      </Section>

      <Section title="Pra que usamos">
        <ul className="list-disc space-y-1 pl-5">
          <li>Operar agendamentos, prontuários e financeiro da loja.</li>
          <li>Permitir que o tutor acompanhe o atendimento do próprio pet.</li>
          <li>Enviar notificações operacionais (confirmação, link de tracking).</li>
          <li>Cobrar a assinatura mensal e validar pagamentos via Pix.</li>
          <li>Cumprir obrigações legais (auditoria, fiscalização).</li>
        </ul>
      </Section>

      <Section title="Compartilhamento">
        <p>
          Não vendemos dados. Compartilhamos somente com fornecedores
          essenciais à operação, hospedagem, segurança, atendimento, cobrança e
          cumprimento de obrigações legais, sempre sob controles de proteção de
          dados. Cada loja só vê os dados da própria loja (isolamento total por
          tenant).
        </p>
      </Section>

      <Section title="Retenção">
        <p>
          Dados ativos enquanto a loja tiver conta ativa. Dados de tentativa de
          login retidos por 7 dias. Backups completos retidos por até 90 dias.
          Em caso de exclusão de loja, dados operacionais são apagados em até
          30 dias; dados fiscais ficam pelo prazo legal.
        </p>
      </Section>

      <Section title="Direitos do titular">
        <p>
          Você pode solicitar acesso, correção, exclusão, portabilidade e
          revogação de consentimento. Veja o canal no documento de LGPD.
        </p>
      </Section>

      <Section title="Contato">
        <p>
          Pra dúvidas, escreva pra{" "}
          <a
            href="https://wa.me/5511972871616"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-emerald-800 hover:underline"
          >
            (11) 97287-1616
          </a>
          .
        </p>
      </Section>
    </LegalDocument>
  );
}
