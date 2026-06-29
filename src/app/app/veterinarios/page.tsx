import { redirect } from "next/navigation";

export default async function VeterinariosPage() {
  redirect("/app/funcionarios?perfil=veterinarian");
}
