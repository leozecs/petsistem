import { Settings } from "lucide-react";
import { SectionHeading } from "@/components/app/section-heading";
import { EmptyState } from "@/components/shared/empty-state";

export default function SettingsPage() {
  return (
    <div>
      <SectionHeading title="Configurações" description="Dados da loja, Pix, horários, permissões e preferências." />
      <EmptyState
        icon={Settings}
        title="Configurações da loja"
        description="Esta área centraliza horário de funcionamento, Pix manual, identidade da loja e regras de disponibilidade."
        action="Editar configurações"
      />
    </div>
  );
}
