import { redirect } from "next/navigation";

// Financeiro was a demo placeholder; the real flow lives in /app/caixa.
// Kept as a redirect so existing bookmarks still resolve.
export default function FinanceiroRedirectPage() {
  redirect("/app/caixa");
}
