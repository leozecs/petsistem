"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { KeyRound, Save, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionHeading } from "@/components/app/section-heading";
import {
  updateAdminProfile,
  updatePlatformPix,
} from "@/app/admin-master/configuracoes/actions";

export function ConfigForm({
  fullName,
  email,
  pixKey,
  pixHolderName,
}: {
  fullName: string;
  email: string;
  pixKey: string;
  pixHolderName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Profile state
  const [profileForm, setProfileForm] = useState({
    full_name: fullName,
    email,
    password: "",
  });

  // Pix state
  const [pixForm, setPixForm] = useState({
    pix_key: pixKey,
    pix_holder_name: pixHolderName,
  });

  function submitProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("full_name", profileForm.full_name);
    fd.set("email", profileForm.email);
    fd.set("password", profileForm.password);
    startTransition(async () => {
      const result = await updateAdminProfile(fd);
      if (result.ok) {
        toast.success("Perfil atualizado");
        setProfileForm((s) => ({ ...s, password: "" }));
        router.refresh();
      } else {
        toast.error(result.error ?? "Erro");
      }
    });
  }

  function submitPix(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("pix_key", pixForm.pix_key);
    fd.set("pix_holder_name", pixForm.pix_holder_name);
    startTransition(async () => {
      const result = await updatePlatformPix(fd);
      if (result.ok) {
        toast.success("Chave Pix atualizada");
        router.refresh();
      } else {
        toast.error(result.error ?? "Erro");
      }
    });
  }

  return (
    <div>
      <SectionHeading
        title="Configurações"
        description="Sua conta de Admin Master e a chave Pix global usada pra cobrar as lojas."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Profile */}
        <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-950">
              <User className="size-4 text-zinc-700" />
              Conta Admin Master
            </div>
            <form onSubmit={submitProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ad_name">Nome</Label>
                <Input
                  id="ad_name"
                  value={profileForm.full_name}
                  onChange={(e) =>
                    setProfileForm((s) => ({ ...s, full_name: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ad_email">Email</Label>
                <Input
                  id="ad_email"
                  type="email"
                  value={profileForm.email}
                  onChange={(e) =>
                    setProfileForm((s) => ({ ...s, email: e.target.value }))
                  }
                />
                <p className="text-xs text-zinc-500">
                  Mudar email exige confirmar pela URL — você sai e entra com o novo.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ad_pwd">Nova senha (opcional)</Label>
                <Input
                  id="ad_pwd"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Deixe em branco pra manter"
                  value={profileForm.password}
                  onChange={(e) =>
                    setProfileForm((s) => ({ ...s, password: e.target.value }))
                  }
                />
              </div>
              <div className="flex justify-end">
                <Button
                  type="submit"
                  className="rounded-md bg-zinc-950 text-white hover:bg-zinc-800"
                  disabled={pending}
                >
                  <Save className="size-4" />
                  Salvar perfil
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Pix */}
        <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-950">
              <KeyRound className="size-4 text-zinc-700" />
              Chave Pix da plataforma
            </div>
            <form onSubmit={submitPix} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="px_key">Chave Pix</Label>
                <Input
                  id="px_key"
                  value={pixForm.pix_key}
                  placeholder="CPF, CNPJ, email, telefone ou aleatória"
                  onChange={(e) =>
                    setPixForm((s) => ({ ...s, pix_key: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="px_holder">Titular da conta</Label>
                <Input
                  id="px_holder"
                  value={pixForm.pix_holder_name}
                  placeholder="Nome ou Razão Social"
                  onChange={(e) =>
                    setPixForm((s) => ({
                      ...s,
                      pix_holder_name: e.target.value,
                    }))
                  }
                />
              </div>
              <p className="text-xs text-zinc-500">
                Essa chave aparece na tela de Cobranças quando você gera Pix pros donos das lojas.
              </p>
              <div className="flex justify-end">
                <Button
                  type="submit"
                  className="rounded-md bg-zinc-950 text-white hover:bg-zinc-800"
                  disabled={pending}
                >
                  <Save className="size-4" />
                  Salvar Pix
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
