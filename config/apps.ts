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
    dbSlug: "sgestion",
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
          { label: "Empresas", path: "/directorio/empresas", icon: Building2, requiredPermissions: ["directorio:access"] },
          { label: "Servicios", path: "/directorio/servicios", icon: Package, requiredPermissions: ["directorio:access"] },
          { label: "Usuarios", path: "/directorio/usuarios", icon: Users, requiredPermissions: ["directorio:access"] },
          { label: "Facilitadores", path: "/directorio/facilitadores", icon: UserCheck, requiredPermissions: ["directorio:access"] },
        ],
      },
      {
        groupLabel: "Pipeline",
        links: [
          { label: "Pipeline", path: "/pipeline", icon: GitBranch, requiredPermissions: ["pipeline:access"] },
          { label: "Leads", path: "/crm/leads", icon: Target, requiredPermissions: ["mkt:leads:write", "sales:leads:access"] },
          { label: "Contactos", path: "/pipeline/contactos", icon: Phone, requiredPermissions: ["mkt:contactos:read", "sales:clientes:access", "directorio:access"] },
          { label: "Tratos", path: "/pipeline/tratos", icon: Handshake, requiredPermissions: ["sales:tratos:access"] },
          { label: "Solpeds", path: "/pipeline/solpeds", icon: ClipboardList, requiredPermissions: ["sales:solpeds:access"] },
          { label: "OSI", path: "/pipeline/osi", icon: FileCheck, requiredPermissions: ["sales:osi:executive"] },
          { label: "Clientes", path: "/pipeline/clientes", icon: UserCircle, requiredPermissions: ["sales:clientes:access"] },
        ],
      },
      {
        groupLabel: "Ingeniería de costos",
        links: [
          { label: "ECC", path: "/ingenieria/ecc", icon: Calculator, requiredPermissions: ["finance:ecc:read"] },
          { label: "Catálogo de costos", path: "/ingenieria/catalogo-costos", icon: BookOpen, requiredPermissions: ["finance:catalogo:access"] },
          { label: "Presupuestos", path: "/ingenieria/presupuestos", icon: Receipt, requiredPermissions: ["finance:presupuestos:access"] },
          { label: "OSI", path: "/ingenieria/osi", icon: FileCheck, requiredPermissions: ["finance:osi:edit"] },
        ],
      },
    ],
  },
  {
    id: "capacitacion",
    dbSlug: "scapacitacion",
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
      { label: "Gestión de Cursos", path: "/dashboard/capacitacion/gestion-cursos", icon: BookOpen, requiredPermissions: ["scapacitacion:all:access"] },
      { label: "Participantes", path: "/dashboard/capacitacion/participantes", icon: Users, requiredPermissions: ["scapacitacion:all:access"] },
      { label: "Consulta de Participantes", path: "/dashboard/capacitacion/consulta-participantes", icon: Search, requiredPermissions: ["scapacitacion:all:access"] },
      { label: "Facilitadores", path: "/dashboard/capacitacion/gestion-de-facilitadores", icon: UserCheck, requiredPermissions: ["scapacitacion:all:access"] },
      { label: "Gestión de Certificados", path: "/dashboard/capacitacion/gestion-certificados", icon: Award, requiredPermissions: ["scapacitacion:all:access"] },
      { label: "Generación de Certificados", path: "/dashboard/capacitacion/generacion-certificado", icon: FilePlus2, requiredPermissions: ["scapacitacion:all:access"] },
      { label: "Control de Secuencia", path: "/dashboard/capacitacion/control-secuencia", icon: ListOrdered, requiredPermissions: ["scapacitacion:all:access"] },
      { label: "Reportes", path: "/dashboard/capacitacion/reportes", icon: BarChart2, requiredPermissions: ["scapacitacion:all:access"] },
      { label: "Plantillas de Carnets", path: "/dashboard/capacitacion/plantillas-carnets", icon: CreditCard, requiredPermissions: ["scapacitacion:all:access"] },
      { label: "Plantillas de Certificados", path: "/dashboard/capacitacion/plantillas-certificados", icon: LayoutTemplate, requiredPermissions: ["scapacitacion:all:access"] },
      { label: "Plantillas de Cursos", path: "/dashboard/capacitacion/gestion-plantillas-cursos", icon: ClipboardList, requiredPermissions: ["scapacitacion:all:access"] },
      { label: "Gestión de Firmas", path: "/dashboard/capacitacion/gestion-de-firmas", icon: PenLine, requiredPermissions: ["scapacitacion:all:access"] },
    ],
  },
];

export function getAppByPath(pathname: string): AppConfig | undefined {
  return apps.find((app) => pathname.startsWith(app.basePath));
}

export function getAppById(id: string): AppConfig | undefined {
  return apps.find((app) => app.id === id);
}
