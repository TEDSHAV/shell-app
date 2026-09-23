// ─── Proveedor (Vendor) Types ───

export type ImpactoNivel = "alto" | "bajo";
export type EstadoOperativoProveedor = "activo" | "en_revision" | "suspendido" | "inactivo";
export type MonedaHabitual = "USD" | "VES" | "EUR";

export interface DatoBancarioProveedor {
  id: number;
  id_proveedor: number;
  banco: string;
  nro_cuenta: string;
  cedula_titular?: string | null;
  nombre_titular?: string | null;
  telefono_pago_movil?: string | null;
  tipo_cuenta?: string | null;
  es_principal?: boolean | null;
}

export interface Proveedor {
  id: number;
  nombre_razon_social: string;
  rif_proveedor: string | null;
  producto_servicio_admin: string | null;
  impacto_nivel: ImpactoNivel;
  tipo_impacto?: string | null;
  estado_operativo: EstadoOperativoProveedor;
  persona_contacto: string | null;
  cedula_contacto: string | null;
  telefono: string | null;
  email: string | null;
  direccion_fiscal: string | null;
  direccion_referencia: string | null;
  id_estado_geografico: number | null;
  id_ciudad: number | null;
  id_estatus: number | null;
  fuente: string | null;
  condicion_pago: string | null;
  dias_credito: number;
  moneda_habitual: MonedaHabitual;
  retencion_iva: boolean;
  retencion_islr: boolean;
  fecha_vencimiento_rif: string | null;
  id_facilitador_vinculado: number | null;
  notas_observaciones: string | null;
  creado_por: number | null;
  created_at: string;
  updated_at: string;
}

export interface ProveedorWithDetails extends Proveedor {
  estado_nombre?: string | null;
  ciudad_nombre?: string | null;
  facilitador_nombre?: string | null;
  creado_por_nombre?: string | null;
  cuentas_bancarias?: DatoBancarioProveedor[];
  total_cuentas_bancarias?: number;
}

export interface ProveedorAuditoria {
  id: number;
  proveedor_id: number;
  realizado_por: number | null;
  realizado_por_nombre?: string | null;
  accion: string;
  campos_modificados: Record<string, { anterior: unknown; nuevo: unknown; anterior_texto?: string; nuevo_texto?: string }>;
  motivo: string | null;
  created_at: string;
}

export interface ProveedorNota {
  id: number;
  proveedor_id: number;
  autor_id: number | null;
  autor_nombre?: string | null;
  nota: string;
  created_at: string;
}

export interface EstadoVenezuela {
  id: number;
  nombre_estado: string;
  capital_estado?: string | null;
}

export interface CiudadVenezuela {
  id: number;
  id_estado: number;
  nombre_ciudad: string;
}

// ─── Proveedor Labels and Color Badges ───

export const PROVEEDOR_ESTADO_LABELS: Record<EstadoOperativoProveedor, string> = {
  activo: "Activo",
  en_revision: "En Revisión",
  suspendido: "Suspendido",
  inactivo: "Inactivo",
};

export const PROVEEDOR_ESTADO_COLORS: Record<EstadoOperativoProveedor, string> = {
  activo: "bg-emerald-50 text-emerald-700 border-emerald-200",
  en_revision: "bg-amber-50 text-amber-700 border-amber-200",
  suspendido: "bg-rose-50 text-rose-700 border-rose-200",
  inactivo: "bg-gray-100 text-gray-600 border-gray-200",
};

export const PROVEEDOR_IMPACTO_LABELS: Record<ImpactoNivel, string> = {
  alto: "Alto Impacto",
  bajo: "Bajo Impacto",
};

export const PROVEEDOR_IMPACTO_COLORS: Record<ImpactoNivel, string> = {
  alto: "bg-red-50 text-red-700 border-red-200",
  bajo: "bg-blue-50 text-blue-700 border-blue-200",
};
