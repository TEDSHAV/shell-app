export interface OSIListFilters {
  nroOsi?: string;
  companyName?: string;
  ciudad?: string;
  ejecutivo?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  attachmentReceived?: "received" | "not_received";
}

export interface OSIStatusOption {
  id: number;
  nombre_estado: string;
  color_hex: string | null;
  orden: number | null;
  es_estado_final: boolean | null;
}

export interface OSIListItem {
  id_osi: number | null;
  nro_osi: string | null;
  nombre_empresa: string | null;
  servicio: string | null;
  tipo_servicio: string | null;
  ciudad_ejecucion: string | null;
  ejecutivo_negocios: string | null;
  fecha_inicio_real: string | null;
  fecha_fin_real: string | null;
  participantes: number | null;
  id_estatus: number | null;
  status_name: string;
  status_color: string;
  oculto_para_cliente: boolean;
  sesiones_ejecucion: number | null;
  total_sesiones: number | null;
  // Attachment received flag (manual mark by capacitacion users)
  attachment_received?: boolean | null;
  attachment_received_at?: string | null;
  attachment_received_by?: string | null;
}

export interface OSIListResult {
  osis: OSIListItem[];
  totalCount: number;
}

export interface OSIListFilterOptions {
  companies: { id_empresa: number; nombre_empresa: string }[];
  ejecutivos: string[];
  cityOptions: { id: number; nombre_ciudad: string }[];
  statuses: OSIStatusOption[];
}

export interface OSISession {
  id: number;
  id_osi: number;
  nro_sesion: number;
  fecha: string;
  hora_inicio: string | null;
  hora_fin: string | null;
  fecha_ejecutada: string | null;
  hora_ejecutada: string | null;
  ejecutada_en_fecha_planificada: boolean | null;
  id_estatus: number | null;
  status_name?: string;
  status_color?: string;
}

/** conf_estatus id for session/OSI "Ejecutada". */
export const OSI_STATUS_EJECUTADO_ID = 12;

export type SessionExecutionPayload = {
  fecha_ejecutada: string;
  hora_ejecutada: string;
  ejecutada_en_fecha_planificada: boolean;
};

export interface OSISessionsFinalCheck {
  allFinal: boolean;
  totalSessions: number;
  finalCount: number;
}
