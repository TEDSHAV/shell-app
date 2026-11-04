/**
 * Vocabulario único del calendario:
 * programada (aún no llega la fecha) · por_registrar (la fecha pasó y nadie marcó qué pasó) ·
 * reagendada (no se dio, se dará más adelante; sin_fecha si aún no hay fecha nueva) ·
 * ejecutada (se dictó) · cancelada (no se dio y no se va a dar).
 */
export type EstadoSesion = "programada" | "por_registrar" | "reagendada" | "sin_fecha" | "ejecutada" | "cancelada";

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
  /** Se dicta en las instalaciones de SHA (ver lib/en-sha.ts). */
  en_sha: boolean;
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
