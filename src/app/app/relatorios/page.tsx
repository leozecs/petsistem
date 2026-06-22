import { redirect } from "next/navigation";

// Relatórios virou Financeiro (unifica caixa + relatórios + lançamentos).
export default function RelatoriosRedirect() {
  redirect("/app/financeiro");
}
