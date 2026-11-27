import { es_req_interna } from "@/features/requisiciones/lib/req-destino";

export type SaltoCoordinadorInput = {
  tipo_solicitud?: string | null;
  id_osi?: unknown;
  clase_pedido?: string | null;
  coordinador_estatus?: string | null;
  lider_estatus?: string | null;
  estatus_admin?: string | null;
  suspendida_at?: string | null;
};

/** Motivo por el que Administración no puede saltar el sello del coordinador. */
export function motivo_no_saltar_coordinador(
  row: SaltoCoordinadorInput,
): string | null {
  if (row.suspendida_at) return "La requisición está suspendida.";
  if (!es_req_interna(row)) {
    return "Solo las requisiciones internas pasan por el coordinador.";
  }
  if (row.estatus_admin === "procesada" || row.estatus_admin === "rechazada") {
    return "Esta requisición ya fue cerrada por Administración.";
  }
  if (row.coordinador_estatus !== "pendiente") {
    return "Esta requisición no está esperando al coordinador.";
  }
  if (row.lider_estatus === "pendiente" || row.lider_estatus === "aprobada") {
    return "Esta requisición ya está en el sello del líder.";
  }
  return null;
}

export function parche_salto_coordinador(actor_auth_id: string, now_iso: string) {
  return {
    coordinador_estatus: null,
    coordinador_por: actor_auth_id,
    coordinador_at: now_iso,
    lider_estatus: "pendiente" as const,
  };
}
