import type { PlanOrigen, PlanSalud } from "./types";

export const STATUS_COLORS: Record<
  PlanSalud,
  { bg: string; text: string; dot: string }
> = {
  Completado: { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" },
  "En Marcha": {
    bg: "bg-green-100",
    text: "text-green-700",
    dot: "bg-green-500",
  },
  "En Riesgo": {
    bg: "bg-orange-100",
    text: "text-orange-700",
    dot: "bg-orange-500",
  },
  Planificado: { bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" },
};

export const ORIGIN_COLORS: Record<PlanOrigen, string> = {
  PLAN: "bg-blue-50 text-blue-600 border-blue-200",
  TICKET: "bg-purple-50 text-purple-600 border-purple-200",
  GERENCIA: "bg-amber-50 text-amber-600 border-amber-200",
  USUARIO: "bg-teal-50 text-teal-600 border-teal-200",
  REQUERIMIENTO: "bg-rose-50 text-rose-600 border-rose-200",
  ADICIONAL: "bg-slate-50 text-slate-600 border-slate-200",
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
