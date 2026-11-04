export type EstadoSesion =
  | "planificada"
  | "atrasada"
  | "reagendada"
  | "por_confirmar"
  | "ejecutada"
  | "no_ejecutada";

export type AccionSesion = "ejecutar" | "reagendar" | "no_ejecutar";

/** Una fila de `v_osi_sesion_calendario`. */
export interface SesionCalendario {
  id_sesion: number;
  id_osi: number;
  nro_osi: string | null;
  nro_sesion: number;
  total_sesiones: number;
  fecha_planificada: string;
  hora_inicio: string | null;
  hora_fin: string | null;
  fecha_reagendada: string | null;
  hora_reagendada: string | null;
  fecha_ejecutada: string | null;
  hora_ejecutada: string | null;
  fecha_efectiva: string;
  reagenda_count: number;
  motivo_no_ejecucion_tipo: string | null;
  motivo_no_ejecucion: string | null;
  id_estatus_sesion: number | null;
  id_estatus_osi: number | null;
  nombre_empresa: string | null;
  servicio: string | null;
  tipo_servicio: string | null;
  id_ciudad: number | null;
  direccion_ejecucion: string | null;
  ejecutivo_negocios: string | null;
}

export interface EventoCalendario extends SesionCalendario {
  estado: EstadoSesion;
  ciudad: string | null;
  comentarios_count: number;
}

export interface ReagendaHistorial {
  id: number;
  fecha_desde: string | null;
  fecha_hasta: string | null;
  hora_hasta: string | null;
  motivo_tipo: string | null;
  motivo: string;
  created_at: string;
}

export interface CalendarioMesData {
  mes: string;
  hoy: string;
  eventos: EventoCalendario[];
  /** Sesiones reagendadas sin fecha nueva (no tienen día en la grilla). */
  por_confirmar: EventoCalendario[];
  puede_gestionar: boolean;
}
