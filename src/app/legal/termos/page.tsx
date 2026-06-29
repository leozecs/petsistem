import type { Metadata } from "next";
import { LegalDocument, Section } from "@/components/legal/legal-document";

export const metadata: Metadata = {
  title: "Termos de Uso",
};

export default function TermosPage() {
  return (
    <LegalDocument title="Termos de Uso" updatedAt="29 de junho de 2026">
      <Section title="Objeto">
        <p>
          O PETSISTEM disponibiliza ferramenta SaaS de gestão pra petshops e
          clínicas veterinárias. Ao criar uma conta, você concorda com estes
          termos.
        </p>
      </Section>

      <Section title="Cadastro">
        <p>
          A loja cadastra dados próprios e do dono responsável. As informações
          devem ser verídicas. Cada usuário é responsável pelo próprio login,
          senha e ações executadas com ele.
        </p>
      </Section>

      <Section title="Planos e pagamento">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Trial:</strong> 7 dias grátis com recursos do plano
            Profissional. Sem cobrança automática.
          </li>
          <li>
            <strong>Planos pagos:</strong> mensalidade via Pix manual com
            confirmação pelo Admin Master. Renovação no mesmo dia do mês
            subsequente.
          </li>
          <li>
            <strong>Inadimplência:</strong> não havendo pagamento até a data de
            vencimento, o login fica bloqueado até regularização.
          </li>
        </ul>
      </Section>

      <Section title="Responsabilidades">
        <p>
          A loja é responsável pelos dados que insere, incluindo dados de
          tutores e pets. O PETSISTEM se compromete com infraestrutura segura
          (Supabase + Vercel), backups e isolamento por tenant. Não
          respondemos por perdas decorrentes de uso indevido, fraude ou
          eventos fora do controle razoável da plataforma.
        </p>
      </Section>

      <Section title="Cancelamento">
        <p>
          A loja pode cancelar a qualquer momento. O acesso continua até o fim
          do ciclo já pago. Dados ficam disponíveis por 30 dias após o
          cancelamento pra exportação.
        </p>
      </Section>

      <Section title="Mudanças">
        <p>
          Podemos atualizar estes termos a qualquer momento. Mudanças
          relevantes ficam comunicadas no painel. O uso continuado após o
          aviso significa aceite da nova versão.
        </p>
      </Section>

      <Section title="Foro">
        <p>
          Fica eleito o foro da Comarca de São Paulo, SP, pra dirimir
          questões oriundas destes termos.
        </p>
      </Section>
    </LegalDocument>
  );
}
