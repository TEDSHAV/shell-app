import type { LucideIcon } from "lucide-react";
import {
  BookMarked,
  CircleDollarSign,
  ClipboardList,
  FileSpreadsheet,
  GitBranch,
  HelpCircle,
  History,
  Inbox,
  KeyRound,
  Layers3,
  LayoutGrid,
  ListChecks,
  Lock,
  Package,
  Shield,
  Target,
  Ticket,
  Users,
  Warehouse,
} from "lucide-react";

export type HelpTopic = {
  id: string;
  title: string;
  summary: string;
  href: string;
  icon: LucideIcon;
  accent?: "sky" | "emerald" | "amber" | "violet" | "rose";
};

export type HelpContext = {
  scopeLabel: string;
  scopeIcon?: LucideIcon;
  topics: HelpTopic[];
};

export const MANUAL_HUB_HREF = "/manual";
export const MANUAL_PLANIFICACION = "/ted/planificacion/manual";
export const MANUAL_OBJETIVOS = "/ted/planificacion/objetivos/manual";
export const MANUAL_TICKETS = "/ted/planificacion/tickets/manual";
export const MANUAL_ACCESOS = "/ted/usuarios/accesos/manual";
export const MANUAL_REQUISICIONES = "/requisiciones/manual";
export const MANUAL_INVENTARIO = "/requisiciones/depositos/manual";

