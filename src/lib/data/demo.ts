import {
  Activity,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  ClipboardCheck,
  CreditCard,
  FileBarChart,
  HeartPulse,
  PawPrint,
  Settings,
  Scissors,
  ShieldCheck,
  Store,
  Stethoscope,
  Users,
  UserCog,
} from "lucide-react";

export type Role = "admin_master" | "owner" | "attendant" | "veterinarian";

export const tenant = {
  name: "Petgres",
  slug: "petgres",
  subdomain: "petgres",
  logoUrl: "/brand/petgres-logo.png",
  status: "Ativa",
  plan: "Profissional",
  whatsapp: "(19) 99999-0101",
  address: "Rua das Palmeiras, 120 - Vinhedo",
  pixKey: "financeiro@petgres.com.br",
};

export const services = [
  { name: "Banho", area: "Banho e Tosa", duration: "45 min", price: "R$ 70" },
  { name: "Tosa", area: "Banho e Tosa", duration: "60 min", price: "R$ 90" },
  { name: "Banho + Tosa", area: "Banho e Tosa", duration: "90 min", price: "R$ 140" },
  { name: "Hidratação", area: "Banho e Tosa", duration: "50 min", price: "R$ 95" },
  { name: "Consulta", area: "Veterinária", duration: "40 min", price: "R$ 160" },
  { name: "Vacinação", area: "Veterinária", duration: "30 min", price: "R$ 120" },
];

export const ownerKpis = [
  { label: "Agendamentos hoje", value: "18", trend: "+12%", icon: CalendarCheck },
  { label: "Consultas hoje", value: "7", trend: "+3", icon: HeartPulse },
  { label: "Pets em atendimento", value: "5", trend: "ao vivo", icon: PawPrint },
  { label: "Finalizados", value: "11", trend: "61%", icon: CheckCircle2 },
];

export const adminKpis = [
  { label: "Total de lojas", value: "42", icon: Store },
  { label: "Lojas ativas", value: "36", icon: ShieldCheck },
  { label: "Receita mensal", value: "R$ 41,8k", icon: CreditCard },
  { label: "Pagamentos atrasados", value: "4", icon: Activity },
];

export const appointments = [
  {
    time: "08:30",
    pet: "Luna",
    tutor: "Marina Costa",
    service: "Banho + Tosa",
    professional: "Camila",
    status: "Confirmado",
    area: "Banho e Tosa",
  },
  {
    time: "09:20",
    pet: "Thor",
    tutor: "Gustavo Lima",
    service: "Consulta",
    professional: "Dra. Ana",
    status: "Em atendimento",
    area: "Veterinária",
  },
  {
    time: "10:40",
    pet: "Nina",
    tutor: "Paula Ribeiro",
    service: "Vacinação",
    professional: "Dr. Marcos",
    status: "Confirmado",
    area: "Veterinária",
  },
  {
    time: "14:10",
    pet: "Bob",
    tutor: "Eduardo Rocha",
    service: "Tosa",
    professional: "Renan",
    status: "Pendente",
    area: "Banho e Tosa",
  },
];

export const clients = [
  { name: "Marina Costa", phone: "(19) 98888-0011", pets: "Luna", lastVisit: "Hoje" },
  { name: "Gustavo Lima", phone: "(19) 97777-0202", pets: "Thor", lastVisit: "Hoje" },
  { name: "Paula Ribeiro", phone: "(19) 96666-3030", pets: "Nina, Mel", lastVisit: "12 jun" },
  { name: "Eduardo Rocha", phone: "(19) 95555-4040", pets: "Bob", lastVisit: "08 jun" },
];

export const pets = [
  { name: "Luna", species: "Cachorro", breed: "Golden Retriever", tutor: "Marina Costa", weight: "24 kg" },
  { name: "Thor", species: "Gato", breed: "Maine Coon", tutor: "Gustavo Lima", weight: "7,5 kg" },
  { name: "Nina", species: "Cachorro", breed: "Spitz Alemão", tutor: "Paula Ribeiro", weight: "4,8 kg" },
  { name: "Bob", species: "Cachorro", breed: "SRD", tutor: "Eduardo Rocha", weight: "13 kg" },
];

export const checklistSteps = [
  { label: "Pet chegou", done: true, time: "08:24" },
  { label: "Pré-avaliação", done: true, time: "08:31" },
  { label: "Banho iniciado", done: true, time: "08:44" },
  { label: "Secagem", done: false, current: true, time: "em andamento" },
  { label: "Tosa", done: false, time: "pendente" },
  { label: "Escovação", done: false, time: "pendente" },
  { label: "Finalização", done: false, time: "pendente" },
  { label: "Pronto para retirada", done: false, time: "pendente" },
];

export const navigation = [
  { href: "/app", label: "Dashboard", icon: Activity },
  { href: "/app/lojas", label: "Lojas", icon: Store },
  { href: "/app/calendarios", label: "Calendários", icon: CalendarCheck },
  { href: "/app/clientes", label: "Clientes", icon: Users },
  { href: "/app/pets", label: "Pets", icon: PawPrint },
  { href: "/app/funcionarios", label: "Funcionários", icon: UserCog },
  { href: "/app/veterinarios", label: "Veterinários", icon: Stethoscope },
  { href: "/app/checklist", label: "Checklist", icon: ClipboardCheck },
  { href: "/app/relatorios", label: "Relatórios", icon: FileBarChart },
  { href: "/app/assinatura", label: "Assinatura", icon: CreditCard },
  { href: "/app/configuracoes", label: "Configurações", icon: Settings },
];

export const stores = [
  {
    id: "petgres",
    name: "Petgres",
    subdomain: "petgres",
    status: "Ativa",
    plan: "Profissional",
    owner: "Leo Codes",
  },
  {
    id: "petshopabc",
    name: "Petshop ABC",
    subdomain: "petshopabc",
    status: "Atrasada",
    plan: "Essencial",
    owner: "Marina Costa",
  },
  {
    id: "meupet",
    name: "Meu Pet",
    subdomain: "meupet",
    status: "Bloqueada",
    plan: "Profissional",
    owner: "Gustavo Lima",
  },
];

export const reportItems = [
  { label: "Agenda", value: "126 atendimentos no mês", icon: CalendarCheck },
  { label: "Operação", value: "89 checklists finalizados", icon: ClipboardList },
  { label: "Receita", value: "R$ 18,4k em serviços", icon: CreditCard },
];

export const publicActions = [
  { label: "Agendar Banho e Tosa", href: "#agendar", icon: Scissors },
  { label: "Agendar Consulta Veterinária", href: "#agendar", icon: HeartPulse },
  { label: "Entrar no Sistema", href: "/login", icon: ShieldCheck },
];
