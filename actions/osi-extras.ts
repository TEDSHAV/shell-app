"use server";

import { createClient } from "@/lib/supabase/server";

/** Solicitudes de factura que no cuentan: Anulada (507) y Cancelada (511), conf_estatus de factura_solicitudes. */
const FACTURA_NO_VIGENTE = new Set([507, 511]);

export type FacturaOSI = {
  id_solicitud: number;
  nro_factura: string | null;
  id_estatus: number | null;
};

export type OSIExtras = {
  id_presupuesto: number | null;
  /** Certificados activos y sin anular emitidos con el N° de esta OSI. */
  certificados: number;
  /** Solicitud de factura vigente más reciente, o null si la OSI no está facturada. */
  factura: FacturaOSI | null;
  /** N° de las órdenes de compra del presupuesto que aplican a esta OSI (mismo criterio que v_osi_formato_completo). */
  ordenes_compra: string[];
};

type FilaOSI = {
  id: number;
  id_presupuesto: number | null;
  id_ecc: number | null;
  id_ecc_origen: number | null;
  presupuestos: { presupuesto_comprobaciones: Array<{ numero_comprobante: string | null; id_ecc: number | null }> } | null;
};

/** certificados.nro_osi es el correlativo numérico de la OSI. */
function mapa_por_nro(osis: Array<{ id_osi: number; nro_osi: string | null }>): Map<number, number> {
  const por_nro = new Map<number, number>();
  for (const o of osis) {
    const n = Number(o.nro_osi);
    if (o.nro_osi && Number.isInteger(n) && n > 0) por_nro.set(n, o.id_osi);
  }
  return por_nro;
}

async function leer_certificados(supabase: Awaited<ReturnType<typeof createClient>>, por_nro: Map<number, number>): Promise<Record<number, number>> {
  const out: Record<number, number> = {};
  if (por_nro.size === 0) return out;
  const leer = (sin_anulados: boolean) => {
    const q = supabase.from("certificados").select("nro_osi").in("nro_osi", [...por_nro.keys()]).eq("is_active", true);
    return (sin_anulados ? q.is("fecha_anulacion", null) : q).limit(20000);
  };
  let { data, error } = await leer(true);
  // 42703: este entorno aún no tiene la columna de anulación (staging); se cuentan los activos.
  if (error?.code === "42703") ({ data, error } = await leer(false));
  if (error) console.error("Error leyendo certificados de OSIs:", error);
  for (const c of (data ?? []) as Array<{ nro_osi: number }>) {
    const id = por_nro.get(c.nro_osi);
    if (id != null) out[id] = (out[id] ?? 0) + 1;
  }
  return out;
}

/** Certificados listos (activos, sin anular) por id de OSI. Para Consulta de OSIs. */
export async function getOSICertificados(osis: Array<{ id_osi: number; nro_osi: string | null }>): Promise<Record<number, number>> {
  return leer_certificados(await createClient(), mapa_por_nro(osis));
}

/**
 * Certificados, factura y órdenes de compra de varias OSIs en una sola onda (tres lecturas en paralelo con `.in()`).
 * Las facturas tienen RLS de Negocios: sin ese acceso, ninguna OSI aparece facturada.
 */
export async function getOSIExtras(osis: Array<{ id_osi: number; nro_osi: string | null }>): Promise<Record<number, OSIExtras>> {
  const ids = [...new Set(osis.map((o) => o.id_osi).filter((id) => Number.isFinite(id) && id > 0))];
  if (ids.length === 0) return {};
  const por_nro = mapa_por_nro(osis);

  const supabase = await createClient();
  const [osi_res, certificados, fact_res] = await Promise.all([
    supabase
      .from("ejecucion_osi")
      .select("id, id_presupuesto, id_ecc, id_ecc_origen, presupuestos(presupuesto_comprobaciones(numero_comprobante, id_ecc, presupuesto_comprobante_tipos!inner(slug)))")
      .in("id", ids)
      .eq("presupuestos.presupuesto_comprobaciones.presupuesto_comprobante_tipos.slug", "orden_compra"),
    leer_certificados(supabase, por_nro),
    supabase
      .from("factura_solicitud_osis")
      .select("id_osi, factura_solicitudes(id, nro_factura, id_estatus, created_at)")
      .in("id_osi", ids),
  ]);
  if (osi_res.error) console.error("Error leyendo presupuesto/OC de OSIs:", osi_res.error);
  if (fact_res.error) console.error("Error leyendo facturas de OSIs:", fact_res.error);

  const out: Record<number, OSIExtras> = {};
  for (const id of ids) out[id] = { id_presupuesto: null, certificados: certificados[id] ?? 0, factura: null, ordenes_compra: [] };

  for (const fila of (osi_res.data ?? []) as unknown as FilaOSI[]) {
    const e = out[fila.id];
    if (!e) continue;
    e.id_presupuesto = fila.id_presupuesto;
    const eccs = new Set([fila.id_ecc, fila.id_ecc_origen ?? fila.id_ecc]);
    const ocs = (fila.presupuestos?.presupuesto_comprobaciones ?? [])
      .filter((c) => c.numero_comprobante?.trim() && (c.id_ecc == null || eccs.has(c.id_ecc)))
      .map((c) => c.numero_comprobante!.trim().toUpperCase());
    e.ordenes_compra = [...new Set(ocs)];
  }

  type FilaFactura = { id_osi: number; factura_solicitudes: { id: number; nro_factura: string | null; id_estatus: number | null; created_at: string } | null };
  const recientes = new Map<number, string>();
  for (const f of (fact_res.data ?? []) as unknown as FilaFactura[]) {
    const s = f.factura_solicitudes;
    if (!s || (s.id_estatus != null && FACTURA_NO_VIGENTE.has(s.id_estatus)) || !out[f.id_osi]) continue;
    if ((recientes.get(f.id_osi) ?? "") > s.created_at) continue;
    recientes.set(f.id_osi, s.created_at);
    out[f.id_osi].factura = { id_solicitud: s.id, nro_factura: s.nro_factura, id_estatus: s.id_estatus };
  }
  return out;
}
