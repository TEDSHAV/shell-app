"use server";

import { getUserOSIAccessFilter } from "@/actions/osi";
import { createClient } from "@/lib/supabase/server";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export type OrdenCompraOpcion = {
  /** N° normalizado (mayúsculas, sin espacios a los lados); es la clave del filtro. */
  numero: string;
  fecha: string | null;
  presupuestos: Array<{ id: number; nro_presupuesto: number | null; empresa: string | null }>;
};

type Fila = {
  numero_comprobante: string | null;
  fecha_comprobante: string | null;
  id_presupuesto: number;
  presupuestos: { nro_presupuesto: number | null; tratos: { empresas: { razon_social: string | null } | null } | null } | null;
};

/** Todas las órdenes de compra registradas en presupuestos, agrupadas por N°, con sus presupuestos. Se pide al abrir el selector. */
export async function getOrdenesCompra(): Promise<Result<OrdenCompraOpcion[]>> {
  const [access, supabase] = await Promise.all([getUserOSIAccessFilter(), createClient()]);
  if (access === "none") return { ok: false, error: "Sin acceso a OSIs" };

  const { data, error } = await supabase
    .from("presupuesto_comprobaciones")
    .select("numero_comprobante, fecha_comprobante, id_presupuesto, presupuesto_comprobante_tipos!inner(slug), presupuestos(nro_presupuesto, tratos(empresas(razon_social)))")
    .eq("presupuesto_comprobante_tipos.slug", "orden_compra")
    .limit(5000);
  if (error) {
    console.error("Error leyendo órdenes de compra:", error);
    return { ok: false, error: "No se pudieron cargar las órdenes de compra" };
  }

  const por_numero = new Map<string, OrdenCompraOpcion>();
  for (const f of (data ?? []) as unknown as Fila[]) {
    const numero = f.numero_comprobante?.trim().toUpperCase();
    if (!numero) continue;
    const oc = por_numero.get(numero) ?? { numero, fecha: f.fecha_comprobante, presupuestos: [] };
    if (f.fecha_comprobante && (!oc.fecha || f.fecha_comprobante > oc.fecha)) oc.fecha = f.fecha_comprobante;
    if (!oc.presupuestos.some((p) => p.id === f.id_presupuesto)) {
      oc.presupuestos.push({
        id: f.id_presupuesto,
        nro_presupuesto: f.presupuestos?.nro_presupuesto ?? null,
        empresa: f.presupuestos?.tratos?.empresas?.razon_social ?? null,
      });
    }
    por_numero.set(numero, oc);
  }
  const lista = [...por_numero.values()].sort((a, b) => (b.fecha ?? "").localeCompare(a.fecha ?? "") || a.numero.localeCompare(b.numero));
  return { ok: true, data: lista };
}
