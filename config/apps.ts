import {
  Briefcase,
  GraduationCap,
  LayoutDashboard,
  Users,
  BarChart2,
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
  Cloud,
  Calendar,
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
    color: "text-green-700",
    badge: {
      bg: "bg-green-50",
      text: "text-green-800",
      border: "border-green-200",
      dot: "bg-green-700",
    },
    navLinks: [
      {
        groupLabel: "Directorio",
        links: [
          {
            label: "Empresas",
            path: "/directorio/empresas",
            icon: Building2,
            requiredPermissions: ["directorio:access"],
          },
          {
            label: "Servicios",
            path: "/directorio/servicios",
            icon: Package,
            requiredPermissions: ["directorio:access"],
          },
          {
            label: "Usuarios",
            path: "/directorio/usuarios",
            icon: Users,
            requiredPermissions: ["directorio:access"],
          },
          {
            label: "Facilitadores",
            path: "/directorio/facilitadores",
            icon: UserCheck,
            requiredPermissions: ["directorio:access"],
          },
        ],
      },
      {
        groupLabel: "Pipeline",
        links: [
          {
            label: "Pipeline",
            path: "/pipeline",
            icon: GitBranch,
            requiredPermissions: ["pipeline:access"],
          },
          {
            label: "Leads",
            path: "/crm/leads",
            icon: Target,
            requiredPermissions: ["mkt:leads:write", "sales:leads:access"],
          },
          {
            label: "Contactos",
            path: "/pipeline/contactos",
            icon: Phone,
            requiredPermissions: [
              "mkt:contactos:read",
              "sales:clientes:access",
              "directorio:access",
            ],
          },
          {
            label: "Tratos",
            path: "/pipeline/tratos",
            icon: Handshake,
            requiredPermissions: ["sales:tratos:access"],
          },
          {
            label: "Solpeds",
            path: "/pipeline/solpeds",
            icon: ClipboardList,
            requiredPermissions: ["sales:solpeds:access"],
          },
          {
            label: "OSI",
            path: "/pipeline/osi",
            icon: FileCheck,
            requiredPermissions: ["sales:osi:executive"],
          },
          {
            label: "Clientes",
            path: "/pipeline/clientes",
            icon: UserCircle,
            requiredPermissions: ["sales:clientes:access"],
          },
        ],
      },
      {
        groupLabel: "Ingeniería de costos",
        links: [
          {
            label: "Tratos",
            path: "/ingenieria/tratos",
            icon: Handshake,
            requiredPermissions: ["finance:ecc:read"],
          },
          {
            label: "ECC",
            path: "/ingenieria/ecc",
            icon: Calculator,
            requiredPermissions: ["finance:ecc:read"],
          },
          {
            label: "Catálogo de costos",
            path: "/ingenieria/catalogo-costos",
            icon: BookOpen,
            requiredPermissions: ["finance:catalogo:access"],
          },
          {
            label: "Presupuestos",
            path: "/ingenieria/presupuestos",
            icon: Receipt,
            requiredPermissions: ["finance:presupuestos:access"],
          },
          {
            label: "OSI",
            path: "/ingenieria/osi",
            icon: FileCheck,
            requiredPermissions: ["finance:osi:edit"],
          },
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
    color: "text-amber-500",
    badge: {
      bg: "bg-amber-50",
      text: "text-amber-700",
      border: "border-amber-200",
      dot: "bg-amber-500",
    },
    navLinks: [
      { label: "Dashboard", path: "/", icon: LayoutDashboard },
      {
        groupLabel: "Cursos y Planificación",
        links: [
          {
            label: "Gestión de cursos",
            path: "/dashboard/capacitacion/gestion-cursos",
            icon: BookOpen,
            requiredPermissions: ["scapacitacion:all:access"],
          },
          {
            label: "Planificación de servicios",
            path: "/dashboard/capacitacion/planificacion-servicios",
            icon: Calendar,
            requiredPermissions: ["scapacitacion:all:access"],
          },
          {
            label: "Control de secuencia",
            path: "/dashboard/capacitacion/control-secuencia",
            icon: ListOrdered,
            requiredPermissions: ["scapacitacion:all:access"],
          },
          {
            label: "Gestión de OSI",
            path: "/dashboard/capacitacion/gestion-osi",
            icon: FileCheck,
            requiredPermissions: ["scapacitacion:all:access"],
          },
        ],
      },
      {
        groupLabel: "Participantes",
        links: [
          {
            label: "Consulta de participantes",
            path: "/dashboard/capacitacion/consulta-participantes",
            icon: Search,
            requiredPermissions: ["scapacitacion:all:access"],
          },
        ],
      },
      {
        groupLabel: "Facilitadores",
        links: [
          {
            label: "Gestión de facilitadores",
            path: "/dashboard/capacitacion/gestion-de-facilitadores",
            icon: UserCheck,
            requiredPermissions: ["scapacitacion:all:access"],
          },
          {
            label: "Gestión de firmas",
            path: "/dashboard/capacitacion/gestion-de-firmas",
            icon: PenLine,
            requiredPermissions: ["scapacitacion:all:access"],
          },
        ],
      },
      {
        groupLabel: "Certificados",
        links: [
          {
            label: "Gestión de certificados",
            path: "/dashboard/capacitacion/gestion-certificados",
            icon: Award,
            requiredPermissions: ["scapacitacion:all:access"],
          },
          {
            label: "Generación de certificados",
            path: "/dashboard/capacitacion/generacion-certificado",
            icon: FilePlus2,
            requiredPermissions: ["scapacitacion:all:access"],
          },
        ],
      },
      {
        groupLabel: "Plantillas",
        links: [
          {
            label: "Gestión de plantillas de cursos",
            path: "/dashboard/capacitacion/gestion-plantillas-cursos",
            icon: ClipboardList,
            requiredPermissions: ["scapacitacion:all:access"],
          },
          {
            label: "Plantillas de certificados",
            path: "/dashboard/capacitacion/plantillas-certificados",
            icon: LayoutTemplate,
            requiredPermissions: ["scapacitacion:all:access"],
          },
          {
            label: "Plantillas de carnets",
            path: "/dashboard/capacitacion/plantillas-carnets",
            icon: CreditCard,
            requiredPermissions: ["scapacitacion:all:access"],
          },
        ],
      },
      {
        groupLabel: "Análisis",
        links: [
          {
            label: "Reportes",
            path: "/dashboard/capacitacion/reportes",
            icon: BarChart2,
            requiredPermissions: ["scapacitacion:all:access"],
          },
        ],
      },
    ],
  },
  {
    id: "drive",
    dbSlug: "sdrive",
    name: "Drive",
    description: "Almacenamiento y gestión de archivos",
    basePath: "/drive",
    upstreamUrl:
      process.env.NEXT_PUBLIC_DRIVE_URL ||
      "https://drive.shadevenezuela.com.ve",
    icon: Cloud,
    color: "text-cyan-400",
    badge: {
      bg: "bg-cyan-50",
      text: "text-cyan-700",
      border: "border-cyan-200",
      dot: "bg-cyan-400",
    },
    navLinks: [],
  },
  {
    id: "inventario",
    dbSlug: "sinventario",
    name: "Inventario",
    description: "Gestión de inventario y activos",
    basePath: "/inventario",
    upstreamUrl:
      process.env.NEXT_PUBLIC_INVENTARIO_URL ||
      "https://inventario.shadevenezuela.com.ve",
    icon: Package,
    color: "text-orange-500",
    badge: {
      bg: "bg-orange-50",
      text: "text-orange-800",
      border: "border-orange-200",
      dot: "bg-orange-500",
    },
    navLinks: [],
  },
];

export function getAppByPath(pathname: string): AppConfig | undefined {
  return apps.find((app) => pathname.startsWith(app.basePath));
}

export function getAppById(id: string): AppConfig | undefined {
  return apps.find((app) => app.id === id);
}

export function getAppByDbSlug(slug: string): AppConfig | undefined {
  return apps.find((app) => (app.dbSlug ?? app.id) === slug);
}
