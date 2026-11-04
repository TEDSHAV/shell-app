import { minutos } from "./mes-grid";
import type { EstadoSesion, SesionCalendario } from "./types";

export const ESTATUS_EJECUTADO = 12;
export const ESTATUS_NO_EJECUTADO = 39;
export const ESTATUS_REAGENDADO = 46;

/**
 * Estado visual de una sesión. Manda la fecha ejecutada; luego el último estatus del historial;
 * una reagenda sin fecha queda "por confirmar"; lo planificado ya pasado y sin cerrar, "atrasada".
 */
export function estado_sesion(s: Pick<SesionCalendario,
  "fecha_ejecutada" | "id_estatus_sesion" | "fecha_reagendada" | "reagenda_count" | "fecha_efectiva">,
  hoy: string,
): EstadoSesion {
  if (s.fecha_ejecutada || s.id_estatus_sesion === ESTATUS_EJECUTADO) return "ejecutada";
  if (s.id_estatus_sesion === ESTATUS_NO_EJECUTADO) return "no_ejecutada";
  if (s.id_estatus_sesion === ESTATUS_REAGENDADO || s.reagenda_count > 0) {
    if (!s.fecha_reagendada) return "por_confirmar";
    return s.fecha_reagendada < hoy ? "atrasada" : "reagendada";
  }
  return s.fecha_efectiva < hoy ? "atrasada" : "planificada";
}

export const ESTADOS_ORDEN: EstadoSesion[] = ["planificada", "atrasada", "reagendada", "por_confirmar", "ejecutada", "no_ejecutada"];

/** Clases por estado. `chip`: fondo de la etiqueta; `barra`: borde izquierdo; `punto`: indicador; `tarjeta`: tarjeta de resumen activa. */
export const ESTADO_UI: Record<EstadoSesion, { etiqueta: string; corta: string; chip: string; barra: string; punto: string; texto: string; tarjeta: string }> = {
  planificada: { etiqueta: "Planificada", corta: "Planificadas", chip: "bg-sky-50 hover:bg-sky-100", barra: "border-l-sky-500", punto: "bg-sky-500", texto: "text-sky-700", tarjeta: "border-sky-300 bg-sky-50 ring-2 ring-sky-200" },
  atrasada: { etiqueta: "Falta confirmar si se dio", corta: "Sin confirmar", chip: "bg-amber-50 hover:bg-amber-100", barra: "border-l-amber-500", punto: "bg-amber-500", texto: "text-amber-700", tarjeta: "border-amber-300 bg-amber-50 ring-2 ring-amber-200" },
  reagendada: { etiqueta: "Reagendada", corta: "Reagendadas", chip: "bg-orange-50 hover:bg-orange-100", barra: "border-l-orange-500", punto: "bg-orange-500", texto: "text-orange-700", tarjeta: "border-orange-300 bg-orange-50 ring-2 ring-orange-200" },
  por_confirmar: { etiqueta: "Reagendada · sin fecha", corta: "Sin fecha", chip: "bg-orange-50 hover:bg-orange-100", barra: "border-l-orange-300 border-dashed", punto: "bg-orange-300", texto: "text-orange-700", tarjeta: "border-orange-300 bg-orange-50 ring-2 ring-orange-200" },
  ejecutada: { etiqueta: "Ejecutada", corta: "Ejecutadas", chip: "bg-emerald-50 hover:bg-emerald-100", barra: "border-l-emerald-500", punto: "bg-emerald-500", texto: "text-emerald-700", tarjeta: "border-emerald-300 bg-emerald-50 ring-2 ring-emerald-200" },
  no_ejecutada: { etiqueta: "No ejecutada", corta: "No ejecutadas", chip: "bg-rose-50 hover:bg-rose-100", barra: "border-l-rose-500", punto: "bg-rose-500", texto: "text-rose-700", tarjeta: "border-rose-300 bg-rose-50 ring-2 ring-rose-200" },
};

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
