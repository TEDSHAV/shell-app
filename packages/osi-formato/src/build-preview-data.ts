import type {
  OsiPreviewData,
  OsiRecursosSesionPreview,
} from "./osi-preview-data";
import {
  resolve_osi_horas_count,
  resolve_osi_participantes_count,
  resolve_osi_sesiones_count,
} from "./operational-display";
import { formatOsiSecuencialNro } from "./secuencial-display";
import { parse_st_traslados_json } from "./st-recursos-types";
import { build_osi_st_servicio_lines } from "./st-servicio-lines";

type GenericRow = Record<string, unknown>;

export type BuildOsiPreviewInput = {
  view_row: GenericRow;
  osi_base_row?: GenericRow | null;
  ecc_children?: GenericRow[];
  servicio_nombre_by_id?: Map<number, string> | Record<number, string>;
  public_cost_mask?: Record<string, boolean>;
  can_see_private_costs?: boolean;
};

function to_num(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function to_str(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return value.trim() || null;
}

function to_text(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return to_str(value);
}

function to_sessions(
  value: unknown,
): Array<{ fecha: string; hora_inicio?: string | null; hora_fin?: string | null }> {
  if (!Array.isArray(value)) return [];
  const result: Array<{
    fecha: string;
    hora_inicio?: string | null;
    hora_fin?: string | null;
  }> = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const fecha = typeof row.fecha === "string" ? row.fecha : "";
    if (!fecha) continue;
    result.push({
      fecha,
      hora_inicio: typeof row.hora_inicio === "string" ? row.hora_inicio : null,
      hora_fin: typeof row.hora_fin === "string" ? row.hora_fin : null,
    });
  }
  return result;
}

function format_date_for_doc(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    return new Intl.DateTimeFormat("es-VE").format(new Date());
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Intl.DateTimeFormat("es-VE").format(new Date());
  }
  return new Intl.DateTimeFormat("es-VE").format(parsed);
}

function map_desglose_recursos_sesiones(
  value: unknown,
): OsiRecursosSesionPreview[] {
  if (!Array.isArray(value)) return [];
  const result: OsiRecursosSesionPreview[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const id_sesion_raw = row.id_sesion;
    const id_sesion_num = to_num(id_sesion_raw);
    const has_sesion =
      (id_sesion_raw != null && id_sesion_num > 0) ||
      to_num(row.nro_sesion) > 0;
    if (!has_sesion) continue;
    const horas = to_num(row.horas_honorarios_instructor);
    const tarifa = to_num(row.tarifa_hora_honorarios);
    const honorarios =
      to_num(row.costo_honorarios_instructor) ||
      Math.round(horas * tarifa * 100) / 100;
    result.push({
      nroSesion: to_num(row.nro_sesion) || null,
      fecha: to_str(row.fecha),
      horaInicio: to_str(row.hora_inicio),
      horaFin: to_str(row.hora_fin),
      costoImpresionMaterial: to_num(row.costo_impresion_material),
      costoLogisticaComida: to_num(row.costo_logistica_comida),
      costoTraslado: to_num(row.costo_traslado),
      trasladoExterno: to_num(row.traslado_externo),
      costoPop: to_num(row.costo_pop),
      costoOtros: to_num(row.costo_otros),
      horasHonorariosInstructor: horas,
      tarifaHoraHonorarios: tarifa,
      costoHonorariosInstructor: honorarios,
      popIncluido: Boolean(row.pop_incluido),
      costoCarnetizacion: to_num(row.costo_carnetizacion),
      costoDiasEspecialista: to_num(row.costo_dias_especialista),
      costoHospedaje: to_num(row.costo_hospedaje),
      costoBateria: to_num(row.costo_bateria),
      diasLogisticaFacilitador: to_num(row.dias_logistica_facilitador),
      diasHospedajeFacilitador: to_num(row.dias_hospedaje_facilitador),
      stDiasCampo: to_num(row.st_dias_campo),
      stDiasInforme: to_num(row.st_dias_informe),
      stAnalistas: to_num(row.st_analistas),
      stLogisticaRecursos: to_num(row.st_logistica_recursos),
      stEnvioFactura: to_num(row.st_envio_factura),
      stEnvioMateriales: to_num(row.st_envio_materiales),
      stTraslados: parse_st_traslados_json(row.st_traslados),
      impresionMaterialIncluida: row.impresion_material_incluida !== false,
      bateriaIncluida: row.bateria_incluida !== false,
    });
  }
  return result;
}

