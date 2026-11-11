"use server";

import { createClient } from "@/lib/supabase/server";
import { motivo_no_aplica } from "../lib/acciones";
import { estado_sesion } from "../lib/estado-sesion";
import { efecto_en_osi, type EfectoOSI, type SesionImpacto } from "../lib/impacto";
import { hoy_caracas } from "../lib/mes-grid";
import type { AccionSesion, SesionCalendario } from "../lib/types";

export type ImpactoOSI = {
  id_osi: number;
  nro_osi: string | null;
  efecto: EfectoOSI | null;
  /** Ids de solicitudes de factura que ya tiene la OSI. */
  solicitudes_factura: number[];
  /** Todas las sesiones de la OSI (para avisos de orden de fechas). */
  sesiones: SesionImpacto[];
};

type Result = { ok: true; data: ImpactoOSI[] } | { ok: false; error: string };

const COLUMNAS = "id_sesion, id_osi, nro_osi, nro_sesion, fecha_efectiva, fecha_ejecutada, fecha_reagendada, reagenda_count, id_estatus_sesion, no_se_dio";

/**
 * Qué le pasa a cada OSI si se aplica `accion`: si se cierra (y pide factura), si no se cierra por PEN- o si se reabre.
 * `ids_sesion` vacío = todas las sesiones de las OSIs donde la acción aplica (lote de Consulta de OSIs).
 * Una sola onda: sesiones, OSIs y solicitudes de factura en paralelo, con `.in()`.
 */
export async function getImpactoAccion(input: { accion: AccionSesion; ids_osi: number[]; ids_sesion?: number[]; individual?: boolean }): Promise<Result> {
  const ids_osi = [...new Set(input.ids_osi)].filter((id) => id > 0).slice(0, 100);
  if (!ids_osi.length) return { ok: true, data: [] };

  const supabase = await createClient();
  const [ses, osis, fact] = await Promise.all([
    supabase.from("v_osi_sesion_calendario").select(COLUMNAS).in("id_osi", ids_osi),
    supabase.from("ejecucion_osi").select("id, id_estatus, nro_osi_secuencial").in("id", ids_osi),
    supabase.from("factura_solicitud_osis").select("id_osi, id_solicitud").in("id_osi", ids_osi),
  ]);
  if (ses.error || osis.error) {
    console.error("Error leyendo impacto de la acción:", ses.error ?? osis.error);
    return { ok: false, error: "No se pudo calcular el efecto en la OSI" };
  }
  if (fact.error) console.error("Error leyendo solicitudes de factura:", fact.error);

  const hoy = hoy_caracas();
  const por_osi = new Map<number, SesionImpacto[]>();
  const nro = new Map<number, string | null>();
  for (const s of (ses.data ?? []) as unknown as Array<SesionCalendario & { no_se_dio?: boolean }>) {
    const list = por_osi.get(s.id_osi) ?? [];
    list.push({ id_sesion: s.id_sesion, nro_sesion: s.nro_sesion, estado: estado_sesion(s, hoy), fecha_efectiva: s.fecha_efectiva });
    por_osi.set(s.id_osi, list);
    nro.set(s.id_osi, s.nro_osi);
  }
  const facturas = new Map<number, number[]>();
  for (const f of (fact.data ?? []) as Array<{ id_osi: number; id_solicitud: number }>) {
    facturas.set(f.id_osi, [...(facturas.get(f.id_osi) ?? []), f.id_solicitud]);
  }

  const elegidas = input.ids_sesion?.length ? new Set(input.ids_sesion) : null;
  const data: ImpactoOSI[] = ((osis.data ?? []) as Array<{ id: number; id_estatus: number | null; nro_osi_secuencial: string | null }>).map((o) => {
    const sesiones = (por_osi.get(o.id) ?? []).sort((a, b) => a.nro_sesion - b.nro_sesion);
    // Individual: la sesión elegida, tal cual (puede reabrir una ejecutada).
    // Lote: solo donde la acción aplica, igual que registrarAccionLote.
    const afectadas = new Set(
      sesiones
        .filter((s) =>
          input.individual
            ? elegidas?.has(s.id_sesion)
            : (elegidas ? elegidas.has(s.id_sesion) : true) && motivo_no_aplica(input.accion, s.estado, s.fecha_efectiva, hoy) === null,
        )
        .map((s) => s.id_sesion),
    );
    return {
      id_osi: o.id,
      nro_osi: nro.get(o.id) ?? o.nro_osi_secuencial,
      efecto: efecto_en_osi({ accion: input.accion, sesiones, ids_afectadas: afectadas, id_estatus_osi: o.id_estatus, nro_osi: o.nro_osi_secuencial }),
      solicitudes_factura: [...new Set(facturas.get(o.id) ?? [])],
      sesiones,
    };
  });
  return { ok: true, data };
}
