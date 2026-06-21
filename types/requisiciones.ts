
export interface RequisicionItem {
  id: string;
  cant: number;
  unidad: string;
  descripcion: string;
  costo_unitario: number;
  total: number;
}

export interface RequisicionFormData {
  selectedOSI?: OSIFullData | null;
  corresponde_a: string;
  fecha_solicitud: string;
  tipo_solicitud: "Interno" | "Externo" | "";
  nro_correlativo: string;
  tipo_servicio: "Servicio Técnico" | "Capacitación" | "";
  gerencia_solicitante: string;
  solicitante: string;
  prioridad: "Alta" | "Media" | "Baja" | "";

  // Details - Fixed Items Quantities
  cant_traslado: number;
  cant_impresion: number;
  cant_honorarios: number;
  cant_informe_final: number;

  // Details - Values
  dias_traslado: number | null;
  costo_traslado: number | null;
  impresion_total: number | null;
  honorarios_horas: number | null;
  honorarios_costo_hora: number | null;
  honorarios_total: number | null;
  informe_final_total: number | null;

  // Additional dynamic items
  additional_items: RequisicionItem[];

  // Facilitator
  cod_facilitador: string;
  facilitador: string;
  cedula_facilitador: string;
  rif_facilitador: string;
  banco: string;
  nro_cuenta: string;

  observaciones: string;
}

// Full OSI data from v_osi_formato_completo view for control servicios
export interface OSIFullData {
  id_osi: number;
  nro_osi: string | null;
  fecha_emision?: string | null;
  fecha_inicio_real?: string | null;
  codigo_cliente?: number | null;
  participantes_ejecucion?: number | null;
  servicio: string | null;
  costo_traslado: number | null;
  horas_honorarios_instructor: number | null;
  tarifa_hora_honorarios: number | null;
  costo_impresion_material: number | null;
  tipo_servicio?: string | null;
}
