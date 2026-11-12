/**
 * Vocabulario único del calendario:
 * programada = «Planificada» (aún no llega la fecha) · por_registrar = «Sin estatus» (la fecha pasó y nadie marcó qué pasó) ·
 * reagendada (no se dio, se dará más adelante; sin_fecha si aún no hay fecha nueva) ·
 * no_se_dio = «No ejecutada» (no se dictó en su fecha; falta decidir si se reagenda o se cancela) ·
 * ejecutada (se dictó) · cancelada (no se dio y no se va a dar).
 */
export type EstadoSesion = "programada" | "por_registrar" | "no_se_dio" | "reagendada" | "sin_fecha" | "ejecutada" | "cancelada";

import type { FacturaOSI } from "@/actions/osi-extras";

/** `no_ejecutar` es cancelar (nombre que usa la RPC). */
export type AccionSesion = "ejecutar" | "no_se_dio" | "reagendar" | "no_ejecutar";

/** Un permiso por acción: osis:sesion:ejecutar (ejecutar y «no se dio»), :reagendar, :cancelar. */
export interface PermisosSesion {
  ejecutar: boolean;
  reagendar: boolean;
  cancelar: boolean;
}

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
  no_se_dio: boolean;
  no_se_dio_at: string | null;
  no_se_dio_nota: string | null;
}

export interface EventoCalendario extends SesionCalendario {
  estado: EstadoSesion;
  ciudad: string | null;
  comentarios_count: number;
  /** Se dicta en las instalaciones de SHA (ver lib/en-sha.ts). */
  en_sha: boolean;
  id_presupuesto: number | null;
  /** Certificados listos (activos, sin anular) con el N° de la OSI. */
  certificados: number;
  /** Solicitud de factura vigente de la OSI; null si no está facturada. */
  factura: FacturaOSI | null;
  /** N° de orden de compra (normalizados) del presupuesto de la OSI. */
  ordenes_compra: string[];
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
  permisos: PermisosSesion;
  /** Permiso osis:facturar: muestra el botón «Facturar» en las tarjetas. */
  puede_facturar: boolean;
}