function build_detalle_servicio(params: {
  participantes: number;
  sesiones: number;
  horasTotales: number;
  certificado: boolean;
  carnet: boolean;
}): string {
  const participantes = Math.max(0, params.participantes);
  const sesiones = Math.max(1, params.sesiones);
  const horas_totales = Math.max(0, params.horasTotales);
  const horas_por_sesion =
    sesiones > 0 ? Math.round((horas_totales / sesiones) * 100) / 100 : 0;
  const certificado_txt = params.certificado ? "incluye" : "no incluye";
  const carnet_txt = params.carnet ? "incluye" : "no incluye";
  return (
    `Para un grupo de hasta ${participantes} participantes en ${sesiones} ` +
    `sesiones de ${horas_totales} horas academicas, ${horas_por_sesion} horas ` +
    `academicas c/u. ${certificado_txt} certificado y ${carnet_txt} carnet en ` +
    "formato digital e impreso."
  );
}

function build_default_sessions(
  count: number,
  seed: Array<{ fecha: string; hora_inicio?: string | null; hora_fin?: string | null }>,
): Array<{ fecha: string; hora_inicio: string; hora_fin: string }> {
  const rows: Array<{ fecha: string; hora_inicio: string; hora_fin: string }> = [];
  for (let i = 0; i < Math.max(0, count); i += 1) {
    const base = seed[i];
    rows.push({
      fecha: base?.fecha ?? "",
      hora_inicio: base?.hora_inicio ?? "",
      hora_fin: base?.hora_fin ?? "",
    });
  }
  return rows;
}

function resolve_is_capacitacion(view_row: GenericRow): boolean {
  const tipo = String(view_row.tipo_servicio ?? "").toLowerCase();
  if (
    tipo.includes("tecnico") ||
    tipo.includes("servicio tecnico") ||
    tipo.includes("servicios tecnico")
  ) {
    return false;
  }
  if (
    to_num(view_row.st_dias_campo) > 0 ||
    to_num(view_row.st_analistas) > 0 ||
    to_num(view_row.cantidad_dias_campo) > 0
  ) {
    return false;
  }
  return (
    tipo.includes("capacitacion") ||
    tipo.includes("curso") ||
    tipo.includes("diplomado") ||
    tipo === ""
  );
}

