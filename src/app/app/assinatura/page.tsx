import { Copy, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeading } from "@/components/app/section-heading";
import { StatusPill } from "@/components/shared/status-pill";
import { tenant } from "@/lib/data/demo";

export default function SubscriptionPage() {
  return (
    <div>
      <SectionHeading title="Minha Assinatura" description="Plano, vencimento, Pix manual e status financeiro da loja." />
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
          <CardContent className="grid gap-6 p-6 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-zinc-500">Plano</p>
              <p className="mt-2 text-3xl font-semibold">{tenant.plan}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500">Valor mensal</p>
              <p className="mt-2 text-3xl font-semibold">R$ 997,00</p>
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500">Vencimento</p>
              <p className="mt-2 text-xl font-semibold">25/06/2026</p>
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500">Status</p>
              <div className="mt-3">
                <StatusPill tone="warning">A confirmar</StatusPill>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg border-zinc-200 bg-zinc-950 text-white shadow-none">
          <CardContent className="p-6">
            <CreditCard className="size-7" />
            <h2 className="mt-5 text-xl font-semibold">Pix manual</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-300">Copie a chave Pix e marque como pago para análise do Admin Master.</p>
            <div className="mt-5 rounded-lg bg-white/10 p-4 font-mono text-sm">{tenant.pixKey}</div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Button className="rounded-md bg-white text-zinc-950 hover:bg-zinc-200">
                <Copy className="size-4" />
                Copiar Pix
              </Button>
              <Button variant="outline" className="rounded-md border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white">
                Pago!
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
