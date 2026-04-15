import {
  Briefcase,
  GraduationCap,
  LayoutDashboard,
  Users,
  BarChart2,
  Settings,
  BookOpen,
  ClipboardList,
  Award,
  UserCheck,
  FilePlus2,
  CreditCard,
  LayoutTemplate,
  ListOrdered,
  PenLine,
  Building2,
  Search,
  Package,
  GitBranch,
  Target,
  Phone,
  Handshake,
  FileCheck,
  UserCircle,
  Calculator,
  Receipt,
} from "lucide-react";
import { AppConfig } from "@/types";

export const apps: AppConfig[] = [
  {
    id: "negocios",
    name: "Gestión",
    description: "Gestión comercial y operativa",
    basePath: "/negocios",
    upstreamUrl:
      process.env.NEXT_PUBLIC_NEGOCIOS_URL ||
      "https://gestion.shadevenezuela.com.ve",
    icon: Briefcase,
    color: "text-blue-500",
    navLinks: [
      {
        groupLabel: "Directorio",
        links: [
          { label: "Empresas", path: "/directorio/empresas", icon: Building2 , allowedRoles: ["admin"] },
          { label: "Servicios", path: "/directorio/servicios", icon: Package , allowedRoles: ["admin"] },
          { label: "Usuarios", path: "/directorio/usuarios", icon: Users , allowedRoles: ["admin"] },
          { label: "Facilitadores", path: "/directorio/facilitadores", icon: UserCheck , allowedRoles: ["admin"] },
        ],
      },
      {
        groupLabel: "Pipeline",
        links: [
          { label: "Pipeline", path: "/pipeline", icon: GitBranch, allowedRoles: ["admin"] },
          { label: "Leads", path: "/crm/leads", icon: Target, allowedRoles: ["admin"] },
          { label: "Contactos", path: "/pipeline/contactos", icon: Phone, allowedRoles: ["admin"] },
          { label: "Tratos", path: "/pipeline/tratos", icon: Handshake, allowedRoles: ["admin"] },
          { label: "Solpeds", path: "/pipeline/solpeds", icon: ClipboardList, allowedRoles: ["admin"] },
          { label: "OSI", path: "/pipeline/osi", icon: FileCheck, allowedRoles: ["admin"] },
          { label: "Clientes", path: "/pipeline/clientes", icon: UserCircle, allowedRoles: ["admin"] },
        ],
      },
      {
        groupLabel: "Ingeniería de costos",
        links: [
          { label: "ECC", path: "/ingenieria/ecc", icon: Calculator, allowedRoles: ["admin"] },
          { label: "Catálogo de costos", path: "/ingenieria/catalogo-costos", icon: BookOpen, allowedRoles: ["admin"] },
          { label: "Presupuestos", path: "/ingenieria/presupuestos", icon: Receipt, allowedRoles: ["admin"] },
          { label: "OSI", path: "/ingenieria/osi", icon: FileCheck, allowedRoles: ["admin"] },
        ],
      },
    ],
  },
  {
    id: "capacitacion",
    name: "Capacitación",
    description: "Plataforma de formación y aprendizaje",
    basePath: "/capacitacion",
    upstreamUrl:
      process.env.NEXT_PUBLIC_CAPACITACION_URL ||
      "https://capacitacion.shadevenezuela.com.ve",
    icon: GraduationCap,
    color: "text-emerald-500",
    navLinks: [
      { label: "Dashboard", path: "/", icon: LayoutDashboard },
      { label: "Gestión de Cursos", path: "/dashboard/capacitacion/gestion-cursos", icon: BookOpen },
      { label: "Participantes", path: "/dashboard/capacitacion/participantes", icon: Users },
      { label: "Consulta de Participantes", path: "/dashboard/capacitacion/consulta-participantes", icon: Search },
      { label: "Facilitadores", path: "/dashboard/capacitacion/gestion-de-facilitadores", icon: UserCheck },
      { label: "Gestión de Certificados", path: "/dashboard/capacitacion/gestion-certificados", icon: Award },
      { label: "Generación de Certificados", path: "/dashboard/capacitacion/generacion-certificado", icon: FilePlus2 },
      { label: "Control de Secuencia", path: "/dashboard/capacitacion/control-secuencia", icon: ListOrdered },
      { label: "Reportes", path: "/dashboard/capacitacion/reportes", icon: BarChart2 },
      { label: "Plantillas de Carnets", path: "/dashboard/capacitacion/plantillas-carnets", icon: CreditCard, allowedRoles: ["admin"] },
      { label: "Plantillas de Certificados", path: "/dashboard/capacitacion/plantillas-certificados", icon: LayoutTemplate, allowedRoles: ["admin"] },
      { label: "Plantillas de Cursos", path: "/dashboard/capacitacion/gestion-plantillas-cursos", icon: ClipboardList, allowedRoles: ["admin"] },
      { label: "Gestión de Firmas", path: "/dashboard/capacitacion/gestion-de-firmas", icon: PenLine, allowedRoles: ["admin"] },
    ],
  },
];

export function getAppByPath(pathname: string): AppConfig | undefined {
  return apps.find((app) => pathname.startsWith(app.basePath));
}

export function getAppById(id: string): AppConfig | undefined {
  return apps.find((app) => app.id === id);
}
