"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentUserUsuarioId } from "@/actions/requisiciones-access-context";

/** Año y mes de hoy en Caracas. */
function mes_actual_caracas(): { anio: number; mes: number } {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Caracas",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  return {
    anio: Number(partes.find((p) => p.type === "year")?.value),
    mes: Number(partes.find((p) => p.type === "month")?.value),
  };
}

/**
 * Recibos de pago de este mes que la persona todavía no ha visto («Recibí conforme» pendiente).
 * Alimenta el aviso de Nómina en Utilidades. Si algo falla, 0: un aviso que no sale es mejor que uno falso.
 */
export async function contar_recibos_por_ver(): Promise<number> {
  try {
    const id_usuario = await getCurrentUserUsuarioId();
    if (!id_usuario) return 0;
    const { anio, mes } = mes_actual_caracas();
    const pad = (n: number) => String(n).padStart(2, "0");
    const desde = `${anio}-${pad(mes)}-01`;
    const siguiente = mes === 12 ? `${anio + 1}-01-01` : `${anio}-${pad(mes + 1)}-01`;
    const admin = await createAdminClient();
    const { count, error } = await admin
      .from("apu_recibo_documento")
      .select("id", { count: "exact", head: true })
      .eq("id_usuario", id_usuario)
      .is("recibido_at", null)
      .gte("fecha_pago", desde)
      .lt("fecha_pago", siguiente);
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}
