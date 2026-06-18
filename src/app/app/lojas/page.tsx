import { SectionHeading } from "@/components/app/section-heading";
import { StoresManager } from "@/components/stores/stores-manager";

export default function StoresPage() {
  return (
    <div>
      <SectionHeading
        title="Lojas"
        description="Crie, edite, exclua e gere subdomínios para cada petshop ou clínica."
      />
      <StoresManager />
    </div>
  );
}
