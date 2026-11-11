import { fecha_larga } from "./mes-grid";
import type { SesionImpacto } from "./impacto";

/**
 * Avisos (no bloquean) al mover una sesión a `fecha_nueva`: fecha pasada o fuera de orden respecto a las otras
 * sesiones de la misma OSI (por su fecha vigente). Las canceladas no cuentan para el orden.
 */
export function avisos_fecha(sesion: { id_sesion: number; nro_sesion: number }, fecha_nueva: string | null, hermanas: SesionImpacto[], hoy: string): string[] {
  if (!fecha_nueva) return [];
  const avisos: string[] = [];
  if (fecha_nueva < hoy) avisos.push(`La fecha ${fecha_larga(fecha_nueva)} ya pasó: la sesión quedará como «Sin estatus».`);
  const otras = hermanas.filter((h) => h.id_sesion !== sesion.id_sesion && h.estado !== "cancelada" && h.estado !== "sin_fecha");
  const anterior_despues = otras.filter((h) => h.nro_sesion < sesion.nro_sesion && h.fecha_efectiva > fecha_nueva).sort((a, b) => b.nro_sesion - a.nro_sesion)[0];
  const siguiente_antes = otras.filter((h) => h.nro_sesion > sesion.nro_sesion && h.fecha_efectiva < fecha_nueva).sort((a, b) => a.nro_sesion - b.nro_sesion)[0];
  if (anterior_despues) avisos.push(`Queda antes de la sesión ${anterior_despues.nro_sesion} (${fecha_larga(anterior_despues.fecha_efectiva)}).`);
  if (siguiente_antes) avisos.push(`Queda después de la sesión ${siguiente_antes.nro_sesion} (${fecha_larga(siguiente_antes.fecha_efectiva)}).`);
  return avisos;
}
