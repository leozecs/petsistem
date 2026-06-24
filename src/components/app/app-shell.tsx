"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { LogOut, Menu, ShieldCheck, Store } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import { navigationForSession } from "@/lib/data/navigation";
import { cn } from "@/lib/utils";
import { signOut } from "@/app/auth-actions";
import type { SessionContext } from "@/lib/auth/session";
import { PetsistemLogo } from "@/components/brand/logo";

type ShellVariant = "admin" | "tenant";

function PageTransition({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
type ActivePetshop = NonNullable<SessionContext["activeMembership"]>["petshop"];

const knownPetshopLogos: Record<string, string> = {
  petgres: "/brand/petgres-logo.png",
};

function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "PS";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function roleLabel(session: SessionContext, variant: ShellVariant): string {
  if (variant === "admin") return "Admin Master";
  const role = session.activeMembership?.role;
  if (role === "owner") return "Dono";
  if (role === "attendant") return "Atendente";
  if (role === "veterinarian") return "Veterinário";
  return "Acesso";
}

function isLightColor(hex: string): boolean {
  const red = Number.parseInt(hex.slice(1, 3), 16);
  const green = Number.parseInt(hex.slice(3, 5), 16);
  const blue = Number.parseInt(hex.slice(5, 7), 16);
  return (red * 299 + green * 587 + blue * 114) / 1000 >= 150;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

function getPetshopLogoUrl(petshop: ActivePetshop | null | undefined) {
  if (!petshop) return null;
  // Logo carregada pelo dono via /app/configuracoes tem prioridade.
  if (petshop.logoPath && SUPABASE_URL) {
    return `${SUPABASE_URL}/storage/v1/object/public/petshop-logos/${petshop.logoPath}`;
  }
  return knownPetshopLogos[petshop.slug] ?? knownPetshopLogos[petshop.subdomain] ?? null;
}

function PetshopBadge({ petshop }: { petshop: ActivePetshop | null | undefined }) {
  const logoUrl = getPetshopLogoUrl(petshop);
  const name = petshop?.name ?? "PETSISTEM";

  if (logoUrl) {
    return (
      <Image
        src={logoUrl}
        alt={`Logo ${name}`}
        width={40}
        height={40}
        className="size-10 shrink-0 rounded-md object-cover"
      />
    );
  }

  return (
    <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-zinc-950 text-xs font-bold text-white">
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

function HeaderIdentity({ session, variant }: { session: SessionContext; variant: ShellVariant }) {
  if (variant === "admin") {
    return (
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-zinc-950 text-white">
          <ShieldCheck className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-zinc-950">Admin Master</p>
          <p className="text-xs text-zinc-500">PETSISTEM</p>
        </div>
      </div>
    );
  }

  const petshop = session.activeMembership?.petshop;

  return (
    <div className="flex min-w-0 items-center gap-3">
      <PetshopBadge petshop={petshop} />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-zinc-950">{petshop?.name ?? "Loja"}</p>
        <p className="flex items-center gap-1 text-xs text-zinc-500">
          <Store className="size-3" />
          {petshop?.planName ?? "Loja ativa"}
        </p>
      </div>
    </div>
  );
}

function SidebarHeader({ session, variant }: { session: SessionContext; variant: ShellVariant }) {
  if (variant === "admin") {
    return (
      <Link href="/admin-master" className="flex flex-col gap-2">
        <div className="flex h-10 w-36 items-center overflow-hidden">
          <PetsistemLogo tone="light" className="w-36" priority />
        </div>
        <p className="text-xs font-medium text-zinc-400">Admin Master</p>
      </Link>
    );
  }

  const petshop = session.activeMembership?.petshop;
  return (
    <Link href="/app" className="flex flex-col gap-2">
      <div className="flex h-10 w-36 items-center overflow-hidden">
        <PetsistemLogo tone="light" className="w-36" priority />
      </div>
      <p className="text-xs font-medium text-zinc-400">{petshop?.planName ?? "Plataforma"}</p>
    </Link>
  );
}

function SidebarFooter({ session, variant }: { session: SessionContext; variant: ShellVariant }) {
  const showBackToAdmin = variant === "tenant" && session.user.globalRole === "admin_master";

  return (
    <div className="border-t border-white/10 p-4">
      <div className="rounded-lg bg-white/7 p-3">
        <p className="text-xs font-medium text-zinc-400">{roleLabel(session, variant)}</p>
        <p className="mt-1 text-sm font-semibold text-white">{session.user.fullName}</p>
        <p className="truncate text-xs text-zinc-400">{session.user.email}</p>
      </div>

      {showBackToAdmin ? (
        <Link
          href="/admin-master"
          className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-md border border-white/15 text-sm font-medium text-zinc-200 transition hover:bg-white/10 hover:text-white"
        >
          <ShieldCheck className="size-4" />
          Voltar ao Admin
        </Link>
      ) : null}

      <form action={signOut}>
        <button
          type="submit"
          className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-md border border-white/15 text-sm font-medium text-zinc-200 transition hover:bg-white/10 hover:text-white"
        >
          <LogOut className="size-4" />
          Sair
        </button>
      </form>
    </div>
  );
}

function SidebarContent({ session, variant, mobile = false, onNavigate }: { session: SessionContext; variant: ShellVariant; mobile?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const nav = navigationForSession(session);

  // A cor da loja pertence apenas ao miolo de navegação. Identidade e conta
  // ficam em zonas neutras para preservar legibilidade em qualquer tema.
  const tenantColor =
    variant === "tenant" ? session.activeMembership?.petshop.primaryColor : null;
  const sidebarBg = tenantColor && /^#[0-9a-fA-F]{6}$/.test(tenantColor)
    ? tenantColor
    : "#09090b"; // zinc-950
  const lightNavigation = isLightColor(sidebarBg);

  return (
    <div className="flex h-full flex-col bg-zinc-950 text-white">
      <div className={cn("shrink-0 bg-zinc-950", mobile ? "p-3" : "p-5")}>
        <SidebarHeader session={session} variant={variant} />
      </div>

      <nav
        className={cn("flex-1 p-3", mobile ? "grid auto-rows-min grid-cols-2 content-start gap-2 overflow-y-auto" : "space-y-1 overflow-y-auto")}
        style={{ backgroundColor: sidebarBg }}
      >
        {nav.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 text-sm font-medium transition",
                mobile ? "min-h-12 border" : "h-10",
                lightNavigation
                  ? "border-black/10 text-zinc-900 hover:bg-black/10 hover:text-black"
                  : "border-white/10 text-zinc-200 hover:bg-white/10 hover:text-white",
                active && (lightNavigation
                  ? "bg-zinc-950 text-white hover:bg-zinc-900 hover:text-white"
                  : "bg-white text-zinc-950 hover:bg-white hover:text-zinc-950"),
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 bg-zinc-950">
        <SidebarFooter session={session} variant={variant} />
      </div>
    </div>
  );
}

export function AppShell({
  children,
  session,
  variant = "tenant",
}: {
  children: React.ReactNode;
  session: SessionContext;
  variant?: ShellVariant;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  return (
    <TooltipProvider>
      <div className="min-h-[100dvh] bg-zinc-100 text-zinc-950">
        <aside className="fixed inset-y-0 left-0 hidden w-72 lg:block">
          <SidebarContent session={session} variant={variant} />
        </aside>

        <div className="pt-16 lg:pl-72">
          <header className="fixed inset-x-0 top-0 z-30 border-b border-zinc-200 bg-white/95 backdrop-blur lg:left-72">
            <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger
                  render={<Button variant="outline" size="icon" className="rounded-md lg:hidden" />}
                >
                  <Menu className="size-4" />
                  <span className="sr-only">Abrir menu</span>
                </SheetTrigger>
                <SheetContent side="left" className="w-[min(92vw,420px)] border-0 bg-zinc-950 p-0" showCloseButton={false}>
                  <SheetTitle className="sr-only">Navegação</SheetTitle>
                  <SidebarContent session={session} variant={variant} mobile onNavigate={() => setMobileMenuOpen(false)} />
                </SheetContent>
              </Sheet>

              <div className="min-w-0">
                <HeaderIdentity session={session} variant={variant} />
              </div>

              <div className="ml-auto flex items-center gap-2">
                <Avatar className="size-9 rounded-md">
                  <AvatarFallback className="rounded-md bg-zinc-950 text-xs text-white">
                    {initials(session.user.fullName)}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          </header>

          <PageTransition>
            <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
          </PageTransition>
        </div>
      </div>
    </TooltipProvider>
  );
}