/** Canonical OSI preview payload builder (SGestion + Shell). */
export function build_osi_preview_data(input: BuildOsiPreviewInput): OsiPreviewData {
  const view_row = input.view_row;
  const osi_base_row = input.osi_base_row ?? null;
  const ecc_children = input.ecc_children ?? [];
  const servicio_nombre_by_id = input.servicio_nombre_by_id ?? {};
  const public_cost_mask = input.public_cost_mask ?? {};
  const can_see_private_costs = input.can_see_private_costs !== false;

  const is_capacitacion = resolve_is_capacitacion(view_row);
  const st_servicios_preview = is_capacitacion
    ? []
    : build_osi_st_servicio_lines({
        view_row,
        children: ecc_children,
        servicio_nombre_by_id,
        fallback_servicio_nombre: to_str(view_row.servicio),
      });

  const certificado_impreso = Boolean(view_row.certificado_impreso);
  const carnet_impreso = Boolean(view_row.carnet_impreso);
  const participantes_contrato = to_num(view_row.participantes_max_solped);
  const sesiones_contrato = to_num(view_row.sesiones_solped);
  const horas_contrato = to_num(view_row.horas_academicas_solped);

  const participantes = resolve_osi_participantes_count(
    view_row,
    participantes_contrato,
  );
  const sesiones = resolve_osi_sesiones_count(view_row, sesiones_contrato);
  const horas_totales = resolve_osi_horas_count(view_row, horas_contrato);

  const detalle_servicio = build_detalle_servicio({
    participantes,
    sesiones,
    horasTotales: horas_totales,
    certificado: certificado_impreso,
    carnet: carnet_impreso,
  });
  const detalle_contrato = build_detalle_servicio({
    participantes: participantes_contrato,
    sesiones: sesiones_contrato,
    horasTotales: horas_contrato,
    certificado: certificado_impreso,
    carnet: carnet_impreso,
  });

  const sesiones_programadas_exec = to_sessions(view_row.sesiones_programadas);
  const sesiones_exec_st = is_capacitacion
    ? sesiones_programadas_exec
    : sesiones_programadas_exec.slice(0, 1);
  const sesiones_exec_normalizadas = build_default_sessions(
    is_capacitacion ? sesiones : 1,
    sesiones_exec_st,
  );
  const sesiones_contrato_normalizadas = build_default_sessions(sesiones_contrato, []);

  const direccion_contrato = to_str(view_row.direccion_ejecucion) ?? "";
  const direccion_real = to_str(view_row.direccion_ejecucion_real);
  const direccion_ejecucion = direccion_real ?? direccion_contrato;
  const id_dir_contrato = to_num(view_row.id_direccion_ejecucion_solped);
  const id_dir_real = to_num(view_row.id_direccion_ejecucion_real);

  const has_operational_changes =
    participantes !== participantes_contrato ||
    sesiones !== sesiones_contrato ||
    horas_totales !== horas_contrato ||
    direccion_ejecucion.trim() !== direccion_contrato.trim() ||
    JSON.stringify(sesiones_exec_normalizadas) !==
      JSON.stringify(sesiones_contrato_normalizadas);

  const preview_highlights = has_operational_changes
    ? {
        participantes: participantes !== participantes_contrato,
        detalle: detalle_servicio !== detalle_contrato,
        direccionEjecucion:
          (id_dir_real > 0 && id_dir_contrato > 0 && id_dir_real !== id_dir_contrato) ||
          direccion_ejecucion.trim() !== direccion_contrato.trim(),
        fechaServicio:
          JSON.stringify(sesiones_exec_normalizadas) !==
          JSON.stringify(sesiones_contrato_normalizadas),
      }
    : undefined;

  const fecha_documento = to_str(view_row.fecha_emision)
    ? format_date_for_doc(view_row.fecha_emision)
    : format_date_for_doc(new Date().toISOString());

  const dias_logistica = (() => {
    const stored = to_num(view_row.dias_logistica_facilitador);
    if (stored > 0) return stored;
    if (!is_capacitacion) {
      return to_num(view_row.st_dias_campo) || to_num(view_row.cantidad_dias_campo);
    }
    return 0;
  })();

  const dias_hospedaje = (() => {
    const stored = to_num(view_row.dias_hospedaje_facilitador);
    if (stored > 0) return stored;
    if (!is_capacitacion) {
      return to_num(view_row.st_dias_campo) || to_num(view_row.cantidad_dias_campo);
    }
    return 0;
  })();

  const st_traslados = parse_st_traslados_json(view_row.st_traslados);

  return {
    nroOsi: formatOsiSecuencialNro(view_row.nro_osi),
    fechaEmisionPresupuesto: to_str(view_row.fecha_emision_presupuesto),
    nroPresupuesto: to_text(view_row.nro_presupuesto),
    nroOrdenCompra: to_str(view_row.nro_orden_compra ?? ""),
    codigoCliente: to_text(view_row.id_empresa) ?? to_text(view_row.codigo_cliente),
    fechaDocumento: fecha_documento,
    revisionDocumento: "1",
    detalleServicio: detalle_servicio,
    servicio: to_str(view_row.servicio),
    tipoServicio: to_str(view_row.tipo_servicio),
    nombreEmpresa: to_str(view_row.nombre_empresa),
    clienteRif: to_str(view_row.cliente_rif),
    direccionFiscal: to_str(view_row.direccion_fiscal),
    personaContacto: to_str(view_row.persona_contacto),
    contactoTelefono: to_str(view_row.contacto_telefono),
    contactoEmail: to_str(view_row.contacto_email),
    direccionEjecucion: direccion_ejecucion,
    direccionEnvio: to_str(view_row.direccion_envio),
    ejecutivoNegocios: to_str(view_row.ejecutivo_negocios),
    responsableRecepcion: to_str(view_row.responsable_recepcion),
    fechaInicioReal: to_str(view_row.fecha_inicio_real),
    fechaFinReal: to_str(view_row.fecha_fin_real),
    horaInicioServicio: to_str(view_row.hora_inicio_servicio),
    sesionesProgramadas: sesiones_exec_normalizadas,
    participantesMaxSolped: to_num(view_row.participantes_max_solped) || null,
    horasAcademicasSolped: to_num(view_row.horas_academicas_solped) || null,
    sesionesSolped:
      sesiones_exec_normalizadas.length > 0
        ? sesiones_exec_normalizadas.length
        : sesiones > 0
          ? sesiones
          : null,
    participantesDocumento: participantes,
    previewHighlights: preview_highlights,
    pretensionesTotales: to_str(view_row.pretensiones_totales),
    observacionesTotales: to_str(view_row.observaciones_totales),
    pretensionesSolped: to_str(view_row.pretenciones_cliente),
    pretensionesOsi: null,
    observacionesSolped: to_str(view_row.observaciones_cliente),
    observacionesOsiSolicitud: to_str(osi_base_row?.observaciones_adicionales_osi),
    observacionesOsi: to_str(
      osi_base_row?.pretenciones_adicionales_osi ??
        view_row.pretenciones_adicionales_osi,
    ),
    costoImpresionMaterial: to_num(view_row.costo_impresion_material),
    costoLogisticaComida: to_num(view_row.costo_logistica_comida),
    costoTraslado: to_num(view_row.costo_traslado),
    trasladoExterno: to_num(view_row.traslado_externo),
    costoPop: to_num(view_row.costo_pop),
    costoOtros: to_num(view_row.costo_otros),
    horasHonorariosInstructor: to_num(view_row.horas_honorarios_instructor),
    diasLogisticaFacilitador: dias_logistica > 0 ? dias_logistica : undefined,
    diasHospedajeFacilitador: dias_hospedaje > 0 ? dias_hospedaje : undefined,
    tarifaHoraHonorarios: to_num(view_row.tarifa_hora_honorarios),
    costoHonorariosInstructor: to_num(view_row.costo_honorarios_instructor),
    popIncluido: Boolean(view_row.pop_incluido),
    costoCarnetizacion: to_num(view_row.costo_carnetizacion),
    costoDiasEspecialista: to_num(view_row.costo_dias_especialista),
    costoHospedaje: to_num(view_row.costo_hospedaje),
    costoBateria: to_num(view_row.costo_bateria),
    certificadoImpreso: certificado_impreso,
    carnetImpreso: carnet_impreso,
    audiovisuales: Boolean(view_row.requiere_audiovisuales),
    isCapacitacion: is_capacitacion,
    stServicios: st_servicios_preview,
    stDiasCampo: to_num(view_row.st_dias_campo) || to_num(view_row.cantidad_dias_campo),
    stDiasInforme:
      to_num(view_row.st_dias_informe) || to_num(view_row.cantidad_dias_informe),
    stAnalistas: to_num(view_row.st_analistas) || to_num(view_row.cantidad_analistas),
    stLogisticaRecursos:
      to_num(view_row.st_logistica_recursos) ||
      to_num(view_row.st_analistas) ||
      to_num(view_row.cantidad_analistas),
    stEnvioFactura: to_num(view_row.st_envio_factura),
    stEnvioMateriales: to_num(view_row.st_envio_materiales),
    stTraslados: st_traslados,
    impresionMaterialIncluida: view_row.impresion_material_incluida !== false,
    bateriaIncluida: view_row.bateria_incluida !== false,
    desgloseRecursosSesiones: map_desglose_recursos_sesiones(
      view_row.desglose_recursos_sesiones,
    ),
    publicCostMask: public_cost_mask,
    isPublicView: !can_see_private_costs,
  };
}
