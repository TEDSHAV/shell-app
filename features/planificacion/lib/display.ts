import type { PlanOrigen, PlanSalud } from "./types";

export const STATUS_COLORS: Record<
  PlanSalud,
  { bg: string; text: string; dot: string }
> = {
  Completado: { bg: "bg-blue-100", text: "text-blue-800", dot: "bg-blue-500" },
  "En Marcha": {
    bg: "bg-emerald-100",
    text: "text-emerald-800",
    dot: "bg-emerald-500",
  },
  "En Riesgo": {
    bg: "bg-orange-100",
    text: "text-orange-800",
    dot: "bg-orange-500",
  },
  Planificado: { bg: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-400" },
};

export type AppTone = {
  bar: string;
  soft: string;
  ring: string;
  border: string;
  glow: string;
};

export const APP_TONES: AppTone[] = [
  {
    bar: "bg-sky-500",
    soft: "bg-sky-50",
    ring: "ring-sky-200",
    border: "border-sky-200",
    glow: "shadow-sky-100",
  },
  {
    bar: "bg-violet-500",
    soft: "bg-violet-50",
    ring: "ring-violet-200",
    border: "border-violet-200",
    glow: "shadow-violet-100",
  },
  {
    bar: "bg-emerald-500",
    soft: "bg-emerald-50",
    ring: "ring-emerald-200",
    border: "border-emerald-200",
    glow: "shadow-emerald-100",
  },
  {
    bar: "bg-amber-500",
    soft: "bg-amber-50",
    ring: "ring-amber-200",
    border: "border-amber-200",
    glow: "shadow-amber-100",
  },
  {
    bar: "bg-rose-500",
    soft: "bg-rose-50",
    ring: "ring-rose-200",
    border: "border-rose-200",
    glow: "shadow-rose-100",
  },
  {
    bar: "bg-cyan-500",
    soft: "bg-cyan-50",
    ring: "ring-cyan-200",
    border: "border-cyan-200",
    glow: "shadow-cyan-100",
  },
  {
    bar: "bg-indigo-500",
    soft: "bg-indigo-50",
    ring: "ring-indigo-200",
    border: "border-indigo-200",
    glow: "shadow-indigo-100",
  },
  {
    bar: "bg-fuchsia-500",
    soft: "bg-fuchsia-50",
    ring: "ring-fuchsia-200",
    border: "border-fuchsia-200",
    glow: "shadow-fuchsia-100",
  },
];

export function app_tone(id: number): AppTone {
  return APP_TONES[Math.abs(id) % APP_TONES.length];
}

export const TED_ACCENT = {
  chip: "bg-violet-600 text-white",
  bar: "bg-violet-600",
  barHover: "hover:bg-violet-500",
  soft: "bg-violet-50",
  ring: "ring-violet-300",
  text: "text-violet-700",
};

export type ExpandedCardTone = {
  ring: string;
  wash: string;
};

const EXPANDED_CARD_TONES: ExpandedCardTone[] = [
  { ring: "ring-violet-300", wash: "bg-violet-50/80" },
  { ring: "ring-indigo-300", wash: "bg-indigo-50/80" },
  { ring: "ring-purple-300", wash: "bg-purple-50/80" },
  { ring: "ring-slate-300", wash: "bg-slate-50" },
  { ring: "ring-violet-400", wash: "bg-violet-50" },
];

export function expanded_card_tone(id: number): ExpandedCardTone {
  return EXPANDED_CARD_TONES[Math.abs(id) % EXPANDED_CARD_TONES.length];
}

export const EXPAND_MOTION = {
  card: "transition-[background-color,box-shadow,transform] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
  panel:
    "grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
  body: "origin-top transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
  chevron:
    "transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
};

export const ORIGIN_LABELS: Record<PlanOrigen, string> = {
  PLAN: "Plan inicial",
  TICKET: "Ticket",
  GERENCIA: "Gerencia",
  USUARIO: "Usuario",
  REQUERIMIENTO: "Requerimiento",
  ADICIONAL: "Adicional",
};

export const ORIGIN_COLORS: Record<PlanOrigen, string> = {
  PLAN: "bg-blue-600 text-white border-blue-700 shadow-sm",
  TICKET: "bg-violet-600 text-white border-violet-700 shadow-sm",
  GERENCIA: "bg-amber-500 text-white border-amber-600 shadow-sm",
  USUARIO: "bg-teal-600 text-white border-teal-700 shadow-sm",
  REQUERIMIENTO: "bg-emerald-600 text-white border-emerald-700 shadow-sm",
  ADICIONAL: "bg-red-600 text-white border-red-700 shadow-sm",
};

export const AVATAR_COLORS = [
  "bg-rose-400",
  "bg-sky-400",
  "bg-amber-400",
  "bg-emerald-400",
  "bg-violet-400",
  "bg-pink-400",
  "bg-teal-400",
  "bg-orange-400",
];

export function user_initials(nombre: string): string {
  const parts = nombre.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function format_objetivo_date(iso: string | null): string {
  if (!iso) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return iso;
  const month = Number(match[2]);
  const day = Number(match[3]);
  const months = [
    "Ene",
    "Feb",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul",
    "Ago",
    "Sep",
    "Oct",
    "Nov",
    "Dic",
  ];
  return `${months[month - 1] ?? match[2]} ${String(day).padStart(2, "0")}`;
}
