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
  KeyRound,
  SquareCheckBig,
  MessageSquare,
  Shield,
  Code2,
  Layers,
  Bell,
  UserPlus,
  FileStack,
  LayoutGrid,
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
    },
    {
      label: "Nueva Requisición",
      path: "/create",
      href: "/requisiciones/create",
      icon: FilePlus2,
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
    },
    {
      label: "Nueva Requisición",
      path: "/create",
      icon: FilePlus2,
    },
  ],
};

export const appGroups: AppGroupConfig[] = [
  {
    id: "procesos-estrategicos",
    label: "PROCESOS ESTRATÉGICOS",
    description: "Definen el rumbo, la política y el control de la organización.",
    icon: Target,
    brandColor: "#1e3a5f",
    dashboardOrder: 1,
  },
  {
    id: "procesos-medulares",
    label: "PROCESOS MEDULARES",
    description: "Generan valor directo para el cliente a través del servicio.",
    icon: Briefcase,
    brandColor: "#c8102e",
    dashboardOrder: 2,
  },
  {
    id: "procesos-de-apoyo",
    label: "PROCESOS DE APOYO",
    description: "Proveen los recursos y soporte que sostienen la operación.",
    icon: Users,
    brandColor: "#1e3a5f",
    dashboardOrder: 3,
  },
  {
    id: "utilidades",
    label: "Utilidades",
    icon: Boxes,
    brandColor: "#64748B",
    dashboardOrder: 8,
  },
];

