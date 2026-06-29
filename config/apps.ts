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
  Ticket,
  Wrench,
  Gauge,
  ArrowLeftRight,
  FileText,
  Boxes,
  Megaphone,
  Landmark,
} from "lucide-react";
import { build_app_config } from "@/lib/app-theme";
import { get_tickets_form_base_url } from "@/lib/tickets-form-url";
import { AppConfig, AppGroupConfig, NavGroup } from "@/types";

const requisicionesNavGroup: NavGroup = {
  groupLabel: "Requisiciones",
  links: [
    {
      label: "Mis Requisiciones",
      path: "/",
      href: "/requisiciones",
      icon: ListOrdered,
      requiredRoles: ["admin", "lider", "superadmin"],
    },
    {
      label: "Nueva Requisición",
      path: "/create",
      href: "/requisiciones/create",
      icon: FilePlus2,
      requiredRoles: ["admin", "lider", "superadmin"],
    },
  ],
};

const administracionNavGroup: NavGroup = {
  groupLabel: "Requisiciones",
  links: [
    {
      label: "Mis Requisiciones",
      path: "/",
      icon: ListOrdered,
      requiredRoles: ["admin", "lider", "superadmin"],
    },
    {
      label: "Nueva Requisición",
      path: "/create",
      icon: FilePlus2,
      requiredRoles: ["admin", "lider", "superadmin"],
    },
  ],
};

export const appGroups: AppGroupConfig[] = [
  {
    id: "utilidades",
    label: "Utilidades",
    icon: Boxes,
    brandColor: "#64748B",
    dashboardOrder: 8,
  },
];

/** Apps visibles en header/sidebar del home de Shell, en este orden. */
export const HOME_NAV_APP_IDS = ["reportes", "tickets"] as const;
export const HOME_NAV_GROUP_IDS = ["utilidades"] as const;

