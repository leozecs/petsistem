"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Bell, LogOut, Menu, ShieldCheck, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import { navigationForSession } from "@/lib/data/navigation";
import { cn } from "@/lib/utils";
import { signOut } from "@/app/auth-actions";
import type { SessionContext } from "@/lib/auth/session";
import { PetsistemLogo } from "@/components/brand/logo";
import { isLightBackground } from "@/lib/color";

type ShellVariant = "admin" | "tenant";
type ActivePetshop = NonNullable<SessionContext["activeMembership"]>["petshop"];

const knownPetshopLogos: Record<string, string> = {
  petgres: "/brand/petgres-logo.png",
};

function roleLabel(session: SessionContext, variant: ShellVariant): string {
  if (variant === "admin") return "Admin Master";
  const role = session.activeMembership?.role;
  if (role === "owner") return "Dono";
  if (role === "attendant") return "Atendente";
  if (role === "veterinarian") return "Veterinário";
  return "Acesso";
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
        width={48}
        height={48}
        className="size-12 shrink-0 rounded-lg object-cover"
      />
    );
  }

  // Sem logo: pawprint discreto em quadrado emerald — sem letras iniciais.
  return (
    <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-emerald-800 text-[#f7f5ef]">
      <Store className="size-5" strokeWidth={2.2} />
    </div>
  );
}

function HeaderIdentity({ session, variant }: { session: SessionContext; variant: ShellVariant }) {
  if (variant === "admin") {
    return (
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-zinc-950 text-white">
          <ShieldCheck className="size-5" />
        </div>
        <div className="min-w-0">
          <p
            className="truncate text-[18px] font-semibold leading-tight tracking-tight text-zinc-950"
            style={{ fontFamily: "var(--font-bricolage)" }}
          >
            Admin Master
          </p>
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
        <p
          className="truncate text-[18px] font-semibold leading-tight tracking-tight text-zinc-950"
          style={{ fontFamily: "var(--font-bricolage)" }}
        >
          {petshop?.name ?? "Loja"}
        </p>
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
  const lightNavigation = isLightBackground(sidebarBg);

  return (
    <div className="flex h-full flex-col bg-zinc-950 text-white">
      <div className={cn("shrink-0 bg-zinc-950", mobile ? "p-3" : "p-5")}>
        <SidebarHeader session={session} variant={variant} />
      </div>

      <nav
        className={cn("flex-1 px-3 py-8", mobile ? "grid auto-rows-min grid-cols-2 content-start gap-2 overflow-y-auto" : "space-y-1 overflow-y-auto")}
        style={{ background: `linear-gradient(to bottom, #09090b 0, ${sidebarBg} 2.5rem, ${sidebarBg} calc(100% - 2.5rem), #09090b 100%)` }}
      >
        {(() => {
          // Normaliza trailing slash e escolhe o item com o href mais longo que
          // case com o pathname atual. Garante que só UM item fica ativo, e que
          // /app/configuracoes/horarios ativa "Horários" (não "Configurações"
          // ou "Dashboard"). Prefix-match strict via startsWith(href + "/").
          const path = pathname.endsWith("/") && pathname !== "/"
            ? pathname.slice(0, -1)
            : pathname;
          let activeHref: string | null = null;
          let activeLen = -1;
          for (const item of nav) {
            const href = item.href;
            const matches = path === href || path.startsWith(href + "/");
            if (matches && href.length > activeLen) {
              activeHref = href;
              activeLen = href.length;
            }
          }
          // layoutId único por instância (desktop vs mobile sheet) pra evitar
          // conflito da animação shared layout quando ambos estão montados.
          const indicatorId = `sidebar-active-${mobile ? "m" : "d"}`;
          return nav.map((item) => {
            const Icon = item.icon;
            const active = item.href === activeHref;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors duration-200",
                  mobile ? "min-h-12 border" : "h-10",
                  lightNavigation
                    ? "border-black/10 hover:bg-black/10"
                    : "border-white/10 hover:bg-white/10",
                  active
                    ? lightNavigation
                      ? "text-white hover:text-white"
                      : "text-zinc-950 hover:text-zinc-950"
                    : lightNavigation
                      ? "text-zinc-900 hover:text-black"
                      : "text-zinc-200 hover:text-white",
                )}
              >
                {active ? (
                  <motion.span
                    layoutId={indicatorId}
                    aria-hidden
                    className={cn(
                      "absolute inset-0 rounded-md",
                      lightNavigation ? "bg-zinc-950" : "bg-white",
                    )}
                    transition={{
                      type: "spring",
                      stiffness: 380,
                      damping: 32,
                    }}
                  />
                ) : null}
                <Icon className="relative size-4" />
                <span className="relative">{item.label}</span>
              </Link>
            );
          });
        })()}
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
  const router = useRouter();

  useEffect(() => {
    const routes = navigationForSession(session).map((item) => item.href);
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const prefetch = () => {
      routes.forEach((route, index) => {
        timers.push(setTimeout(() => {
          if (!cancelled) router.prefetch(route);
        }, index * 140));
      });
    };
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    const idleId = idleWindow.requestIdleCallback?.(prefetch, { timeout: 1_500 });
    if (idleId === undefined) timers.push(setTimeout(prefetch, 800));
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      if (idleId !== undefined) idleWindow.cancelIdleCallback?.(idleId);
    };
  }, [router, session]);
  return (
    <TooltipProvider>
      <div className="min-h-[100dvh] bg-zinc-100 text-zinc-950">
        <a
          href="#main-content"
          className="fixed left-4 top-3 z-[100] -translate-y-20 rounded-lg bg-zinc-950 px-4 py-2 text-sm font-medium text-white shadow-lg transition-transform focus:translate-y-0"
        >
          Pular para o conteúdo
        </a>

        <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 lg:block">
          <SidebarContent session={session} variant={variant} />
        </aside>

        <div className="pt-16 lg:pl-72">
          <header className="fixed inset-x-0 top-0 z-30 border-b border-zinc-200/80 bg-white/90 shadow-[0_1px_0_rgb(24_24_27/0.03)] backdrop-blur-xl lg:left-72">
            <div className="mx-auto flex h-16 w-full max-w-[1500px] items-center gap-3 px-4 sm:px-6 lg:px-8">
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
                <Button variant="outline" size="icon" className="rounded-md">
                  <Bell className="size-4" />
                  <span className="sr-only">Notificações</span>
                </Button>
              </div>
            </div>
          </header>

          <main
            id="main-content"
            className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8"
          >
            {children}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
