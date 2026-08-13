export type TriggerKindId =
  | "sql_trigger"
  | "rpc"
  | "seed_only"
  | "cron"
  | "app_writer"
  | string;

export type TriggerKindMeta = {
  id: string;
  label: string;
  short_label: string;
  description: string;
  color: string;
  bg_class: string;
  text_class: string;
  border_class: string;
};

const TRIGGER_KINDS: Record<string, TriggerKindMeta> = {
  sql_trigger: {
    id: "sql_trigger",
    label: "Trigger SQL",
    short_label: "SQL",
    description:
      "Se dispara automáticamente en la base de datos cuando cambian filas (INSERT/UPDATE). No depende de que la app llame nada.",
    color: "#2563eb",
    bg_class: "bg-blue-500/10",
    text_class: "text-blue-700",
    border_class: "border-blue-500/30",
  },
  rpc: {
    id: "rpc",
    label: "RPC / función",
    short_label: "RPC",
    description:
      "La aplicación invoca una función al guardar o ejecutar una acción. El aviso sale en ese momento concreto.",
    color: "#7c3aed",
    bg_class: "bg-violet-500/10",
    text_class: "text-violet-700",
    border_class: "border-violet-500/30",
  },
  seed_only: {
    id: "seed_only",
    label: "Solo catálogo (seed)",
    short_label: "Seed",
    description:
      "Entrada de referencia en el catálogo. Hoy no tiene writer activo o quedó como legado documental.",
    color: "#64748b",
    bg_class: "bg-slate-500/10",
    text_class: "text-slate-600",
    border_class: "border-slate-500/30",
  },
  cron: {
    id: "cron",
    label: "Cron / programado",
    short_label: "Cron",
    description:
      "Un job programado revisa la cola y envía avisos en horarios definidos (p. ej. recordatorios).",
    color: "#d97706",
    bg_class: "bg-amber-500/10",
    text_class: "text-amber-700",
    border_class: "border-amber-500/30",
  },
  app_writer: {
    id: "app_writer",
    label: "Código de app",
    short_label: "App",
    description:
      "Shell u otra app crea la notificación directamente desde su código (server action o API).",
    color: "#0d9488",
    bg_class: "bg-teal-500/10",
    text_class: "text-teal-700",
    border_class: "border-teal-500/30",
  },
};

const FALLBACK_TRIGGER: TriggerKindMeta = {
  id: "unknown",
  label: "Otro",
  short_label: "?",
  description: "Tipo de disparo no clasificado en el catálogo.",
  color: "#94a3b8",
  bg_class: "bg-slate-500/10",
  text_class: "text-slate-600",
  border_class: "border-slate-500/30",
};

export function get_trigger_kind_meta(kind: string | null): TriggerKindMeta {
  if (!kind) return FALLBACK_TRIGGER;
  return TRIGGER_KINDS[kind] ?? { ...FALLBACK_TRIGGER, id: kind, label: kind };
}

export function trigger_kind_label(kind: string | null): string {
  return get_trigger_kind_meta(kind).label;
}

/** Leyenda para el catálogo: tipos de origen más frecuentes */
export const TRIGGER_KIND_LEGEND: TriggerKindMeta[] = [
  TRIGGER_KINDS.sql_trigger,
  TRIGGER_KINDS.rpc,
  TRIGGER_KINDS.seed_only,
  TRIGGER_KINDS.cron,
  TRIGGER_KINDS.app_writer,
];
