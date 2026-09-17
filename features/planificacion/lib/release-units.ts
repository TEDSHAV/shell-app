export const PLAN_RELEASE_UNITS = [
  { id: "core", label: "Prisma Negocios (core)" },
  { id: "facturacion", label: "Facturación" },
  { id: "reportes", label: "Reportes" },
  { id: "tareas", label: "Tareas" },
  { id: "comentarios", label: "Comentarios" },
  { id: "marketing", label: "Marketing" },
] as const;

export type PlanReleaseUnit = (typeof PLAN_RELEASE_UNITS)[number]["id"];
