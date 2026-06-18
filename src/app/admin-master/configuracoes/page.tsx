import { Bell, CreditCard, KeyRound, Mail, Palette, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionHeading } from "@/components/app/section-heading";

export default function AdminConfiguracoesPage() {
  return (
    <div>
      <SectionHeading
        title="Configurações da plataforma"
        description="Ajustes globais que afetam todas as lojas e a comunicação institucional."
        action={
          <Button className="rounded-md bg-zinc-950 text-white hover:bg-zinc-800">
            <Save className="size-4" />
            Salvar alterações
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Palette className="size-4" />
              Marca
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="brand-name">Nome comercial</Label>
              <Input id="brand-name" defaultValue="PETSISTEM" className="rounded-md" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand-color">Cor primária</Label>
              <Input id="brand-color" defaultValue="#0F172A" className="rounded-md font-mono" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="size-4" />
              Emails transacionais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sender-name">Nome do remetente</Label>
              <Input id="sender-name" defaultValue="PETSISTEM" className="rounded-md" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sender-email">Email do remetente</Label>
              <Input id="sender-email" defaultValue="contato@petsistem.com.br" className="rounded-md" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="size-4" />
              Pix institucional
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pix-key">Chave Pix de cobrança</Label>
              <Input id="pix-key" defaultValue="financeiro@petsistem.com.br" className="rounded-md font-mono" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pix-name">Nome do beneficiário</Label>
              <Input id="pix-name" defaultValue="PETSISTEM TECNOLOGIA LTDA" className="rounded-md" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="size-4" />
              Notificações operacionais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-md border border-zinc-200 p-3">
              <span>Alertar quando uma loja vencer há mais de 5 dias</span>
              <Button variant="outline" size="sm" className="rounded-md border-zinc-300 bg-white">
                Ativo
              </Button>
            </div>
            <div className="flex items-center justify-between rounded-md border border-zinc-200 p-3">
              <span>Notificar criação de nova loja</span>
              <Button variant="outline" size="sm" className="rounded-md border-zinc-300 bg-white">
                Ativo
              </Button>
            </div>
            <div className="flex items-center justify-between rounded-md border border-zinc-200 p-3">
              <span>Alertar acesso suporte por mais de 30 minutos</span>
              <Button variant="outline" size="sm" className="rounded-md border-zinc-300 bg-white">
                Ativo
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg border-zinc-200 bg-white shadow-none lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="size-4" />
              Segurança
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-zinc-700">
            <p>Proteções obrigatórias da plataforma:</p>
            <ul className="list-inside list-disc space-y-1 text-zinc-600">
              <li>RLS em todas as tabelas tenant-owned</li>
              <li>Funções helpers de policy isoladas no schema <code className="font-mono">private</code></li>
              <li>Auditoria de toda ação administrativa</li>
              <li>Leaked password protection (HaveIBeenPwned) no Supabase Auth</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
