import type { FacturaOSI } from "@/actions/osi-extras";
import type { EventoCalendario } from "./types";

/** Nombres de conf_estatus (tabla_referencia factura_solicitudes), verificados en prod y staging el 2026-11-05. */
const ESTATUS_FACTURA: Record<number, string> = {
  501: "Borrador",
  502: "Pendiente Finanzas",
  503: "Pendiente Administración",
  504: "Emitida",
  505: "Por cobrar",
  506: "Cerrada",
  508: "Rechazada",
  509: "Rechazada emisión",
  510: "Vencida",
};

/** «Factura 000123» si ya tiene número; si no, «En facturación» (solicitud en curso). */
export function etiqueta_factura(f: FacturaOSI): string {
  return f.nro_factura?.trim() ? `Factura ${f.nro_factura.trim()}` : "En facturación";
}

export function estatus_factura(f: FacturaOSI): string | null {
  return f.id_estatus != null ? ESTATUS_FACTURA[f.id_estatus] ?? null : null;
}

/** El botón «Facturar» aparece si hay permiso, la OSI no está facturada, tiene presupuesto y no se canceló. */
export function se_puede_facturar(
  e: Pick<EventoCalendario, "factura" | "id_presupuesto" | "estado" | "id_estatus_osi">,
  puede_facturar: boolean,
): boolean {
  return puede_facturar && !e.factura && e.id_presupuesto != null && e.estado !== "cancelada" && e.id_estatus_osi !== 39;
}
