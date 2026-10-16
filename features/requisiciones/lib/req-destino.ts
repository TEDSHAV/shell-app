export type DestinoPedido = "departamento" | "servicio";

export type ServicioKind = "directo" | "inventario";

export type ClasePedido =
  | "departamento"
  | "servicio_directo"
  | "servicio_inventario";

export type CajonPedido = "interno" | "directo" | "inventario";

export type CatalogAmbitoPedido =
  | "capacitacion"
  | "tecnico"
  | "general"
  | "departamentos";

export function clase_from_destino(
  destino: DestinoPedido | null,
  servicio: ServicioKind | null,
): ClasePedido | null {
  if (destino === "departamento") return "departamento";
  if (destino === "servicio" && servicio === "directo") {
    return "servicio_directo";
  }
  if (destino === "servicio" && servicio === "inventario") {
    return "servicio_inventario";
  }
  return null;
}

export function cajon_from_clase(clase: ClasePedido): CajonPedido {
  if (clase === "departamento") return "interno";
  if (clase === "servicio_inventario") return "inventario";
  return "directo";
}

export function es_clase_pedido_externa(
  clase: ClasePedido | string | null | undefined,
): boolean {
  return clase === "servicio_directo" || clase === "servicio_inventario";
}

export function tipo_solicitud_from_clase(
  clase: ClasePedido,
): "Interno" | "Externo" {
  return es_clase_pedido_externa(clase) ? "Externo" : "Interno";
}

/** Inventario de OSI (reposición) es externa, aunque no lleve nro. OSI propio. */
export function es_req_interna(record: {
  tipo_solicitud?: string | null;
  id_osi?: unknown;
  clase_pedido?: string | null;
}): boolean {
  if (es_clase_pedido_externa(record.clase_pedido)) return false;
  return (
    record.tipo_solicitud === "Interno" ||
    (!record.tipo_solicitud && !record.id_osi)
  );
}

/** Entrega/depósito: internas de depto y reposición de inventario. */
export function usa_flujo_entrega_deposito(record: {
  tipo_solicitud?: string | null;
  id_osi?: unknown;
  clase_pedido?: string | null;
}): boolean {
  if (record.clase_pedido === "servicio_inventario") return true;
  if (record.clase_pedido === "servicio_directo") return false;
  return es_req_interna(record);
}

export function osi_obligatoria(clase: ClasePedido | null): boolean {
  return clase === "servicio_directo";
}

export function honorarios_permitidos(clase: ClasePedido | null): boolean {
  return clase === "servicio_directo";
}

/**
 * Picker de inventario: solo el dpto ejecutante (cap o ST).
 * Los ítems marcados en ambos salen en los dos listados.
 */
export function ambitos_para_catalogo(
  cajon: CajonPedido,
  ambito: CatalogAmbitoPedido,
): CatalogAmbitoPedido[] {
  if (cajon === "interno") {
    return [...new Set<CatalogAmbitoPedido>([ambito, "departamentos", "general"])];
  }
  if (cajon === "inventario") {
    if (ambito === "tecnico" || ambito === "capacitacion") {
      return [ambito];
    }
    return ["capacitacion"];
  }
  return [...new Set<CatalogAmbitoPedido>([ambito, "general"])];
}

function fold_ambito_text(value: string | null | undefined): string {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

/** Capacitación vs ST según el tipo de servicio de la OSI, no el depto de quien pide. */
export function ambito_from_tipo_servicio(
  tipo_servicio: string | null | undefined,
  servicio_nombre?: string | null,
): CatalogAmbitoPedido | null {
  const blob = `${fold_ambito_text(tipo_servicio)} ${fold_ambito_text(servicio_nombre)}`;
  if (!blob.trim()) return null;
  if (blob.includes("tecnico")) return "tecnico";
  if (blob.includes("capacitacion") || blob.includes("curso") || blob.includes("diplomado")) {
    return "capacitacion";
  }
  return null;
}

export function ambito_pedido_req(params: {
  clase: ClasePedido;
  departamento: string;
  tipo_servicio?: string | null;
  servicio_nombre?: string | null;
}): CatalogAmbitoPedido {
  if (params.clase === "departamento") return "departamentos";
  return (
    ambito_from_tipo_servicio(params.tipo_servicio, params.servicio_nombre) ??
    ambito_from_departamento(params.departamento, params.clase)
  );
}

export function ambito_from_departamento(
  departamento: string,
  clase: ClasePedido,
): CatalogAmbitoPedido {
  if (clase === "departamento") return "departamentos";
  const name = departamento.trim().toLowerCase();
  if (name.includes("capacitacion") || name.includes("capacitación")) {
    return "capacitacion";
  }
  if (
    name.includes("servicio") &&
    (name.includes("tecnico") || name.includes("técnico"))
  ) {
    return "tecnico";
  }
  return "general";
}

export function etiqueta_hermana(clase: ClasePedido | null): string {
  if (clase === "servicio_directo") return "Va con req de reposición";
  if (clase === "servicio_inventario") return "Va con req de curso";
  return "";
}
