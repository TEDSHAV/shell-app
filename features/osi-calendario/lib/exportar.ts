import { empresa_y_sede, ESTADO_UI, hora_efectiva } from "./estado-sesion";
import { estatus_factura, etiqueta_factura } from "./factura";
import type { FiltrosCalendario } from "./filtros";
import { fecha_corta, fechas_entre, hora_corta, semanas_del_mes, sumar_dias } from "./mes-grid";
import type { EstadoSesion, EventoCalendario } from "./types";

/** Colores de cada estado en hex (los mismos de ESTADO_UI, para el PNG y el PDF). */
export const COLOR_ESTADO: Record<EstadoSesion, { barra: string; fondo: string; texto: string }> = {
  programada: { barra: "#0ea5e9", fondo: "#f0f9ff", texto: "#075985" },
  por_registrar: { barra: "#94a3b8", fondo: "#f1f5f9", texto: "#334155" },
  no_se_dio: { barra: "#f59e0b", fondo: "#fffbeb", texto: "#92400e" },
  reagendada: { barra: "#8b5cf6", fondo: "#f5f3ff", texto: "#5b21b6" },
  sin_fecha: { barra: "#c4b5fd", fondo: "#f5f3ff", texto: "#5b21b6" },
  ejecutada: { barra: "#10b981", fondo: "#ecfdf5", texto: "#065f46" },
  cancelada: { barra: "#f43f5e", fondo: "#fff1f2", texto: "#9f1239" },
};

export type VistaExport = "dia" | "semana" | "mes";

export type DatosExportacion = {
  vista: VistaExport;
  /** "Agosto 2026", "27 jul – 2 ago 2026", "Sáb 1 ago 2026". */
  titulo: string;
  /** Semanas de la grilla (mes o semana); en vista día, una sola fila con el día. */
  semanas: Array<Array<{ fecha: string; en_periodo: boolean }>>;
  /** Sesiones del periodo con los filtros aplicados, ya ordenadas. */
  eventos: EventoCalendario[];
  /** Reagendadas sin fecha (no tienen día en la grilla). */
  sin_fecha: EventoCalendario[];
  filtros: string[];
  generado: string;
};

/** Semanas que se dibujan según la vista. */
export function semanas_export(vista: VistaExport, mes: string, lunes: string, dia: string): DatosExportacion["semanas"] {
  if (vista === "mes") return semanas_del_mes(mes).map((s) => s.map((d) => ({ fecha: d.fecha, en_periodo: d.en_mes })));
  if (vista === "semana") return [fechas_entre(lunes, sumar_dias(lunes, 6)).map((fecha) => ({ fecha, en_periodo: true }))];
  return [[{ fecha: dia, en_periodo: true }]];
}

const ETIQUETA_TIPO = { capacitacion: "Capacitación", servicios_tecnicos: "Servicios técnicos" } as const;

/** Filtros aplicados en texto, para el encabezado del archivo. */
export function resumen_filtros(f: FiltrosCalendario): string[] {
  const out: string[] = [];
  if (f.estado) out.push(`Estado: ${ESTADO_UI[f.estado].etiqueta}`);
  if (f.en_sha) out.push("En SHA");
  if (f.texto.trim()) out.push(`Búsqueda: “${f.texto.trim()}”`);
  if (f.tipo) out.push(ETIQUETA_TIPO[f.tipo]);
  if (f.ejecutivo) out.push(`Ejecutivo: ${f.ejecutivo}`);
  if (f.empresa) out.push(`Empresa: ${f.empresa}${f.sede ? ` · ${f.sede}` : ""}`);
  if (f.ciudad) out.push(`Ciudad: ${f.ciudad}`);
  if (f.oc) out.push(`OC ${f.oc}`);
  return out;
}

export type FilaExport = {
  fecha: string;
  hora: string;
  osi: string;
  servicio: string;
  empresa: string;
  sede: string;
  ubicacion: string;
  sesion: string;
  estado: string;
  estado_clave: EstadoSesion;
  certificado: string;
  factura: string;
  oc: string;
  ejecutivo: string;
};

/** Una fila por sesión para la tabla del PDF. */
export function filas_export(eventos: EventoCalendario[]): FilaExport[] {
  return eventos.map((e) => {
    const { empresa, sede } = empresa_y_sede(e.nombre_empresa);
    return {
      fecha: e.estado === "sin_fecha" ? "Sin fecha" : fecha_corta(e.fecha_efectiva),
      hora: e.estado === "sin_fecha" ? "" : hora_corta(hora_efectiva(e)) ?? "",
      osi: e.nro_osi ?? String(e.id_osi),
      servicio: e.servicio ?? "Servicio",
      empresa,
      sede: sede ?? "",
      ubicacion: e.en_sha ? "En SHA" : e.ciudad ?? "",
      sesion: e.total_sesiones > 1 ? `${e.nro_sesion}/${e.total_sesiones}` : "Única",
      estado: ESTADO_UI[e.estado].etiqueta,
      estado_clave: e.estado,
      certificado: e.certificados > 0 ? (e.certificados === 1 ? "1 listo" : `${e.certificados} listos`) : "",
      factura: e.factura ? `${etiqueta_factura(e.factura)}${estatus_factura(e.factura) ? ` (${estatus_factura(e.factura)})` : ""}` : "",
      oc: e.ordenes_compra.join(", "),
      ejecutivo: e.ejecutivo_negocios ?? "",
    };
  });
}

/** "calendario-servicios-2026-08", "-semana-2026-07-27", "-dia-2026-08-01" (sin extensión). */
export function nombre_archivo(vista: VistaExport, mes: string, lunes: string, dia: string): string {
  const sufijo = vista === "mes" ? mes : vista === "semana" ? `semana-${lunes}` : `dia-${dia}`;
  return `calendario-servicios-${sufijo}`;
}

/** Datos del archivo: solo las sesiones del periodo visible (mes, semana o día), con los filtros ya aplicados. */
export function armar_datos(p: {
  vista: VistaExport;
  titulo: string;
  mes: string;
  lunes: string;
  dia: string;
  eventos: EventoCalendario[];
  sin_fecha: EventoCalendario[];
  filtros: FiltrosCalendario;
  ahora?: Date;
}): DatosExportacion {
  const semanas = semanas_export(p.vista, p.mes, p.lunes, p.dia);
  const en_periodo = new Set(semanas.flat().filter((d) => d.en_periodo).map((d) => d.fecha));
  return {
    vista: p.vista,
    titulo: p.titulo,
    semanas,
    eventos: p.eventos.filter((e) => en_periodo.has(e.fecha_efectiva)),
    sin_fecha: p.sin_fecha,
    filtros: resumen_filtros(p.filtros),
    generado: (p.ahora ?? new Date()).toLocaleString("es-VE", { timeZone: "America/Caracas", dateStyle: "long", timeStyle: "short" }),
  };
}

export function descargar(url: string, nombre: string): void {
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
}
