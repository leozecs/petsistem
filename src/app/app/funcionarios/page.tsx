import { UserCog } from "lucide-react";
import { SectionHeading } from "@/components/app/section-heading";
import { EmptyState } from "@/components/shared/empty-state";

export default function EmployeesPage() {
  return (
    <div>
      <SectionHeading title="Funcionários" description="CRUD de equipe, cargos, telefones, emails e roles." />
      <EmptyState
        icon={UserCog}
        title="Equipe pronta para conectar ao Supabase"
        description="A migration ja possui a tabela employees com petshop_id, auditoria e RLS."
        action="Novo funcionário"
      />
    </div>
  );
}
