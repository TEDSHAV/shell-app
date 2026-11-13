import type { AccionSesion, EstadoSesion } from "./types";

/** Sesión mínima para simular el efecto de una acción sobre su OSI. */
export type SesionImpacto = { id_sesion: number; nro_sesion: number; estado: EstadoSesion; fecha_efectiva: string };

export type EfectoOSI =
  /** Era la última sesión abierta y hay alguna ejecutada: la OSI pasa a Ejecutada (dispara la solicitud de factura). */
  | "cierra_ejecutada"
  /** Todas quedan cerradas sin ninguna ejecutada: la OSI queda suspendida (39). */
  | "cierra_no_ejecutada"
  /** Todas quedarían cerradas, pero la OSI sigue con correlativo PEN-: no se cierra. */
  | "pendiente_pen"
  /** La OSI estaba cerrada y esta acción reabre una sesión: la OSI vuelve a En proceso. */
  | "reabre";

const CERRADA = (e: EstadoSesion) => e === "ejecutada" || e === "cancelada";

function estado_despues(accion: AccionSesion, antes: EstadoSesion): EstadoSesion {
  if (accion === "ejecutar") return "ejecutada";
  if (accion === "no_ejecutar") return "cancelada";
  if (accion === "reagendar") return "reagendada";
  return antes === "ejecutada" || antes === "cancelada" ? antes : "no_se_dio";
}

/**
 * Mismas reglas que `osi_sesion_registrar_accion` para el estatus de la OSI (12 ejecutada, 39 no ejecutada, 11 en proceso).
 * Devuelve null si la OSI no cambia de estatus.
 */
export function efecto_en_osi(p: {
  accion: AccionSesion;
  sesiones: SesionImpacto[];
  ids_afectadas: ReadonlySet<number>;
  id_estatus_osi: number | null;
  nro_osi: string | null;
}): EfectoOSI | null {
  if (p.accion === "no_se_dio") return null;
  const despues = p.sesiones.map((s) => (p.ids_afectadas.has(s.id_sesion) ? estado_despues(p.accion, s.estado) : s.estado));
  if (despues.length && despues.every(CERRADA)) {
    const alguna_ejecutada = despues.some((e) => e === "ejecutada");
    if (!alguna_ejecutada) return p.id_estatus_osi === 39 ? null : "cierra_no_ejecutada";
    if (/^PEN-\d+$/i.test(p.nro_osi ?? "")) return "pendiente_pen";
    return p.id_estatus_osi === 12 ? null : "cierra_ejecutada";
  }
  const reabre_alguna = p.sesiones.some((s) => p.ids_afectadas.has(s.id_sesion) && CERRADA(s.estado) && !CERRADA(estado_despues(p.accion, s.estado)));
  if ((p.id_estatus_osi === 12 || p.id_estatus_osi === 39) && reabre_alguna) return "reabre";
  return null;
}
