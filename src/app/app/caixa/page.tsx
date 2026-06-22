import { redirect } from "next/navigation";

// Caixa virou Financeiro (unifica caixa do dia + relatórios + lançamentos).
export default function CaixaRedirect() {
  redirect("/app/financeiro");
}
