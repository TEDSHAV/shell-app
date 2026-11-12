import { getAppById } from "@/config/apps";

/** Enlaces a Negocios (SGestion). Abren en otra pestaña: la sesión es la misma cookie de dominio. */
function url_negocios(path: string): string {
  return `${getAppById("negocios")?.upstreamUrl ?? ""}${path}`;
}

export function url_facturar(id_presupuesto: number): string {
  return url_negocios(`/facturacion/solicitud?presupuestos=${id_presupuesto}`);
}

export function url_factura(id_solicitud: number): string {
  return url_negocios(`/facturacion/solicitud/${id_solicitud}`);
}
