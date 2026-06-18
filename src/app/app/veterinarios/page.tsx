import { Stethoscope } from "lucide-react";
import { SectionHeading } from "@/components/app/section-heading";
import { EmptyState } from "@/components/shared/empty-state";

export default function VeterinariansPage() {
  return (
    <div>
      <SectionHeading title="Veterinários" description="Gestão de veterinários, CRMV, contatos e especialidades." />
      <EmptyState
        icon={Stethoscope}
        title="Cadastro veterinário preparado"
        description="A agenda veterinária usa calendário independente e pode vincular consultas a cada profissional."
        action="Novo veterinário"
      />
    </div>
  );
}
