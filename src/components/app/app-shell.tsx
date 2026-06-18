"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Menu, Search } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import { navigation, tenant } from "@/lib/data/demo";
import { cn } from "@/lib/utils";

function SidebarContent() {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-zinc-950 text-white">
      <div className="border-b border-white/10 p-5">
        <Link href="/app" className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-white text-sm font-bold text-zinc-950">
            PS
          </div>
          <div>
            <p className="text-sm font-semibold">{tenant.name}</p>
            <p className="text-xs text-zinc-400">{tenant.plan}</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navigation.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-zinc-300 transition",
                "hover:bg-white/10 hover:text-white",
                active && "bg-white text-zinc-950 hover:bg-white hover:text-zinc-950",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="rounded-lg bg-white/7 p-3">
          <p className="text-xs font-medium text-zinc-400">Status da loja</p>
          <p className="mt-1 text-sm font-semibold text-white">Ativa e recebendo agendamentos</p>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <div className="min-h-[100dvh] bg-zinc-100 text-zinc-950">
        <aside className="fixed inset-y-0 left-0 hidden w-72 lg:block">
          <SidebarContent />
        </aside>

        <div className="lg:pl-72">
          <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/90 backdrop-blur">
            <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
              <Sheet>
                <SheetTrigger
                  render={<Button variant="outline" size="icon" className="rounded-md lg:hidden" />}
                >
                  <Menu className="size-4" />
                  <span className="sr-only">Abrir menu</span>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 border-0 bg-zinc-950 p-0">
                  <SheetTitle className="sr-only">Navegação</SheetTitle>
                  <SidebarContent />
                </SheetContent>
              </Sheet>

              <div className="hidden h-10 min-w-80 items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-500 md:flex">
                <Search className="size-4" />
                Buscar tutor, pet ou agendamento
              </div>

              <div className="ml-auto flex items-center gap-2">
                <Button variant="outline" size="icon" className="rounded-md">
                  <Bell className="size-4" />
                  <span className="sr-only">Notificações</span>
                </Button>
                <Avatar className="size-9 rounded-md">
                  <AvatarFallback className="rounded-md bg-zinc-950 text-xs text-white">LC</AvatarFallback>
                </Avatar>
              </div>
            </div>
          </header>

          <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  );
}