export const apps: AppConfig[] = [
  build_app_config({
    id: "negocios",
    dbSlug: "sgestion",
    name: "Negocios",
    description: "Gestión comercial y operativa",
    basePath: "/negocios",
    dashboardOrder: 1,
    upstreamUrl:
      process.env.NEXT_PUBLIC_NEGOCIOS_URL ||
      "https://gestion.shadevenezuela.com.ve",
    icon: Briefcase,
    brandColor: "#159714",
    embedMode: "shell",
    navLinks: [
      {
        groupLabel: "Directorio",
        links: [
          {
            label: "Empresas",
            path: "/directorio/empresas",
            icon: Building2,
            requiredPermissions: ["directorio:manage"],
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
            requiredPermissions: ["directorio:manage"],
          },
          {
            label: "Facilitadores",
            path: "/directorio/facilitadores",
            icon: UserCheck,
            requiredPermissions: ["directorio:manage"],
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
            excludeRoles: ["gestor_marketing"],
          },
          {
            label: "Leads",
            path: "/crm/leads",
            icon: Target,
            requiredPermissions: ["mkt:leads:write", "sales:leads:access"],
            excludeRoles: ["gestor_marketing"],
          },
          {
            label: "Contactos",
            path: "/pipeline/contactos",
            icon: Phone,
            requiredPermissions: [
              "mkt:contactos:read",
              "sales:clientes:access",
              "directorio:manage",
            ],
            excludeRoles: ["gestor_marketing"],
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
            label: "Presupuestos",
            path: "/pipeline/presupuestos",
            icon: Receipt,
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
      {
        groupLabel: "Reportes",
        links: [
          {
            label: "Indicador Presupuesto",
            path: "/reportes/presupuestos",
            icon: BarChart2,
            requiredRoles: ["admin", "superadmin"],
          },
          {
            label: "Administración de cierres",
            path: "/reportes/cierres",
            icon: Calendar,
            requiredRoles: ["admin", "superadmin"],
          },
          {
            label: "Manual",
            path: "/reportes/cierres/manual",
            icon: BookOpen,
            requiredRoles: ["admin", "superadmin"],
          },
          {
            label: "Mi avance",
            path: "/reportes/presupuestos/mi-avance",
            icon: Target,
            requiredRoles: ["gestor_clientes"],
            excludeRoles: ["admin", "superadmin"],
          },
        ],
      },
      requisicionesNavGroup,
    ],
  }),
  build_app_config({
    id: "reportes",
    dbSlug: "sgestion",
    name: "Reportes",
    description: "Indicadores y análisis de negocio",
    basePath: "/reportes",
    upstreamUrl:
      process.env.NEXT_PUBLIC_NEGOCIOS_URL ||
      "https://gestion.shadevenezuela.com.ve",
    icon: BarChart2,
    brandColor: "#B61031",
    embedMode: "shell",
    dashboardOrder: 6,
    navLinks: [
      {
        groupLabel: "Reportes",
        links: [
          {
            label: "Indicador Presupuesto",
            path: "/presupuestos",
            icon: BarChart2,
            requiredRoles: ["admin", "superadmin"],
          },
          {
            label: "Administración de cierres",
            path: "/cierres",
            icon: Calendar,
            requiredRoles: ["admin", "superadmin"],
          },
          {
            label: "Manual",
            path: "/cierres/manual",
            icon: BookOpen,
            requiredRoles: ["admin", "superadmin"],
          },
          {
            label: "Mi avance",
            path: "/presupuestos/mi-avance",
            icon: Target,
            requiredRoles: ["gestor_clientes"],
            excludeRoles: ["admin", "superadmin"],
          },
        ],
      },
    ],
  }),
  build_app_config({
    id: "marketing",
    dbSlug: "sgestion",
    name: "Marketing",
    description: "Gestión de leads y contactos comerciales",
    basePath: "/marketing",
    upstreamUrl:
      process.env.NEXT_PUBLIC_NEGOCIOS_URL ||
      "https://gestion.shadevenezuela.com.ve",
    icon: Megaphone,
    brandColor: "#EC4899",
    embedMode: "shell",
    requiredRoles: ["gestor_marketing"],
    dashboardOrder: 3,
    navLinks: [
      {
        groupLabel: "Marketing",
        links: [
          {
            label: "Inicio",
            path: "/",
            icon: LayoutDashboard,
            requiredPermissions: ["pipeline:access"],
          },
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
            requiredPermissions: ["mkt:contactos:read"],
          },
        ],
      },
      {
        groupLabel: "Directorio",
        links: [
          {
            label: "Servicios",
            path: "/directorio/servicios",
            icon: Package,
            requiredRoles: ["gestor_marketing"],
          },
        ],
      },
    ],
  }),
  build_app_config({
    id: "administracion",
    dbSlug: "sgestion",
    name: "Administración",
    description: "Procesos administrativos y requisiciones",
    basePath: "/requisiciones",
    icon: Landmark,
    brandColor: "#4F46E5",
    embedMode: "native",
    dashboardOrder: 5,
    navLinks: [administracionNavGroup],
  }),
  build_app_config({
    id: "capacitacion",
    dbSlug: "scapacitacion",
    name: "Capacitación",
    description: "Plataforma de formación y aprendizaje",
    basePath: "/capacitacion",
    dashboardOrder: 2,
    upstreamUrl:
      process.env.NEXT_PUBLIC_CAPACITACION_URL ||
      "https://capacitacion.shadevenezuela.com.ve",
    icon: GraduationCap,
    brandColor: "#C30DFF",
    embedMode: "shell",
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
            path: "/dashboard/capacitacion/configuracion/secuencias-control",
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
      requisicionesNavGroup,
    ],
  }),
  build_app_config({
    id: "drive",
    dbSlug: "sdrive",
    name: "Drive",
    description: "Almacenamiento y gestión de archivos",
    basePath: "/drive",
    upstreamUrl:
      process.env.NEXT_PUBLIC_DRIVE_URL ||
      "https://drive.shadevenezuela.com.ve",
    icon: Cloud,
    brandColor: "#19DEFF",
    embedMode: "shell",
    groupId: "utilidades",
    navLinks: [],
  }),
  build_app_config({
    id: "inventario",
    dbSlug: "sinventario",
    name: "Inventario",
    description: "Gestión de inventario y activos",
    basePath: "/inventario",
    upstreamUrl:
      process.env.NEXT_PUBLIC_INVENTARIO_URL ||
      "https://inventario.shadevenezuela.com.ve",
    icon: Package,
    brandColor: "#B61031",
    embedMode: "shell",
    groupId: "utilidades",
    navLinks: [],
  }),
  build_app_config({
    id: "servicios-tecnicos",
    dbSlug: "st",
    name: "Servicios Técnicos",
    description: "Gestión de servicios técnicos y control de equipos",
    basePath: "/servicios-tecnicos",
    upstreamUrl:
      process.env.NEXT_PUBLIC_SERVICIOS_URL ||
      "https://st.shadevenezuela.com.ve",
    icon: Wrench,
    brandColor: "#F5803E",
    embedMode: "shell",
    dashboardOrder: 4,
    navLinks: [
      { label: "Dashboard", path: "/", icon: LayoutDashboard },
      { label: "Control de Calibración", path: "/dashboard/control-calibracion", icon: Gauge },
      { label: "Entrada y Salida de Equipos", path: "/dashboard/entrada-salida-equipos", icon: ArrowLeftRight },
      { label: "Formulario de Novedades", path: "/dashboard/formulario-novedades", icon: FileText },
      requisicionesNavGroup,
    ],
  }),
  build_app_config({
    id: "tickets",
    name: "Tickets",
    description:
      "Sugerencias y soporte: cuéntanos qué mejorar o qué funciones agregar",
    basePath: "/tickets",
    upstreamUrl: get_tickets_form_base_url(),
    icon: Ticket,
    brandColor: "#0C3F69",
    embedMode: "raw",
    dashboardOrder: 7,
    navLinks: [],
  }),
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
