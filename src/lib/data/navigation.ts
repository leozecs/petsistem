import {
  Activity,
  Bell,
  CalendarCheck,
  ClipboardCheck,
  CreditCard,
  FileBarChart,
  Clock,
  HeartPulse,
  Receipt,
  Scissors,
  Settings,
  Store,
  Stethoscope,
  Tags,
  Users,
  UserCog,
  type LucideIcon,
} from "lucide-react";
import type { GlobalRole, MemberRole, SessionContext } from "@/lib/auth/session";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const adminMasterNav: NavItem[] = [
  { href: "/admin-master", label: "Visão geral", icon: Activity },
  { href: "/admin-master/lojas", label: "Lojas", icon: Store },
  { href: "/admin-master/planos", label: "Planos", icon: CreditCard },
  { href: "/admin-master/assinaturas", label: "Assinaturas", icon: FileBarChart },
  { href: "/admin-master/cobrancas", label: "Cobranças", icon: Bell },
  { href: "/admin-master/usuarios", label: "Usuários", icon: Users },
  { href: "/admin-master/configuracoes", label: "Configurações", icon: Settings },
];

// Ordem owner: Dashboard, Calendários, Atendimentos (grooming + checklist),
// Serviços, Tutores & Pets, Funcionários (engloba vet — merge pendente),
// Financeiro, Horários, Categorias, Assinatura, Configurações.
// Veterinários sai do menu — merge do CRUD com funcionários virá em fase
// dedicada; a rota /app/veterinarios continua funcional pra compat.
export const ownerNav: NavItem[] = [
  { href: "/app", label: "Dashboard", icon: Activity },
  { href: "/app/calendarios", label: "Calendários", icon: CalendarCheck },
  { href: "/app/checklist", label: "Atendimentos", icon: ClipboardCheck },
  { href: "/app/servicos", label: "Serviços", icon: Scissors },
  { href: "/app/clientes", label: "Tutores & Pets", icon: Users },
  { href: "/app/funcionarios", label: "Funcionários", icon: UserCog },
  { href: "/app/financeiro", label: "Financeiro", icon: Receipt },
  { href: "/app/configuracoes/horarios", label: "Horários", icon: Clock },
  { href: "/app/configuracoes/categorias", label: "Categorias", icon: Tags },
  { href: "/app/assinatura", label: "Assinatura", icon: CreditCard },
  { href: "/app/configuracoes", label: "Configurações", icon: Settings },
];

export const attendantNav: NavItem[] = [
  { href: "/app", label: "Dashboard", icon: Activity },
  { href: "/app/calendarios", label: "Calendários", icon: CalendarCheck },
  { href: "/app/checklist", label: "Atendimentos", icon: ClipboardCheck },
  { href: "/app/clientes", label: "Tutores & Pets", icon: Users },
  { href: "/app/financeiro", label: "Financeiro", icon: Receipt },
];

export const veterinarianNav: NavItem[] = [
  { href: "/app", label: "Dashboard", icon: Activity },
  { href: "/app/calendarios", label: "Consultas", icon: HeartPulse },
  { href: "/app/clientes", label: "Tutores & Pets", icon: Users },
];

export function navigationForSession(session: SessionContext): NavItem[] {
  if (session.user.globalRole === "admin_master") {
    return adminMasterNav;
  }
  const role: MemberRole | undefined = session.activeMembership?.role;
  if (role === "owner") return ownerNav;
  if (role === "attendant") return attendantNav;
  if (role === "veterinarian") return veterinarianNav;
  return [];
}

export function navigationForRole(
  globalRole: GlobalRole,
  memberRole: MemberRole | null,
): NavItem[] {
  if (globalRole === "admin_master") return adminMasterNav;
  if (memberRole === "owner") return ownerNav;
  if (memberRole === "attendant") return attendantNav;
  if (memberRole === "veterinarian") return veterinarianNav;
  return [];
}
