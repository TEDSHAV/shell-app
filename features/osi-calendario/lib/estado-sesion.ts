import { minutos } from "./mes-grid";
import type { EstadoSesion, SesionCalendario } from "./types";

export const ESTATUS_EJECUTADO = 12;
export const ESTATUS_NO_EJECUTADO = 39;
export const ESTATUS_REAGENDADO = 46;

/**
 * Estado de una sesión. Manda la fecha ejecutada; luego el último estatus del historial;
 * "no ejecutada" (no_se_dio: marcada, sin decidir aún) gana sobre lo demás; una reagenda sin fecha queda "sin_fecha";
 * lo que ya pasó sin registrar, "por_registrar".
 */
export function estado_sesion(s: Pick<SesionCalendario,
  "fecha_ejecutada" | "id_estatus_sesion" | "fecha_reagendada" | "reagenda_count" | "fecha_efectiva"> & { no_se_dio?: boolean },
  hoy: string,
): EstadoSesion {
  if (s.fecha_ejecutada || s.id_estatus_sesion === ESTATUS_EJECUTADO) return "ejecutada";
  if (s.id_estatus_sesion === ESTATUS_NO_EJECUTADO) return "cancelada";
  if (s.no_se_dio) return "no_se_dio";
  if (s.id_estatus_sesion === ESTATUS_REAGENDADO || s.reagenda_count > 0) {
    if (!s.fecha_reagendada) return "sin_fecha";
    return s.fecha_reagendada < hoy ? "por_registrar" : "reagendada";
  }
  return s.fecha_efectiva < hoy ? "por_registrar" : "programada";
}

/** Orden de la leyenda. `sin_fecha` se cuenta junto con `reagendada`. */
export const ESTADOS_LEYENDA: EstadoSesion[] = ["programada", "por_registrar", "no_se_dio", "reagendada", "ejecutada", "cancelada"];

type EstadoUi = {
  etiqueta: string;
  descripcion: string;
  /** Fondo suave de etiquetas y tarjetas. */
  suave: string;
  /** Borde izquierdo de acento. */
  barra: string;
  punto: string;
  texto: string;
  /** Pastilla de estado. */
  pill: string;
};

export const ESTADO_UI: Record<EstadoSesion, EstadoUi> = {
  programada: {
    etiqueta: "Planificada",
    descripcion: "Está planificada y la fecha todavía no llega.",
    suave: "bg-sky-50 hover:bg-sky-100/70",
    barra: "border-sky-500",
    punto: "bg-sky-500",
    texto: "text-sky-800",
    pill: "bg-sky-100 text-sky-800",
  },
  por_registrar: {
    etiqueta: "Sin estatus",
    descripcion: "La fecha ya pasó y nadie ha registrado si se ejecutó.",
    suave: "bg-slate-100 hover:bg-slate-200/70",
    barra: "border-slate-400",
    punto: "bg-slate-400",
    texto: "text-slate-700",
    pill: "bg-slate-200 text-slate-700",
  },
  no_se_dio: {
    etiqueta: "No ejecutada",
    descripcion: "No se dictó en su fecha. Falta decidir si se reagenda o se suspende.",
    suave: "bg-amber-50 hover:bg-amber-100/70",
    barra: "border-amber-500",
    punto: "bg-amber-500",
    texto: "text-amber-900",
    pill: "bg-amber-100 text-amber-900",
  },
  reagendada: {
    etiqueta: "Reagendada",
    descripcion: "No se dio en su fecha y se dará más adelante.",
    suave: "bg-violet-50 hover:bg-violet-100/70",
    barra: "border-violet-500",
    punto: "bg-violet-500",
    texto: "text-violet-800",
    pill: "bg-violet-100 text-violet-800",
  },
  sin_fecha: {
    etiqueta: "Reagendada · sin fecha",
    descripcion: "No se dio y todavía no tiene fecha nueva.",
    suave: "bg-violet-50 hover:bg-violet-100/70",
    barra: "border-violet-300 border-dashed",
    punto: "bg-violet-300",
    texto: "text-violet-800",
    pill: "bg-violet-100 text-violet-800",
  },
  ejecutada: {
    etiqueta: "Ejecutada",
    descripcion: "Se dictó.",
    suave: "bg-emerald-50 hover:bg-emerald-100/70",
    barra: "border-emerald-500",
    punto: "bg-emerald-500",
    texto: "text-emerald-800",
    pill: "bg-emerald-100 text-emerald-800",
  },
  cancelada: {
    etiqueta: "Suspendida",
    descripcion: "No se dio y queda detenida: cuenta como no ejecutada. Se puede reactivar reagendándola.",
    suave: "bg-rose-50 hover:bg-rose-100/70",
    barra: "border-rose-500",
    punto: "bg-rose-500",
    texto: "text-rose-800",
    pill: "bg-rose-100 text-rose-800",
  },
};

/** Estados en los que la sesión todavía se puede mover de fecha (arrastrar o reagendar). Una suspendida se reactiva así. */
export function se_puede_reagendar(estado: EstadoSesion): boolean {
  return estado === "programada" || estado === "por_registrar" || estado === "no_se_dio" || estado === "reagendada" || estado === "sin_fecha" || estado === "cancelada";
}

/** El filtro de "reagendada" incluye las que no tienen fecha. */
export function coincide_estado(estado: EstadoSesion, filtro: "" | EstadoSesion): boolean {
  if (!filtro) return true;
  if (filtro === "reagendada") return estado === "reagendada" || estado === "sin_fecha";
  return estado === filtro;
}

/** `nombre_empresa` viene como "RAZÓN SOCIAL  SEDE" (dos espacios) desde v_osi_lista. */
export function empresa_y_sede(nombre: string | null): { empresa: string; sede: string | null } {
  if (!nombre) return { empresa: "Sin empresa", sede: null };
  const i = nombre.indexOf("  ");
  if (i < 0) return { empresa: nombre.trim(), sede: null };
  return { empresa: nombre.slice(0, i).trim(), sede: nombre.slice(i).trim() || null };
}

/** Hora que se muestra: la ejecutada, la reagendada o la planificada. */
export function hora_efectiva(s: Pick<SesionCalendario, "hora_ejecutada" | "hora_reagendada" | "hora_inicio" | "fecha_ejecutada" | "fecha_reagendada">): string | null {
  if (s.fecha_ejecutada) return s.hora_ejecutada ?? s.hora_inicio;
  if (s.fecha_reagendada) return s.hora_reagendada ?? s.hora_inicio;
  return s.hora_inicio;
}

/** Orden dentro de un día: por hora (sin hora al final) y luego por OSI/sesión. */
export function comparar_eventos(
  a: Parameters<typeof hora_efectiva>[0] & { id_osi: number; nro_sesion: number },
  b: Parameters<typeof hora_efectiva>[0] & { id_osi: number; nro_sesion: number },
): number {
  const ha = minutos(hora_efectiva(a)) ?? 24 * 60;
  const hb = minutos(hora_efectiva(b)) ?? 24 * 60;
  return ha - hb || a.id_osi - b.id_osi || a.nro_sesion - b.nro_sesion;
}
