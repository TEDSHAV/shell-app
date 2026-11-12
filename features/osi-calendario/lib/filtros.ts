import { empresa_y_sede } from "./estado-sesion";
import type { EstadoSesion, EventoCalendario } from "./types";

export type FiltrosCalendario = {
  texto: string;
  tipo: "" | "capacitacion" | "servicios_tecnicos";
  ejecutivo: string;
  estado: "" | EstadoSesion;
  /** Solo sesiones en las instalaciones de SHA. */
  en_sha: boolean;
  empresa: string;
  /** Sede de la empresa elegida. */
  sede: string;
  /** Ciudad de la dirección de ejecución. */
  ciudad: string;
  /** N° de orden de compra (normalizado). */
  oc: string;
};

export const FILTROS_VACIOS: FiltrosCalendario = {
  texto: "",
  tipo: "",
  ejecutivo: "",
  estado: "",
  en_sha: false,
  empresa: "",
  sede: "",
  ciudad: "",
  oc: "",
};

/** Filtros del panel (los chips de estado y «En SHA» van aparte). Empresa y sede cuentan como uno. */
export const CLAVES_PANEL = ["texto", "tipo", "ejecutivo", "empresa", "ciudad", "oc"] as const;

export function contar_filtros_panel(f: FiltrosCalendario): number {
  return CLAVES_PANEL.filter((k) => !!f[k]).length;
}

const ES_ST = /servicios? tecnicos?/i;

/** Todo menos el estado (que se aplica después para poder contar por estado). */
export function pasa_filtros(e: EventoCalendario, f: FiltrosCalendario): boolean {
  const t = f.texto.trim().toLowerCase();
  if (t && !`${e.nro_osi ?? ""} ${e.nombre_empresa ?? ""} ${e.servicio ?? ""}`.toLowerCase().includes(t)) return false;
  if (f.tipo === "capacitacion" && !/capacitacion/i.test(e.tipo_servicio ?? "")) return false;
  if (f.tipo === "servicios_tecnicos" && !ES_ST.test(e.tipo_servicio ?? "")) return false;
  if (f.ejecutivo && e.ejecutivo_negocios !== f.ejecutivo) return false;
  if (f.en_sha && !e.en_sha) return false;
  if (f.empresa || f.sede) {
    const { empresa, sede } = empresa_y_sede(e.nombre_empresa);
    if (f.empresa && empresa !== f.empresa) return false;
    if (f.sede && sede !== f.sede) return false;
  }
  if (f.ciudad && e.ciudad !== f.ciudad) return false;
  if (f.oc && !e.ordenes_compra.includes(f.oc)) return false;
  return true;
}

const ordenar = (xs: Iterable<string>) => [...new Set(xs)].sort((a, b) => a.localeCompare(b, "es"));

export type EmpresaOpcion = { empresa: string; sedes: string[] };

/** Opciones de los selectores, sacadas de las sesiones cargadas. Cada empresa trae sus sedes (vacío si no tiene). */
export function opciones_filtros(eventos: EventoCalendario[]) {
  const sedes_por_empresa = new Map<string, Set<string>>();
  for (const e of eventos) {
    const { empresa, sede } = empresa_y_sede(e.nombre_empresa);
    const sedes = sedes_por_empresa.get(empresa) ?? new Set<string>();
    if (sede) sedes.add(sede);
    sedes_por_empresa.set(empresa, sedes);
  }
  const empresas: EmpresaOpcion[] = ordenar(sedes_por_empresa.keys()).map((empresa) => ({
    empresa,
    sedes: ordenar(sedes_por_empresa.get(empresa) ?? []),
  }));
  return {
    empresas,
    ciudades: ordenar(eventos.map((e) => e.ciudad).filter((c): c is string => !!c)),
    ejecutivos: ordenar(eventos.map((e) => e.ejecutivo_negocios).filter((x): x is string => !!x)),
  };
}
