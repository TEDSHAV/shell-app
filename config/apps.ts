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
} from "lucide-react";
import { build_app_config } from "@/lib/app-theme";
import { get_tickets_form_base_url } from "@/lib/tickets-form-url";
import { AppConfig } from "@/types";

export const apps: AppConfig[] = [
  build_app_config({
    id: "negocios",
    dbSlug: "sgestion",
    name: "Negocios",
    description: "Gestión comercial y operativa",
    basePath: "/negocios",
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
    ],
  }),
  build_app_config({
    id: "capacitacion",
    dbSlug: "scapacitacion",
    name: "Capacitación",
    description: "Plataforma de formación y aprendizaje",
    basePath: "/capacitacion",
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
    navLinks: [],
  }),
  build_app_config({
    id: "requisiciones",
    name: "Requisiciones",
    description: "Crear y gestionar solicitudes de requisición para todos los departamentos",
    basePath: "/requisiciones",
    icon: ClipboardList,
    brandColor: "#3b82f6",
    embedMode: "shell",
    navLinks: [
      { label: "Mis Requisiciones", path: "/", icon: ListOrdered },
      { label: "Nueva Requisición", path: "/create", icon: FilePlus2 },
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
    brandColor: "#6B7280",
    embedMode: "raw",
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
