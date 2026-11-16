import type { RequisicionFormData } from "@/types/requisiciones";
import {
  tipo_solicitud_from_clase,
  type ClasePedido,
} from "./req-destino";

export function empty_alta_form(params: {
  departamento: string;
  gerencia: string;
  solicitante: string;
  clase: ClasePedido;
}): RequisicionFormData {
  const tipo = tipo_solicitud_from_clase(params.clase);
  return {
    selectedOSIs: [],
    is_general: params.clase === "departamento",
    corresponde_a: "",
    fecha_solicitud: new Date().toISOString().split("T")[0],
    tipo_solicitud: tipo,
    nro_correlativo: "",
    tipo_servicio: "",
    gerencia_solicitante: params.gerencia,
    departamento: params.departamento,
    solicitante: params.solicitante,
    prioridad: "Alta",
    id_sesion: null,
    selectedSesion: null,
    cant_traslado: 1,
    cant_impresion: 1,
    cant_honorarios: 1,
    cant_informe_final: 1,
    dias_traslado: 1,
    costo_traslado: 0,
    impresion_total: 0,
    honorarios_horas: 0,
    honorarios_costo_hora: 0,
    honorarios_total: 0,
    informe_final_total: 0,
    osi_fixed_items: [],
    additional_items: [],
    cod_facilitador: "",
    facilitador: "",
    cedula_facilitador: "",
    rif_facilitador: "",
    telefono_facilitador: "",
    banco: "",
    nro_cuenta: "",
    observaciones: "",
    aumento_costos_justificacion: "",
    clase_pedido: params.clase,
    id_lote_pedido: null,
    id_requisicion_hermana: null,
  };
}

export function apply_fixed_to_form(
  form: RequisicionFormData,
  first: RequisicionFormData["osi_fixed_items"][number] | undefined,
): RequisicionFormData {
  if (!first) return form;
  return {
    ...form,
    costo_traslado: first.costo_traslado || 0,
    impresion_total: first.impresion_total || 0,
    honorarios_horas: first.honorarios_horas || 0,
    honorarios_costo_hora: first.honorarios_costo_hora || 0,
    honorarios_total: first.honorarios_total || 0,
    dias_traslado: first.dias_traslado ?? 1,
    informe_final_total: first.informe_final_total || 0,
  };
}

/**
 * Formulario de la reposición de depósito («hermana») que sale junto a un curso. Conserva la OSI y la sesión
 * (así se puede justificar después en qué OSI se gastó el inventario) y lo común (departamento, solicitante,
 * observaciones). No hereda lo que es del curso: ni la jornada de la OSI ni los montos de las columnas
 * heredadas (traslado, impresión, honorarios, informe), ni el facilitador y su cuenta de pago, ni la
 * justificación del extra. Si no, los montos del curso se contarían dos veces y la reposición quedaría con
 * un pagador. Que lleve la OSI no la hace cargar costo a esa OSI: el control de costos la ignora.
 */
export function form_de_hermana(form: RequisicionFormData): RequisicionFormData {
  return {
    ...form,
    is_general: false,
    tipo_solicitud: "Externo",
    clase_pedido: "servicio_inventario",
    osi_fixed_items: [],
    dias_traslado: 0,
    costo_traslado: 0,
    impresion_total: 0,
    honorarios_horas: 0,
    honorarios_costo_hora: 0,
    honorarios_total: 0,
    informe_final_total: 0,
    cod_facilitador: "",
    facilitador: "",
    cedula_facilitador: "",
    rif_facilitador: "",
    telefono_facilitador: "",
    banco: "",
    nro_cuenta: "",
    aumento_costos_justificacion: "",
  };
}