export const HELP_REGISTRY: {
  match: (pathname: string) => boolean;
  context: HelpContext;
}[] = [
  {
    // Antes que /requisiciones genérico: el Hub muestra ayuda de inventario.
    match: (p) => p.startsWith("/requisiciones/depositos"),
    context: {
      scopeLabel: "Inventario",
      scopeIcon: Warehouse,
      topics: [
        {
          id: "almacenes",
          title: "Los tres almacenes",
          summary: "Departamentos, Serv. capacitación y Serv. técnico.",
          href: `${MANUAL_INVENTARIO}#manual-almacenes`,
          icon: Layers3,
          accent: "amber",
        },
        {
          id: "articulos",
          title: "Artículos y estados",
          summary: "En stock, bajo o agotado — qué significa cada uno.",
          href: `${MANUAL_INVENTARIO}#manual-articulos`,
          icon: Package,
          accent: "sky",
        },
        {
          id: "consumo",
          title: "Registrar consumo",
          summary: "Bajá con − y confirmá con Actualizar stock.",
          href: `${MANUAL_INVENTARIO}#manual-consumo`,
          icon: ListChecks,
          accent: "rose",
        },
        {
          id: "pedido",
          title: "Pedido y análisis",
          summary: "Cómo se ve el stock al armar una requisición.",
          href: `${MANUAL_INVENTARIO}#manual-pedido`,
          icon: ClipboardList,
          accent: "emerald",
        },
        {
          id: "historial",
          title: "Historial",
          summary: "Quién movió el stock y cuándo.",
          href: `${MANUAL_INVENTARIO}#manual-historial`,
          icon: History,
          accent: "violet",
        },
        {
          id: "minimos-excel",
          title: "Mínimos y Excel",
          summary: "Avisos de stock bajo y carga masiva (si tenés acceso).",
          href: `${MANUAL_INVENTARIO}#manual-minimos-excel`,
          icon: FileSpreadsheet,
          accent: "amber",
        },
      ],
    },
  },
  {
    match: (p) => p.startsWith("/requisiciones"),
    context: {
      scopeLabel: "Requisiciones",
      scopeIcon: ClipboardList,
      topics: [
        {
          id: "interna",
          title: "Interna",
          summary: "Materiales del departamento y quién aprueba.",
          href: `${MANUAL_REQUISICIONES}#manual-interna`,
          icon: Layers3,
          accent: "sky",
        },
        {
          id: "externa",
          title: "Curso / servicio",
          summary: "Pedido ligado a una OSI; las preguntas al crear.",
          href: `${MANUAL_REQUISICIONES}#manual-externa`,
          icon: Inbox,
          accent: "emerald",
        },
        {
          id: "inventario-req",
          title: "Reponer inventario",
          summary: "Stock al armar el pedido y enlace al manual de almacén.",
          href: `${MANUAL_REQUISICIONES}#manual-inventario-req`,
          icon: Package,
          accent: "amber",
        },
        {
          id: "analisis-costos",
          title: "Análisis de costos",
          summary: "Estado del costo, cuatro gradas, justificar y aprobar.",
          href: `${MANUAL_REQUISICIONES}#manual-analisis-costos`,
          icon: CircleDollarSign,
          accent: "amber",
        },
        {
          id: "costo-operador",
          title: "Estado del costo",
          summary: "Lo que pedís frente a la jornada de la OSI.",
          href: `${MANUAL_REQUISICIONES}#manual-costo-operador`,
          icon: HelpCircle,
          accent: "amber",
        },
        {
          id: "costo-niveles",
          title: "Los cuatro estados",
          summary: "Base, Moderado, Riesgoso y sujeta a aprobación.",
          href: `${MANUAL_REQUISICIONES}#manual-costo-niveles`,
          icon: ListChecks,
          accent: "sky",
        },
        {
          id: "costo-cuando",
          title: "Cuándo justificar",
          summary: "Cuándo explicar y cuándo se espera un sello.",
          href: `${MANUAL_REQUISICIONES}#manual-costo-cuando`,
          icon: CircleDollarSign,
          accent: "amber",
        },
        {
          id: "costo-finanzas",
          title: "Análisis OSI + ECC",
          summary: "Techos del pool y lectura conjunta (si tenés acceso).",
          href: `${MANUAL_REQUISICIONES}#manual-costo-finanzas`,
          icon: FileSpreadsheet,
          accent: "rose",
        },
        {
          id: "mapa-interna",
          title: "Quién aprueba",
          summary: "Coordinador y líder (dentro de requisición interna).",
          href: `${MANUAL_REQUISICIONES}#manual-mapa-interna`,
          icon: Users,
          accent: "violet",
        },
        {
          id: "mapa-externa",
          title: "Quién tramita",
          summary: "Quién gestiona la compra en Administración.",
          href: `${MANUAL_REQUISICIONES}#manual-mapa-externa`,
          icon: ClipboardList,
          accent: "emerald",
        },
      ],
    },
  },
  {
    match: (p) => p.startsWith("/ted/usuarios/accesos"),
    context: {
      scopeLabel: "Accesos y roles",
      scopeIcon: Shield,
      topics: [
        {
          id: "rbac",
          title: "Un rol por app",
          summary: "La persona recibe una función; los permisos cuelgan del rol.",
          href: `${MANUAL_ACCESOS}#manual-rbac`,
          icon: Users,
          accent: "violet",
        },
        {
          id: "slugs",
          title: "Cómo se nombran",
          summary: "Módulo:acción, o módulo:recurso:acción si hay que acotar.",
          href: `${MANUAL_ACCESOS}#manual-slugs`,
          icon: KeyRound,
          accent: "sky",
        },
        {
          id: "niveles",
          title: "Recurso opcional",
          summary: "Módulo chico sin recurso; módulo grande con recurso concreto.",
          href: `${MANUAL_ACCESOS}#manual-niveles`,
          icon: Layers3,
          accent: "violet",
        },
        {
          id: "consola",
          title: "Usar la consola",
          summary: "Personas, fichas de rol, stepper y asignar función.",
          href: `${MANUAL_ACCESOS}#manual-consola`,
          icon: LayoutGrid,
          accent: "emerald",
        },
        {
          id: "limites",
          title: "Qué no hace",
          summary: "No crea el menú Shell ni dos roles en la misma app.",
          href: `${MANUAL_ACCESOS}#manual-limites`,
          icon: Lock,
          accent: "amber",
        },
      ],
    },
  },
  {
    match: (p) =>
      p.startsWith("/ted/planificacion/objetivos") ||
      p.startsWith("/ted/planificacion/cubrir") ||
      p.startsWith("/ted/planificacion/informe"),
    context: {
      scopeLabel: "Objetivos",
      scopeIcon: Target,
      topics: [
        {
          id: "dos-pisos",
          title: "Dos pisos",
          summary: "Gerencia plantea el periodo; TED cubre con tareas.",
          href: `${MANUAL_OBJETIVOS}#manual-dos-pisos`,
          icon: Layers3,
          accent: "violet",
        },
        {
          id: "cubrir",
          title: "Cubrir",
          summary: "Vincular o crear tareas sobre cada objetivo del mes.",
          href: `${MANUAL_OBJETIVOS}#manual-cubrir`,
          icon: GitBranch,
          accent: "sky",
        },
        {
          id: "compromiso-plus",
          title: "Compromiso y Plus",
          summary: "El informe separa lo comprometido de lo extra hecho.",
          href: `${MANUAL_OBJETIVOS}#manual-compromiso-plus`,
          icon: Target,
          accent: "emerald",
        },
      ],
    },
  },
  {
    match: (p) => p.startsWith("/ted/planificacion/tareas"),
    context: {
      scopeLabel: "Tareas",
      scopeIcon: ClipboardList,
      topics: [
        {
          id: "kanban-mapa",
          title: "Kanban y mapa",
          summary: "Misma lista: tablero por estado o árbol por app.",
          href: `${MANUAL_PLANIFICACION}#manual-mapa-kanban`,
          icon: LayoutGrid,
          accent: "sky",
        },
        {
          id: "avance",
          title: "Avance",
          summary: "El porcentaje vive en la tarea; el objetivo lo promedia.",
          href: `${MANUAL_PLANIFICACION}#manual-avance`,
          icon: ClipboardList,
          accent: "amber",
        },
      ],
    },
  },
  {
    match: (p) =>
      p.startsWith("/ted/planificacion/tickets") || p.startsWith("/tickets"),
    context: {
      scopeLabel: "Tickets",
      scopeIcon: Ticket,
      topics: [
        {
          id: "inbox",
          title: "Inbox TED",
          summary: "Cola interna distinta del formulario que ve el usuario.",
          href: `${MANUAL_TICKETS}#manual-inbox`,
          icon: Inbox,
          accent: "amber",
        },
        {
          id: "promover",
          title: "Promover a tarea",
          summary: "El ticket pasa al plan con origen TICKET.",
          href: `${MANUAL_TICKETS}#manual-promover`,
          icon: GitBranch,
          accent: "sky",
        },
        {
          id: "origen-ticket",
          title: "Origen TICKET",
          summary: "No es GERENCIA: es trabajo que nació en soporte.",
          href: `${MANUAL_TICKETS}#manual-origen-ticket`,
          icon: Ticket,
          accent: "violet",
        },
      ],
    },
  },
  {
    match: (p) =>
      p === "/ted/planificacion" ||
      p.startsWith("/ted/planificacion/importar") ||
      p.startsWith("/ted/planificacion/manual"),
    context: {
      scopeLabel: "Planificación",
      scopeIcon: BookMarked,
      topics: [
        {
          id: "arbol",
          title: "Árbol apps y módulos",
          summary: "Cada tarea cuelga de un módulo de una aplicación Prisma.",
          href: `${MANUAL_PLANIFICACION}#manual-mapa-kanban`,
          icon: Layers3,
          accent: "sky",
        },
        {
          id: "plan-inicial",
          title: "Plan inicial vs extra",
          summary: "PLAN queda congelado; lo nuevo entra por otros orígenes.",
          href: `${MANUAL_PLANIFICACION}#manual-plan-inicial`,
          icon: Lock,
          accent: "amber",
        },
        {
          id: "excel",
          title: "Excel",
          summary: "Importar y exportar desde Más, sin crear origen GERENCIA.",
          href: `${MANUAL_PLANIFICACION}#manual-excel`,
          icon: FileSpreadsheet,
          accent: "emerald",
        },
      ],
    },
  },
];