/** Apps visibles en header/sidebar del home de Shell, en este orden. */
export const HOME_NAV_APP_IDS = ["reportes", "tickets", "osis"] as const;
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
    groupId: "procesos-medulares",
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
        groupLabel: "Actividad",
        links: [
          {
            label: "Tareas",
            path: "/tareas",
            href: "/tareas",
            icon: SquareCheckBig,
          },
          {
            label: "Comentarios",
            path: "/comentarios",
            href: "/comentarios",
            icon: MessageSquare,
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
        groupLabel: "Gestión clientes",
        links: [
          {
            label: "Credenciales de clientes",
            path: "/credenciales-clientes",
            href: "/credenciales-clientes",
            icon: KeyRound,
            requiredPermissions: ["clientes:cuentas:manage"],
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
        groupLabel: "Configuración",
        links: [
          {
            label: "Configuración OSI",
            path: "/ingenieria/osi-visibilidad-costos",
            icon: FileCheck,
            requiredRoles: ["admin", "superadmin"],
          },
          {
            label: "Configuración Presupuestos",
            path: "/ingenieria/configuracion-presupuestos",
            icon: Receipt,
            requiredPermissions: ["finance:presupuestos:config"],
          },
          {
            label: "Catálogo de costos",
            path: "/ingenieria/catalogo-costos",
            icon: BookOpen,
            requiredPermissions: ["finance:catalogo:access"],
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
            requiredPermissions: ["reportes:access:presupuestos"],
          },
          {
            label: "Administración de cierres",
            path: "/reportes/cierres",
            icon: Calendar,
            requiredPermissions: ["reportes:cierres:manage"],
          },
          {
            label: "Manual",
            path: "/reportes/cierres/manual",
            icon: BookOpen,
            requiredPermissions: ["reportes:access:presupuestos"],
          },
          {
            label: "Mi avance",
            path: "/reportes/presupuestos/mi-avance",
            icon: Target,
            requiredRoles: ["gestor_clientes"],
            excludeRoles: ["admin", "superadmin"],
          },
          {
            label: "Mi avance",
            path: "/reportes/presupuestos/mi-avance",
            icon: Target,
            requiredPermissions: ["reportes:mi-avance:admin-access"],
            requiredRoles: ["admin", "superadmin"],
          },
        ],
      },
      ...[requisicionesNavGroup],
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
    hiddenFromDashboard: true,
    dashboardOrder: 6,
    navLinks: [
      {
        groupLabel: "FINANZAS",
        department: "negocios",
        links: [
          {
            label: "Presupuestos",
            path: "/presupuestos",
            icon: BarChart2,
            requiredPermissions: ["reportes:access:presupuestos"],
          },
          {
            label: "Mi avance",
            path: "/presupuestos/mi-avance",
            icon: Target,
            requiredRoles: ["gestor_clientes"],
            excludeRoles: ["admin", "superadmin"],
          },
          {
            label: "Mi avance",
            path: "/presupuestos/mi-avance",
            icon: Target,
            requiredPermissions: ["reportes:mi-avance:admin-access"],
            requiredRoles: ["admin", "superadmin"],
          },
        ],
      },
      {
        groupLabel: "CRM",
        department: "negocios",
        links: [
          {
            label: "Leads",
            path: "/crm-ejecutivos",
            icon: Users,
            requiredPermissions: ["reportes:access:leads"],
          },
          {
            label: "Mi avance Leads",
            path: "/crm-ejecutivos/mi-avance",
            icon: Target,
            requiredRoles: ["gestor_clientes"],
            excludeRoles: ["admin", "superadmin"],
          },
          {
            label: "Mi avance Leads",
            path: "/crm-ejecutivos/mi-avance",
            icon: Target,
            requiredPermissions: ["reportes:mi-avance:admin-access"],
            requiredRoles: ["admin", "superadmin"],
          },
        ],
      },
      {
        groupLabel: "Configuración",
        department: "negocios",
        links: [
          {
            label: "Administración de cierres",
            path: "/cierres",
            icon: Calendar,
            requiredPermissions: ["reportes:cierres:manage"],
          },
          {
            label: "Manual",
            path: "/cierres/manual",
            icon: BookOpen,
            requiredPermissions: ["reportes:access:presupuestos"],
          },
        ],
      },
      {
        groupLabel: "Indicador",
        department: "marketing",
        links: [
          {
            label: "Leads",
            path: "/marketing",
            icon: Target,
            requiredPermissions: ["reportes:access:leads"],
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
    groupId: "procesos-de-apoyo",
    dashboardOrder: 2,
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
        groupLabel: "Reporte",
        links: [
          {
            label: "Leads",
            path: "/reportes/marketing",
            icon: BarChart2,
            requiredPermissions: ["reportes:access:leads"],
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
    groupId: "procesos-de-apoyo",
    dashboardOrder: 1,
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
    groupId: "procesos-medulares",
    navLinks: [
      {
        label: "Dashboard",
        path: "/",
        icon: LayoutDashboard,
        requiredPermissions: ["scapacitacion:all:access"],
      },
      {
        label: "Consulta de OSIs",
        path: "/consulta-osi",
        href: "/consulta-osi",
        icon: Search,
      },
      {
        groupLabel: "Planificación y Ejecución",
        icon: Calendar,
        links: [
          {
            label: "Seguimiento de Servicios",
            path: "/dashboard/capacitacion/seguimiento-servicios",
            icon: Calendar,
            requiredPermissions: ["scapacitacion:all:access"],
          },
          {
            label: "Gestión OSIs",
            path: "/dashboard/capacitacion/gestion-osi",
            icon: ClipboardList,
            requiredPermissions: ["scapacitacion:all:access"],
          },
        ],
      },
      {
        groupLabel: "Requisiciones",
        icon: ClipboardList,
        links: [
          {
            label: "Mis Requisiciones",
            path: "/dashboard/capacitacion/requisiciones",
            icon: ClipboardList,
            requiredPermissions: ["scapacitacion:all:access"],
          },
          {
            label: "Nueva Requisición",
            path: "/dashboard/capacitacion/requisiciones/create",
            icon: FilePlus2,
            requiredPermissions: ["scapacitacion:all:access"],
          },
        ],
      },
      {
        groupLabel: "Reportes",
        icon: BarChart2,
        links: [
          {
            label: "KPI",
            path: "/dashboard/capacitacion/reportes",
            icon: BarChart2,
            requiredPermissions: ["scapacitacion:all:access"],
          },
          {
            label: "Indicadores",
            path: "/dashboard/capacitacion/indicadores",
            icon: Gauge,
            requiredPermissions: ["scapacitacion:all:access"],
          },
        ],
      },
      {
        groupLabel: "Certificados",
        icon: Award,
        links: [
          {
            label: "Generación",
            path: "/dashboard/capacitacion/generacion-certificado",
            icon: Award,
            requiredPermissions: ["scapacitacion:all:access"],
          },
          {
            label: "Gestión",
            path: "/dashboard/capacitacion/gestion-certificados",
            icon: FileStack,
            requiredPermissions: ["scapacitacion:all:access"],
          },
        ],
      },
      {
        groupLabel: "Cursos",
        icon: BookOpen,
        links: [
          {
            label: "Gestión",
            path: "/dashboard/capacitacion/gestion-cursos",
            icon: BookOpen,
            requiredPermissions: ["scapacitacion:all:access"],
          },
          {
            label: "Plantillas",
            path: "/dashboard/capacitacion/gestion-plantillas-cursos",
            icon: LayoutGrid,
            requiredPermissions: ["scapacitacion:all:access"],
          },
        ],
      },
      {
        groupLabel: "Facilitadores",
        icon: Users,
        links: [
          {
            label: "Gestión",
            path: "/dashboard/capacitacion/gestion-de-facilitadores",
            icon: Users,
            requiredPermissions: ["scapacitacion:all:access"],
          },
          {
            label: "Firmas",
            path: "/dashboard/capacitacion/gestion-de-firmas",
            icon: PenLine,
            requiredPermissions: ["scapacitacion:all:access"],
          },
          {
            label: "Asignaciones y Credenciales",
            path: "/dashboard/capacitacion/gestion-asignaciones",
            icon: KeyRound,
            requiredPermissions: ["scapacitacion:all:access"],
          },
        ],
      },
    ],
  }),
  build_app_config({
    id: "tareas",
    dbSlug: "sgestion",
    name: "Tareas",
    description: "Gestión de tareas personales y de equipo",
    basePath: "/tareas",
    upstreamUrl:
      process.env.NEXT_PUBLIC_NEGOCIOS_URL ||
      "https://gestion.shadevenezuela.com.ve",
    icon: SquareCheckBig,
    brandColor: "#088BE3",
    embedMode: "shell",
    hiddenFromDashboard: true,
    groupId: "utilidades",
    dashboardOrder: 7,
    navLinks: [],
  }),
  build_app_config({
    id: "comentarios",
    dbSlug: "sgestion",
    name: "Comentarios",
    description: "Notas personales y comentarios de equipo",
    basePath: "/comentarios",
    upstreamUrl:
      process.env.NEXT_PUBLIC_NEGOCIOS_URL ||
      "https://negocios.shadevenezuela.com.ve",
    icon: MessageSquare,
    brandColor: "#14B8A6",
    embedMode: "shell",
    hiddenFromDashboard: true,
    groupId: "utilidades",
    dashboardOrder: 8,
    navLinks: [],
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
    hiddenFromDashboard: true,
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
    hiddenFromDashboard: true,
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
    groupId: "procesos-medulares",
    dashboardOrder: 3,
    navLinks: [
      { label: "Dashboard", path: "/", icon: LayoutDashboard },
      { label: "Control de Calibración", path: "/dashboard/control-calibracion", icon: Gauge },
      { label: "Entrada y Salida de Equipos", path: "/dashboard/entrada-salida-equipos", icon: ArrowLeftRight },
      { label: "Formulario de Novedades", path: "/dashboard/formulario-novedades", icon: FileText },
      {
        label: "Nuevos Servicios",
        path: "/nuevo-servicio",
        href: "/nuevo-servicio",
        icon: ClipboardList,
      },
      ...[requisicionesNavGroup],
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
    hiddenFromDashboard: true,
    dashboardOrder: 7,
    navLinks: [],
  }),
  build_app_config({
    id: "osis",
    name: "OSIs",
    description: "Consulta y seguimiento de órdenes de servicio internas",
    basePath: "/consulta-osi",
    icon: FileCheck,
    brandColor: "#0EA5E9",
    embedMode: "native",
    hiddenFromDashboard: true,
    dashboardOrder: 7.5,
    navLinks: [],
  }),
  build_app_config({
    id: "credenciales-clientes",
    name: "Credenciales de Clientes",
    description: "Gestión de credenciales del portal de clientes",
    basePath: "/credenciales-clientes",
    icon: KeyRound,
    brandColor: "#0891B2",
    embedMode: "native",
    hiddenFromDashboard: true,
    navLinks: [],
  }),
  build_app_config({
    id: "directorio",
    name: "Directorio",
    description: "Directorio de usuarios: nombres, teléfonos y emails",
    basePath: "/directorio",
    icon: Users,
    brandColor: "#2563EB",
    embedMode: "native",
    hiddenFromDashboard: true,
    groupId: "utilidades",
    dashboardOrder: 8,
    navLinks: [],
  }),
  // Placeholders: módulos visibles en dashboard para completar el mapa de procesos
  build_app_config({
    id: "sistema-integrado-gestion",
    name: "Sistema Integrado de Gestión",
    description: "Políticas, manuales y control de procesos corporativos",
    basePath: "#",
    icon: Landmark,
    brandColor: "#1e3a5f",
    embedMode: "native",
    groupId: "procesos-estrategicos",
    dashboardOrder: 1,
    navLinks: [],
  }),
  build_app_config({
    id: "direccion",
    name: "Dirección",
    description: "Objetivos estratégicos y seguimiento de dirección",
    basePath: "#",
    icon: Target,
    brandColor: "#1e3a5f",
    embedMode: "native",
    groupId: "procesos-estrategicos",
    dashboardOrder: 2,
    navLinks: [],
  }),
  build_app_config({
    id: "recursos-humanos",
    name: "Recursos Humanos",
    description: "Gestión de talento, asistencia y colaboradores",
    basePath: "#",
    icon: Users,
    brandColor: "#f97316",
    embedMode: "native",
    groupId: "procesos-de-apoyo",
    dashboardOrder: 3,
    navLinks: [],
  }),
  build_app_config({
    id: "gestion-ambiental",
    name: "Gestión Ambiental",
    description: "Control ambiental y sostenibilidad operativa",
    basePath: "#",
    icon: Cloud,
    brandColor: "#22c55e",
    embedMode: "native",
    groupId: "procesos-de-apoyo",
    dashboardOrder: 4,
    navLinks: [],
  }),
  build_app_config({
    id: "sst",
    name: "SST",
    description: "Seguridad y salud en el trabajo",
    basePath: "#",
    icon: Shield,
    brandColor: "#ef4444",
    embedMode: "native",
    groupId: "procesos-de-apoyo",
    dashboardOrder: 5,
    navLinks: [],
  }),
  build_app_config({
    id: "ted",
    name: "TED",
    description: "Tecnología, equipos y desarrollo",
    basePath: "/ted",
    icon: Code2,
    brandColor: "#7c3aed",
    embedMode: "native",
    groupId: "procesos-de-apoyo",
    dashboardOrder: 6,
    navLinks: [
      {
        groupLabel: "Usuarios",
        links: [
          {
            label: "Manejo de usuarios",
            path: "/usuarios",
            icon: UserPlus,
          },
        ],
      },
      {
        groupLabel: "Notificaciones",
        links: [
          {
            label: "Catálogo de notificaciones",
            path: "/notificaciones",
            icon: Bell,
          },
          {
            label: "Por usuario",
            path: "/notificaciones/usuarios",
            icon: Users,
          },
        ],
      },
    ],
  }),
];

export function getAppByPath(pathname: string): AppConfig | undefined {
  return apps.find((app) => pathname.startsWith(app.basePath));
}

export function getAppById(id: string): AppConfig | undefined {
  return apps.find((app) => app.id === id);
}

export function getAppByDbSlug(slug: string): AppConfig | undefined {
  return apps.find((app) => (app.dbSlug ?? app.id) === slug || app.id === slug);
}
