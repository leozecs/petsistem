"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowRight,
  Clock,
  ExternalLink,
  Globe,
  Image as ImageIcon,
  Mail,
  MapPin,
  Palette,
  Phone,
  Save,
  Settings as SettingsIcon,
  Store,
  Tags,
  Trash2,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { SectionHeading } from "@/components/app/section-heading";
import {
  removePetshopLogo,
  updatePetshopGeneral,
  updatePetshopOperations,
  updatePetshopVisual,
  uploadPetshopLogo,
} from "@/app/app/configuracoes/actions";

type Props = {
  petshop: {
    id: string;
    name: string;
    legalName: string;
    address: string;
    phone: string;
    whatsapp: string;
    email: string;
    primaryColor: string;
    subdomain: string;
    logoUrl: string | null;
    slotMinutes: number;
  };
  rootDomain: string;
};

export function ConfiguracoesView({ petshop, rootDomain }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Geral
  const [general, setGeneral] = useState({
    name: petshop.name,
    legal_name: petshop.legalName,
    address: petshop.address,
    phone: petshop.phone,
    whatsapp: petshop.whatsapp,
    email: petshop.email,
  });

  // Visual
  const [color, setColor] = useState(petshop.primaryColor);
  const [logoPreview, setLogoPreview] = useState<string | null>(petshop.logoUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Operacional
  const [slotMinutes, setSlotMinutes] = useState<number>(petshop.slotMinutes);

  function submitOperations(value: number) {
    const fd = new FormData();
    fd.set("slot_minutes", String(value));
    startTransition(async () => {
      const result = await updatePetshopOperations(fd);
      if (result.ok) {
        toast.success("Intervalo de agendamento atualizado.");
        setSlotMinutes(value);
        router.refresh();
      } else {
        toast.error(result.error ?? "Erro ao salvar");
      }
    });
  }

  function submitGeneral(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("name", general.name);
    fd.set("legal_name", general.legal_name);
    fd.set("address", general.address);
    fd.set("phone", general.phone);
    fd.set("whatsapp", general.whatsapp);
    fd.set("email", general.email);
    startTransition(async () => {
      const result = await updatePetshopGeneral(fd);
      if (result.ok) {
        toast.success("Configurações gerais salvas");
        router.refresh();
      } else if (result.fieldErrors) {
        const first = Object.values(result.fieldErrors)[0];
        toast.error(first ?? "Dados inválidos");
      } else {
        toast.error(result.error ?? "Erro ao salvar");
      }
    });
  }

  function submitColor(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("primary_color", color);
    startTransition(async () => {
      const result = await updatePetshopVisual(fd);
      if (result.ok) {
        toast.success("Cor primária atualizada");
        router.refresh();
      } else {
        toast.error(result.error ?? "Erro");
      }
    });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Imagem maior que 2MB. Reduza antes de enviar.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(String(ev.target?.result ?? ""));
    reader.readAsDataURL(file);

    const fd = new FormData();
    fd.set("file", file);
    startTransition(async () => {
      const result = await uploadPetshopLogo(fd);
      if (result.ok) {
        setLogoPreview(result.url);
        toast.success("Logo atualizada");
        router.refresh();
      } else {
        toast.error(result.error ?? "Erro no upload");
        setLogoPreview(petshop.logoUrl);
      }
    });
  }

  function handleRemoveLogo() {
    if (!confirm("Remover a logo atual?")) return;
    startTransition(async () => {
      const result = await removePetshopLogo();
      if (result.ok) {
        setLogoPreview(null);
        toast.success("Logo removida");
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
        description="Edite os dados da sua loja e a aparência da landing pública."
      />

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid h-11 w-full max-w-2xl grid-cols-3 rounded-lg bg-zinc-100 p-1">
          <TabsTrigger value="general" className="rounded-md">
            <Store className="size-4" />
            Geral
          </TabsTrigger>
          <TabsTrigger value="operations" className="rounded-md">
            <SettingsIcon className="size-4" />
            Operacional
          </TabsTrigger>
          <TabsTrigger value="visual" className="rounded-md">
            <Palette className="size-4" />
            Visual
          </TabsTrigger>
        </TabsList>

        {/* GERAL */}
        <TabsContent value="general" className="space-y-4">
          {/* Domínio público da loja */}
          <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div className="flex items-start gap-3">
                <div
                  className="flex size-10 items-center justify-center rounded-md"
                  style={{ backgroundColor: `${petshop.primaryColor}15`, color: petshop.primaryColor }}
                >
                  <Globe className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-950">
                    Seu domínio
                  </p>
                  <p className="font-mono text-xs text-zinc-600">
                    {petshop.subdomain}.{rootDomain}
                  </p>
                  <p className="mt-1 text-[0.6875rem] text-zinc-500">
                    Para trocar, contate o suporte (mudar quebraria links já
                    compartilhados).
                  </p>
                </div>
              </div>
              <a
                href={`https://${petshop.subdomain}.${rootDomain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md bg-zinc-950 px-3 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
              >
                <ExternalLink className="size-4" />
                Abrir landing
              </a>
            </CardContent>
          </Card>

          <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
            <CardContent className="p-5">
              <form
                onSubmit={submitGeneral}
                className="grid gap-4 sm:grid-cols-2"
              >
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="g_name">Nome da loja</Label>
                  <Input
                    id="g_name"
                    value={general.name}
                    onChange={(e) =>
                      setGeneral((s) => ({ ...s, name: e.target.value }))
                    }
                    required
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="g_legal">Razão social (opcional)</Label>
                  <Input
                    id="g_legal"
                    value={general.legal_name}
                    onChange={(e) =>
                      setGeneral((s) => ({ ...s, legal_name: e.target.value }))
                    }
                    placeholder="Nome jurídico da empresa"
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="g_addr">
                    <MapPin className="mr-1 inline size-3.5" />
                    Endereço
                  </Label>
                  <Textarea
                    id="g_addr"
                    rows={2}
                    value={general.address}
                    onChange={(e) =>
                      setGeneral((s) => ({ ...s, address: e.target.value }))
                    }
                    placeholder="Rua, número, bairro, cidade — UF"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="g_phone">
                    <Phone className="mr-1 inline size-3.5" />
                    Telefone
                  </Label>
                  <Input
                    id="g_phone"
                    value={general.phone}
                    onChange={(e) =>
                      setGeneral((s) => ({ ...s, phone: e.target.value }))
                    }
                    placeholder="(11) 0000-0000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="g_wa">WhatsApp</Label>
                  <Input
                    id="g_wa"
                    value={general.whatsapp}
                    onChange={(e) =>
                      setGeneral((s) => ({ ...s, whatsapp: e.target.value }))
                    }
                    placeholder="(11) 90000-0000"
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="g_email">
                    <Mail className="mr-1 inline size-3.5" />
                    Email
                  </Label>
                  <Input
                    id="g_email"
                    type="email"
                    value={general.email}
                    onChange={(e) =>
                      setGeneral((s) => ({ ...s, email: e.target.value }))
                    }
                    placeholder="contato@suapetshop.com.br"
                  />
                </div>

                <div className="flex justify-end sm:col-span-2">
                  <Button
                    type="submit"
                    disabled={pending}
                    className="rounded-md bg-zinc-950 text-white hover:bg-zinc-800"
                  >
                    <Save className="size-4" />
                    {pending ? "Salvando…" : "Salvar geral"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* OPERACIONAL */}
        <TabsContent value="operations" className="space-y-4">
          <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
            <CardContent className="p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="flex size-10 items-center justify-center rounded-md bg-zinc-100 text-zinc-700">
                  <Clock className="size-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-zinc-950">
                    Intervalo entre agendamentos
                  </p>
                  <p className="mt-1 text-xs text-zinc-600">
                    Cada agendamento ocupa esse tempo fixo no calendário. Se a
                    sua loja faz banhos rápidos, escolha 15 min. Pro padrão,
                    deixe 30 min.
                  </p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2 sm:max-w-md sm:grid-cols-5">
                {[15, 20, 30, 45, 60].map((opt) => {
                  const active = slotMinutes === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      disabled={pending}
                      onClick={() => submitOperations(opt)}
                      className={
                        "rounded-md border px-3 py-2 text-sm font-medium transition disabled:opacity-60 " +
                        (active
                          ? "border-zinc-950 bg-zinc-950 text-white"
                          : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400")
                      }
                    >
                      {opt} min
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-zinc-500">
                Atual: <span className="font-mono">{slotMinutes} min</span>. Mudança vale pros próximos agendamentos.
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href="/app/configuracoes/horarios"
              className="group flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-5 transition hover:border-zinc-400"
            >
              <div className="flex size-10 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
                <Clock className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-zinc-950">Horários</p>
                <p className="text-xs text-zinc-600">
                  Defina o funcionamento por calendário.
                </p>
              </div>
              <ArrowRight className="size-4 text-zinc-400 transition group-hover:text-zinc-900" />
            </Link>
            <Link
              href="/app/configuracoes/categorias"
              className="group flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-5 transition hover:border-zinc-400"
            >
              <div className="flex size-10 items-center justify-center rounded-md bg-sky-50 text-sky-700">
                <Tags className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-zinc-950">
                  Categorias financeiras
                </p>
                <p className="text-xs text-zinc-600">
                  Crie, edite ou arquive categorias de receita e despesa.
                </p>
              </div>
              <ArrowRight className="size-4 text-zinc-400 transition group-hover:text-zinc-900" />
            </Link>
          </div>
        </TabsContent>

        {/* VISUAL */}
        <TabsContent value="visual" className="space-y-4">
          {/* Logo */}
          <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
                <ImageIcon className="size-4 text-zinc-700" />
                Logo da loja
              </div>
              <p className="text-xs text-zinc-500">
                Aparece no painel interno e na landing pública do seu subdomínio.
                Tamanho máximo: 2MB. Formatos: PNG, JPG, WEBP ou SVG.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <div
                  className="flex size-24 items-center justify-center overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50"
                  style={{ backgroundColor: logoPreview ? "white" : "#f4f4f5" }}
                >
                  {logoPreview ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={logoPreview}
                      alt="Logo"
                      className="size-full object-contain"
                    />
                  ) : (
                    <ImageIcon className="size-8 text-zinc-400" />
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={pending}
                    className="rounded-md border-zinc-300 bg-white"
                  >
                    <Upload className="size-4" />
                    {pending ? "Enviando…" : logoPreview ? "Trocar logo" : "Carregar logo"}
                  </Button>
                  {logoPreview ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleRemoveLogo}
                      disabled={pending}
                      className="rounded-md border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
                    >
                      <Trash2 className="size-4" />
                      Remover
                    </Button>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cor primária */}
          <Card className="rounded-lg border-zinc-200 bg-white shadow-none">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
                <Palette className="size-4 text-zinc-700" />
                Cor primária
              </div>
              <p className="text-xs text-zinc-500">
                Cor usada na landing pública do seu subdomínio (botões, acentos
                de texto e elementos de destaque).
              </p>
              <form onSubmit={submitColor} className="flex flex-wrap items-end gap-3">
                <div className="space-y-2">
                  <Label htmlFor="v_color">Cor (#RRGGBB)</Label>
                  <div className="flex items-center gap-2">
                    <input
                      id="v_color_picker"
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="h-10 w-12 cursor-pointer rounded-md border border-zinc-200 bg-white"
                    />
                    <Input
                      id="v_color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-32 font-mono"
                    />
                  </div>
                </div>

                <div
                  className="flex h-10 items-center rounded-md px-4 text-sm font-semibold text-white"
                  style={{ backgroundColor: color }}
                >
                  Preview
                </div>

                <Button
                  type="submit"
                  disabled={pending}
                  className="rounded-md bg-zinc-950 text-white hover:bg-zinc-800"
                >
                  <Save className="size-4" />
                  Salvar cor
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