export function resolveHelpContext(pathname: string): HelpContext | null {
  const normalized = pathname.split("?")[0] ?? pathname;
  const entry = HELP_REGISTRY.find((r) => r.match(normalized));
  return entry?.context ?? null;
}

export function resolveFullManualHref(pathname: string): string {
  const normalized = pathname.split("?")[0] ?? pathname;
  if (normalized.startsWith("/requisiciones/depositos")) {
    return MANUAL_INVENTARIO;
  }
  if (normalized.startsWith("/requisiciones")) {
    return MANUAL_REQUISICIONES;
  }
  if (normalized.startsWith("/ted/usuarios/accesos")) {
    return MANUAL_ACCESOS;
  }
  if (
    normalized.startsWith("/ted/planificacion/objetivos") ||
    normalized.startsWith("/ted/planificacion/cubrir") ||
    normalized.startsWith("/ted/planificacion/informe")
  ) {
    return MANUAL_OBJETIVOS;
  }
  if (
    normalized.startsWith("/ted/planificacion/tickets") ||
    normalized.startsWith("/tickets")
  ) {
    return MANUAL_TICKETS;
  }
  if (normalized.startsWith("/ted/planificacion")) {
    return MANUAL_PLANIFICACION;
  }
  return MANUAL_HUB_HREF;
}

export const HELP_TOPIC_ACCENTS: Record<
  NonNullable<HelpTopic["accent"]>,
  { icon: string; border: string; bg: string }
> = {
  sky: {
    icon: "bg-sky-100 text-sky-700",
    border: "hover:border-sky-300/60",
    bg: "hover:bg-sky-50/50",
  },
  emerald: {
    icon: "bg-emerald-100 text-emerald-700",
    border: "hover:border-emerald-300/60",
    bg: "hover:bg-emerald-50/50",
  },
  amber: {
    icon: "bg-amber-100 text-amber-700",
    border: "hover:border-amber-300/60",
    bg: "hover:bg-amber-50/50",
  },
  violet: {
    icon: "bg-violet-100 text-violet-700",
    border: "hover:border-violet-300/60",
    bg: "hover:bg-violet-50/50",
  },
  rose: {
    icon: "bg-rose-100 text-rose-700",
    border: "hover:border-rose-300/60",
    bg: "hover:bg-rose-50/50",
  },
};
