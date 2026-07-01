export interface OSIListFilters {
  nroOsi?: string;
  companyName?: string;
  ciudad?: string;
  ejecutivo?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
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
