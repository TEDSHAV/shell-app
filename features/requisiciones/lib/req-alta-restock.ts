import type { OSIFullData, OSISesion, RequisicionFormData } from "@/types/requisiciones";
import { empty_alta_form } from "./req-alta-form";
import {
  cajon_from_clase,
  type ClasePedido,
  type DestinoPedido,
  type ServicioKind,
} from "./req-destino";
import { new_linea_id, type ReqLineaDraft } from "./req-lineas-types";
import type { CatalogoPedidoItem } from "./req-sugerir-reposicion";
import type { ReqDeposito } from "./req-stock-types";
import type { PasoAlta } from "./req-alta-pasos";

export type ReqAltaRestock = {
  deposito: ReqDeposito;
  item: CatalogoPedidoItem;
};

export type ReqAltaRestockSeed = {
  destino: DestinoPedido;
  servicio: ServicioKind | null;
  form: RequisicionFormData;
  lineas: ReqLineaDraft[];
  paso: PasoAlta;
};

function linea_from_catalog(
  item: CatalogoPedidoItem,
  cajon: ReturnType<typeof cajon_from_clase>,
): ReqLineaDraft {
  return {
    local_id: new_linea_id(),
    id_item_costo: item.id,
    cajon,
    nombre_item: item.nombre_item,
    unidad: item.unidad || "und",
    cantidad: 1,
    costo_catalogo: Number(item.costo_unitario_base || 0),
    costo_pagado: null,
    esta_suelto: false,
    origen: "catalogo",
  };
}

export function sesiones_de_osi(
  osi: OSIFullData,
  osi_sessions: Array<{
    id: number;
    id_osi: number;
    nro_sesion: number;
    fecha: string | null;
    hora_inicio: string | null;
    hora_fin: string | null;
  }>,
): OSISesion[] {
  const desglose = (osi.desglose_recursos_sesiones as OSISesion[] | null) || [];
  if (desglose.length > 0) return desglose;
  return osi_sessions
    .filter((row) => row.id_osi === osi.id_osi)
    .map((row) => ({
      id: row.id,
      id_sesion: row.id,
      nro_sesion: row.nro_sesion,
      fecha: row.fecha,
      hora_inicio: row.hora_inicio,
      hora_fin: row.hora_fin,
      costo_traslado: null,
      costo_impresion_material: null,
      horas_honorarios_instructor: null,
      tarifa_hora_honorarios: null,
      costo_honorarios_instructor: null,
    }));
}

export function seed_alta_restock(params: {
  restock: ReqAltaRestock;
  departamento: string;
  gerencia: string;
  solicitante: string;
}): ReqAltaRestockSeed {
  const is_depto = params.restock.deposito === "departamento";
  const clase: ClasePedido = is_depto
    ? "departamento"
    : "servicio_inventario";
  return {
    destino: is_depto ? "departamento" : "servicio",
    servicio: is_depto ? null : "inventario",
    form: {
      ...empty_alta_form({
        departamento: params.departamento,
        gerencia: params.gerencia,
        solicitante: params.solicitante,
        clase,
      }),
      tipo_servicio:
        params.restock.deposito === "tecnico"
          ? "Servicio Técnico"
          : params.restock.deposito === "capacitacion"
            ? "Capacitación"
            : "",
    },
    lineas: [linea_from_catalog(params.restock.item, cajon_from_clase(clase))],
    paso: "creacion",
  };
}
