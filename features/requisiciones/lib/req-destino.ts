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

export function tipo_solicitud_from_clase(
  clase: ClasePedido,
): "Interno" | "Externo" {
  return clase === "servicio_directo" ? "Externo" : "Interno";
}

export function osi_obligatoria(clase: ClasePedido | null): boolean {
  return clase === "servicio_directo";
}

export function honorarios_permitidos(clase: ClasePedido | null): boolean {
  return clase === "servicio_directo";
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
