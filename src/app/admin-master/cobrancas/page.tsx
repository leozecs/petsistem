import { redirect } from "next/navigation";

// A aba Cobranças foi mesclada em Assinaturas — mantemos o redirect só pra
// bookmarks antigos não quebrarem.
export default function CobrancasRedirect() {
  redirect("/admin-master/assinaturas");
}
