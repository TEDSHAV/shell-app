"use client";

/* eslint-disable @next/next/no-img-element -- native img for reliable print paint */
import { Fragment } from "react";
import { cn } from "./utils/cn";
import { formatCalendarDayEsVe } from "./utils/calendar-date";
import { merged_content_to_display_html, RICH_HTML_CONTENT_CLASS } from "./rich-html";
import type { OsiStServicioLine } from "./osi-preview-data";
import { type OsiDocumentAssets, type OsiPreviewData } from "./osi-preview-data";
import { compute_st_recursos_totals, OSI_ST_TRASLADO_LABELS } from "./st-recursos-types";

/** Fixed header metadata (CÓDIGO / FECHA / REVISIÓN block). */
const OSI_FORM_META = {
  codigo: "SHA-RG-NEG-003",
  fecha: "09/06/2026",
  revision: "0",
} as const;

function OsiRichHtmlContent({
  content,
  className,
}: {
  content: string | null | undefined;
  className?: string;
}) {
  const html = merged_content_to_display_html(String(content ?? ""));
  if (html === "—") {
    return <span>—</span>;
  }
  return (
    <div
      className={cn(
        RICH_HTML_CONTENT_CLASS,
        "osi-rich-html text-[10px] leading-snug text-left",
        "whitespace-pre-wrap break-words",
        "[&_strong]:font-bold [&_em]:italic",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function st_lines_with_field(
  lines: OsiStServicioLine[] | undefined,
  field: "pretensiones" | "observaciones",
): OsiStServicioLine[] {
  return (lines ?? []).filter((line) => String(line[field] ?? "").trim().length > 0);
}

function OsiRecursosColGroup() {
  return (
    <colgroup>
      <col className="osi-col-dias" />
      <col className="osi-col-costo" />
      <col className="osi-col-total" />
    </colgroup>
  );
}

export function OsiDocumentView({ data, assets }: { data: OsiPreviewData; assets: OsiDocumentAssets }) {
  const section_header_class =
    "py-2 text-center text-[11px] font-bold text-[#002b5c] bg-slate-200";
  const sesiones = Array.isArray(data.sesionesProgramadas)
    ? data.sesionesProgramadas.filter((s) => typeof s?.fecha === "string" && s.fecha)
    : [];
  const sesiones_detalle = sesiones.map((s) => ({
    fecha: s.fecha,
    hora: s.hora_inicio || s.hora_fin || "—",
  }));
  const fechaServicioTexto =
    sesiones.length > 0
      ? sesiones
          .map((s) => {
            const hi = s.hora_inicio ? ` ${s.hora_inicio}` : "";
            return `${s.fecha}${hi}`;
          })
          .join(", ")
      : data.fechaInicioReal
        ? `${data.fechaInicioReal} al ${data.fechaFinReal || "—"}`
        : "—";
  const hl = data.previewHighlights ?? {};
  const is_public_view = Boolean(data.isPublicView);
  const is_hidden = (key: string) =>
    is_public_view && Boolean(data.publicCostMask?.[key]);
  const honorarios_hidden = is_hidden("honorarios_unit_cost");
  const logistica_hidden = is_hidden("logistica_unit_cost");
  const hospedaje_hidden = is_hidden("hospedaje_unit_cost");
  const participantesDoc =
    data.participantesDocumento != null && data.participantesDocumento >= 0
      ? data.participantesDocumento
      : data.participantesMaxSolped;
  const sesiones_programadas_raw = Array.isArray(data.sesionesProgramadas)
    ? data.sesionesProgramadas
    : [];
  const sesiones_con_fecha = sesiones_programadas_raw.filter(
    (s) => typeof s?.fecha === "string" && String(s.fecha).trim(),
  ).length;
  const sesionesDoc =
    sesiones.length > 0
      ? sesiones.length
      : sesiones_con_fecha > 0
        ? sesiones_con_fecha
        : data.sesionesSolped != null && data.sesionesSolped > 0
          ? data.sesionesSolped
          : null;
  const cellHl = (on: boolean | undefined) =>
    on ? "bg-amber-50 ring-2 ring-amber-300 ring-inset" : "";
  const costo_impresion_material_view = is_hidden("costo_impresion_material")
    ? 0
    : data.costoImpresionMaterial;
  const costo_logistica_view = logistica_hidden ? 0 : data.costoLogisticaComida;
  const costo_traslado_view = is_hidden("costo_traslado") ? 0 : data.costoTraslado;
  const traslado_externo_view = is_hidden("traslado_externo")
    ? 0
    : data.trasladoExterno;
  const costo_otros_view = is_hidden("costo_otros") ? 0 : data.costoOtros;
  const st_envio_factura_view = is_hidden("st_envio_factura")
    ? 0
    : (data.stEnvioFactura ?? 0);
  const st_envio_materiales_view = is_hidden("st_envio_materiales")
    ? 0
    : (data.stEnvioMateriales ?? 0);
  const costo_dias_especialista_view = is_hidden("costo_dias_especialista")
    ? 0
    : data.costoDiasEspecialista;
  const costo_hospedaje_view = hospedaje_hidden ? 0 : data.costoHospedaje;
  const costo_bateria_view = is_hidden("costo_bateria") ? 0 : data.costoBateria;
  const tarifa_honorarios_view = honorarios_hidden ? 0 : data.tarifaHoraHonorarios;
  const total_honorarios_view = honorarios_hidden
    ? 0
    : data.costoHonorariosInstructor;

  const totalCostos =
    costo_impresion_material_view +
    costo_logistica_view +
    costo_traslado_view +
    traslado_externo_view +
    data.costoPop +
    costo_otros_view +
    total_honorarios_view +
    data.costoCarnetizacion +
    costo_dias_especialista_view +
    costo_hospedaje_view +
    costo_bateria_view;
  const dias_logistica = data.isCapacitacion
    ? (data.diasLogisticaFacilitador ?? 0)
    : (data.diasLogisticaFacilitador ?? 0);
  const dias_hospedaje = data.isCapacitacion
    ? (data.diasHospedajeFacilitador ?? 0)
    : (data.diasHospedajeFacilitador ?? 0);

  const st_totals = !data.isCapacitacion
    ? compute_st_recursos_totals({
        dias_hospedaje_facilitador: dias_hospedaje,
        costo_hospedaje: costo_hospedaje_view,
        dias_logistica_facilitador: dias_logistica,
        costo_logistica_comida: costo_logistica_view,
        st_logistica_recursos: data.stLogisticaRecursos ?? data.stAnalistas ?? 0,
        st_envio_factura: st_envio_factura_view,
        st_envio_materiales: st_envio_materiales_view,
        st_traslados: data.stTraslados ?? [],
      })
    : null;

  const logistica_total = data.isCapacitacion
    ? dias_logistica * costo_logistica_view
    : (st_totals?.total_logistica ?? 0);
  const hospedaje_total = data.isCapacitacion
    ? dias_hospedaje * costo_hospedaje_view
    : (st_totals?.total_hospedaje ?? 0);
  const st_traslado_total = st_totals?.costo_traslado ?? costo_traslado_view;
  const st_traslado_externo_total =
    st_totals?.traslado_externo ?? traslado_externo_view;
  const st_envio_total = st_totals?.total_envio ?? 0;
  const impresion_si = data.impresionMaterialIncluida !== false;
  const bateria_si = data.bateriaIncluida !== false;
  const pretensiones_por_servicio = st_lines_with_field(
    data.stServicios,
    "pretensiones",
  );
  const observaciones_por_servicio = st_lines_with_field(
    data.stServicios,
    "observaciones",
  );
  const st_traslados_list = data.stTraslados ?? [];
  const content_hidden = (key: string) => Boolean(data.publicCostMask?.[key]);
  const pretensiones_items: Array<{
    servicio?: string;
    fuente: "SOLPED" | "OSI";
    contenido: string;
    maskKey?: string;
  }> = [];
  for (const svc of pretensiones_por_servicio) {
    const contenido = String(svc.pretensiones ?? "").trim();
    if (!contenido) continue;
    const maskKey = `osi_content_hidden:pret:${pretensiones_items.length}`;
    pretensiones_items.push({
      servicio: svc.nombre,
      fuente: "SOLPED",
      contenido,
      maskKey,
    });
  }
  if (pretensiones_items.length === 0) {
    const pret_solped = String(data.pretensionesSolped ?? "").trim();
    if (pret_solped.length > 0) {
      pretensiones_items.push({
        fuente: "SOLPED",
        contenido: pret_solped,
        maskKey: "osi_content_hidden:pret:base",
      });
    }
  }

  const observaciones_items: Array<{
    servicio?: string;
    fuente: "SOLPED" | "OSI";
    contenido: string;
    maskKey?: string;
  }> = [];
  for (const svc of observaciones_por_servicio) {
    const contenido = String(svc.observaciones ?? "").trim();
    if (!contenido) continue;
    const maskKey = `osi_content_hidden:obs:${observaciones_items.length}`;
    observaciones_items.push({
      servicio: svc.nombre,
      fuente: "SOLPED",
      contenido,
      maskKey,
    });
  }
  if (observaciones_items.length === 0) {
    const obs_solped = String(data.observacionesSolped ?? "").trim();
    if (obs_solped.length > 0) {
      observaciones_items.push({
        fuente: "SOLPED",
        contenido: obs_solped,
        maskKey: "osi_content_hidden:obs:base",
      });
    }
  }
  const obs_osi_solicitud = String(data.observacionesOsiSolicitud ?? "").trim();
  const obs_osi_emision = String(data.observacionesOsi ?? "").trim();
  const osi_observaciones_merged = [
    obs_osi_solicitud.length > 0 &&
    !content_hidden("osi_content_hidden:osi_solicitud_obs")
      ? obs_osi_solicitud
      : null,
    obs_osi_emision.length > 0 ? obs_osi_emision : null,
  ]
    .filter((part): part is string => Boolean(part))
    .join("\n\n");
  if (osi_observaciones_merged.length > 0) {
    observaciones_items.push({
      fuente: "OSI",
      contenido: osi_observaciones_merged,
    });
  }
  const pretensiones_items_visible = pretensiones_items.filter(
    (item) => !item.maskKey || !content_hidden(item.maskKey),
  );
  const observaciones_items_visible = observaciones_items.filter(
    (item) => !item.maskKey || !content_hidden(item.maskKey),
  );

  const st_fecha_inicio_cell = (
    <table className="w-full table-fixed border-collapse">
      <tbody>
        <tr>
          <th className="border-b border-black px-1 py-0.5 text-left text-[8px]">
            Día
          </th>
          <th className="border-b border-black px-1 py-0.5 text-right text-[8px]">
            Hora
          </th>
        </tr>
        {sesiones_detalle.length > 0 ? (
          sesiones_detalle.slice(0, 1).map((s, idx) => (
            <tr key={`${s.fecha}-${idx}`}>
              <td className="border-b border-black px-1 py-0.5 text-[9px]">
                {formatCalendarDayEsVe(s.fecha)}
              </td>
              <td className="border-b border-black px-1 py-0.5 text-right text-[9px]">
                {s.hora}
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={2} className="px-1 py-1 text-[9px]">
              {fechaServicioTexto}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );

  return (
    <div className="print-document-palette osi-document-root mx-auto mt-4 box-border w-[210mm] max-w-full overflow-hidden bg-white print:mt-3 print:w-full text-[10px] text-black shadow-sm print:shadow-none">
      <style>{`
        @page { size: letter; margin: 10mm; }
        [data-osi-table] {
          table-layout: fixed;
          width: 100%;
        }
        [data-osi-table] td,
        [data-osi-table] th {
          overflow-wrap: normal;
          word-break: normal;
          hyphens: none;
          box-sizing: border-box;
        }
        [data-osi-table] table {
          table-layout: fixed;
          width: 100%;
        }
        [data-osi-table] table th,
        [data-osi-table] table td {
          overflow-wrap: normal;
          word-break: normal;
          white-space: normal;
          hyphens: none;
          text-align: center;
          vertical-align: middle;
          padding: 2px 1px;
          box-sizing: border-box;
        }
        [data-osi-table] .osi-nested-table col.osi-col-dias { width: 44%; }
        [data-osi-table] .osi-nested-table col.osi-col-costo { width: 22%; }
        [data-osi-table] .osi-nested-table col.osi-col-total { width: 34%; }
        [data-osi-table] .osi-label-xs { font-size: 7px; line-height: 1.1; }
        [data-osi-table] .osi-label-sm { font-size: 8px; line-height: 1.15; }
        [data-osi-table] .osi-label-md { font-size: 9px; line-height: 1.2; }
        [data-osi-table] .osi-cert-table th,
        [data-osi-table] .osi-cert-table td {
          font-size: 8px;
          line-height: 1.15;
          font-weight: 700;
        }
        [data-osi-table] .osi-cert-table th.osi-cert-label {
          font-size: 7px;
          line-height: 1.1;
          padding: 3px 1px;
        }
        [data-osi-table] .osi-th-nowrap {
          white-space: nowrap;
        }
        [data-osi-table] .osi-long-text {
          white-space: pre-wrap;
          overflow-wrap: break-word;
          word-break: break-word;
        }
        @media print {
          html, body { margin: 0; padding: 0; background: #fff; }
          .osi-print-sheet {
            width: 100%;
            box-sizing: border-box;
            padding: 0;
          }
          .osi-print-sheet img {
            max-width: 100%;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .osi-print-footer {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          [data-osi-table] td,
          [data-osi-table] th {
            padding-top: 2px !important;
            padding-bottom: 2px !important;
          }
        }
      `}</style>
      <div className="osi-print-sheet p-0.5 print:p-0">
        {/* Header section */}
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="flex w-[170px] items-center">
            <img
              src={assets.logoSrc}
              alt="SHA DE VENEZUELA" 
              width={170}
              height={40}
              loading="eager"
              decoding="async"
              className="block h-10 w-auto object-contain"
            />
          </div>
          <div className="flex-1 text-center">
            <h1 className="text-[16px] font-bold tracking-wide text-[#002b5c] leading-none">
              ORDEN DE SERVICIO INTERNA
            </h1>
          </div>
          <div className="w-[170px] text-[8px] text-slate-700">
            <div className="grid grid-cols-[60px_1fr] gap-x-2">
              <span className="font-bold">CÓDIGO</span>
              <span>{OSI_FORM_META.codigo}</span>
              <span className="font-bold">FECHA</span>
              <span>{OSI_FORM_META.fecha}</span>
              <span className="font-bold">REVISIÓN</span>
              <span>{OSI_FORM_META.revision}</span>
              <span className="font-bold">PÁGINA</span>
              <span>1 de 1</span>
            </div>
          </div>
        </div>

        {/* Form Table */}
        <table data-osi-table className="w-full table-fixed border-collapse border border-black [&_td]:border [&_td]:border-black [&_td]:px-2 [&_td]:py-1.5 [&_td]:align-middle [&_td]:text-center [&_th]:border [&_th]:border-black [&_th]:bg-slate-100 [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-center [&_th]:font-bold [&_th]:uppercase">
          <tbody>
            <tr>
              <th className="w-1/4">FECHA DE EMISIÓN</th>
              <th className="w-1/4">N° DE PRESUPUESTO</th>
              <th className="w-1/4">N° DE ORDEN DE COMPRA</th>
              <th className="w-1/4">N° DE ORDEN DE SERVICIO INTERNA</th>
            </tr>
            <tr>
              <td className="text-center">
                {data.fechaDocumento || data.fechaEmisionPresupuesto || "—"}
              </td>
              <td className="text-center">{data.nroPresupuesto || "—"}</td>
              <td className="text-center">{data.nroOrdenCompra || "—"}</td>
              <td className="text-center font-bold text-red-600">{data.nroOsi || "—"}</td>
            </tr>

            <tr>
              <th colSpan={4} className="text-center">DATOS DEL CLIENTE</th>
            </tr>

            <tr>
              <th className="text-left" colSpan={2}>NOMBRE DE LA EMPRESA</th>
              <th className="text-left">RIF</th>
              <th className="text-left">CÓDIGO DEL CLIENTE</th>
            </tr>
            <tr>
              <td colSpan={2}>{data.nombreEmpresa || "—"}</td>
              <td>{data.clienteRif || "—"}</td>
              <td>{data.codigoCliente || "—"}</td>
            </tr>
            <tr>
              <th className="text-left">DIRECCIÓN FISCAL DEL CLIENTE</th>
              <td colSpan={3} className="!text-left">
                {data.direccionFiscal || "—"}
              </td>
            </tr>
            <tr>
              <th className="text-left">DIRECCIÓN DE EJECUCIÓN DEL SERVICIO</th>
              <td
                colSpan={3}
                className={cn("!text-left", cellHl(hl.direccionEjecucion))}
              >
                {data.direccionEjecucion || "—"}
              </td>
            </tr>
            <tr>
              <th className="text-left">DIRECCIÓN DE ENVÍO DEL SERVICIO</th>
              <td colSpan={3} className="!text-left">{data.direccionEnvio || "—"}</td>
            </tr>

            <tr>
              <th className="text-center" colSpan={2}>PERSONA CONTACTO</th>
              <th className="text-center">NÚMERO TELEFÓNICO</th>
              <th className="text-center">CORREO ELECTRÓNICO</th>
            </tr>
            <tr>
              <td className="text-center" colSpan={2}>{data.personaContacto || "—"}</td>
              <td className="text-center">{data.contactoTelefono || "—"}</td>
              <td className="break-all text-center text-[9px]">
                {data.contactoEmail || "—"}
              </td>
            </tr>

            <tr>
              <th colSpan={4} className={section_header_class}>
                DETALLE DEL SERVICIO
              </th>
            </tr>

            {data.isCapacitacion ? (
              <>
                <tr>
                  <th className="text-left">EJECUTIVO DE NEGOCIOS</th>
                  <th className="text-left">TIPO DE SERVICIO</th>
                  <th className="text-left" colSpan={2}>SERVICIO</th>
                </tr>
                <tr>
                  <td>{data.ejecutivoNegocios || "—"}</td>
                  <td>{data.tipoServicio || "—"}</td>
                  <td colSpan={2} className="!text-left text-[9px] leading-tight">
                    {data.servicio || "—"}
                  </td>
                </tr>
                <tr>
                  <th className="text-left">N° PARTICIPANTES</th>
                  <th className="text-left">N° SESIONES</th>
                  <th className="text-left">N° TOTALES</th>
                  <th className="text-left">FECHA DEL SERVICIO</th>
                </tr>
                <tr>
                  <td className={cn("text-center font-bold text-[10px]", cellHl(hl.participantes))}>
                    {participantesDoc != null ? String(participantesDoc) : "—"}
                  </td>
                  <td className={cn("text-center", cellHl(hl.fechaServicio))}>
                    {sesionesDoc != null ? String(sesionesDoc) : "—"}
                  </td>
                  <td className="text-center">{data.horasAcademicasSolped ?? "—"}</td>
                  <td className={cn("align-top", cellHl(hl.fechaServicio))}>
                    <table className="w-full table-fixed border-collapse">
                      <tbody>
                        <tr>
                          <th className="border-b border-black px-1 py-0.5 text-left">Día</th>
                          <th className="border-b border-black px-1 py-0.5 text-right">Hora</th>
                        </tr>
                        {sesiones_detalle.length > 0 ? (
                          sesiones_detalle.map((s, idx) => (
                            <tr key={`${s.fecha}-${idx}`}>
                              <td className="border-b border-black px-1 py-0.5">
                                {formatCalendarDayEsVe(s.fecha)}
                              </td>
                              <td className="border-b border-black px-1 py-0.5 text-right">
                                {s.hora}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={2} className="px-1 py-1">{fechaServicioTexto}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td
                    colSpan={4}
                    className={cn("align-top relative", cellHl(hl.detalle))}
                  >
                      <div className="absolute inset-x-0 bottom-0 top-0 flex items-center justify-center opacity-10">
                      <img
                        src={assets.logoSrc}
                            alt=""
                            width={64}
                            height={64}
                        loading="eager"
                        decoding="async"
                        className="h-16 w-16 object-contain opacity-10"
                          />
                      </div>
                      <span className="relative z-10">
                        {data.detalleServicio || data.servicio || "—"}
                      </span>
                  </td>
                </tr>
                <tr>
                  <th colSpan={4} className={section_header_class}>RECURSOS ESTIMADOS PARA EL SERVICIO</th>
                </tr>
                <tr>
                  <td rowSpan={2} className="p-0 align-middle w-[28%]">
                    <table className="osi-nested-table w-full table-fixed border-collapse [&_td]:border [&_td]:border-black [&_th]:border [&_th]:border-black">
                      <OsiRecursosColGroup />
                      <tbody>
                        <tr>
                          <th
                            colSpan={3}
                            className="bg-slate-100 text-black osi-label-md px-0.5 py-0.5 leading-tight"
                          >
                            HONORARIOS FACILITADOR
                          </th>
                        </tr>
                        <tr>
                          <th className="osi-label-sm px-0.5 py-0.5 leading-tight">HORAS</th>
                          <th className="osi-label-sm osi-th-nowrap px-0.5 py-0.5 leading-tight">COSTO/H</th>
                          <th className="osi-label-sm px-0.5 py-0.5 leading-tight">
                            TOTAL
                            <br />
                            HON.
                          </th>
                        </tr>
                        <tr>
                          <td className="text-center h-8 font-bold text-[10px]">
                            {data.horasHonorariosInstructor > 0 ? String(data.horasHonorariosInstructor) : "—"}
                          </td>
                          <td className="text-center h-8 text-[10px]">
                            {tarifa_honorarios_view > 0
                              ? `$${tarifa_honorarios_view.toFixed(2)}`
                              : "—"}
                          </td>
                          <td className="text-center h-8 font-semibold text-[10px]">
                            {total_honorarios_view > 0
                              ? `$${total_honorarios_view.toFixed(2)}`
                              : "—"}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                  <th className="osi-label-md leading-tight">IMPRESIÓN DE MATERIAL</th>
                  <th className="osi-label-md leading-tight">TRASLADO</th>
                  <th className="osi-label-md leading-tight">TRASLADO EXTERNO</th>
                </tr>
                <tr>
                  <td className="text-center h-8">
                    {costo_impresion_material_view > 0
                      ? `$${costo_impresion_material_view.toFixed(2)}`
                      : "—"}
                  </td>
                  <td className="text-center h-8">
                    {costo_traslado_view > 0 ? `$${costo_traslado_view.toFixed(2)}` : "—"}
                  </td>
                  <td className="text-center h-8">
                    {traslado_externo_view > 0
                      ? `$${traslado_externo_view.toFixed(2)}`
                      : "—"}
                  </td>
                </tr>
                <tr>
                  <th className="w-[26%] osi-label-md leading-tight">LOGÍSTICA</th>
                  <th className="w-[26%] osi-label-md leading-tight">HOSPEDAJE</th>
                  <th className="w-[12%] osi-label-md leading-tight">OTROS</th>
                  <th className="w-[36%] osi-label-md leading-tight">CERTIFICADO / CARNET / POP</th>
                </tr>
                <tr>
                  <td className="w-[26%] p-0 align-top">
                    <table className="osi-nested-table w-full table-fixed border-collapse [&_td]:border [&_td]:border-black [&_th]:border [&_th]:border-black">
                      <OsiRecursosColGroup />
                      <tbody>
                        <tr>
                          <th className="osi-label-sm px-0.5 py-0.5 leading-tight">
                            DIAS/
                            <br />
                            FACILITADOR
                          </th>
                          <th className="osi-label-sm osi-th-nowrap px-0.5 py-0.5 leading-tight">
                            COSTO
                          </th>
                          <th className="osi-label-sm px-0.5 py-0.5 leading-tight">
                            TOTAL
                            <br />
                            LOGISTICA
                          </th>
                        </tr>
                        <tr>
                          <td className="text-center h-8 font-bold text-[10px]">
                            {dias_logistica > 0
                              ? String(dias_logistica)
                              : "—"}
                          </td>
                          <td className="text-center h-8 text-[10px]">
                            {costo_logistica_view > 0
                              ? `$${costo_logistica_view.toFixed(2)}`
                              : "—"}
                          </td>
                          <td className="text-center h-8 font-semibold text-[10px]">
                            {logistica_total > 0
                              ? `$${logistica_total.toFixed(2)}`
                              : "—"}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                  <td className="w-[26%] p-0 align-top">
                    <table className="osi-nested-table w-full table-fixed border-collapse [&_td]:border [&_td]:border-black [&_th]:border [&_th]:border-black">
                      <OsiRecursosColGroup />
                      <tbody>
                        <tr>
                          <th className="osi-label-sm px-0.5 py-0.5 leading-tight">
                            DIAS/
                            <br />
                            FACILITADOR
                          </th>
                          <th className="osi-label-sm osi-th-nowrap px-0.5 py-0.5 leading-tight">
                            COSTO
                          </th>
                          <th className="osi-label-sm px-0.5 py-0.5 leading-tight">
                            TOTAL
                            <br />
                            HOSPEDAJE
                          </th>
                        </tr>
                        <tr>
                          <td className="text-center h-8 font-bold text-[10px]">
                            {dias_hospedaje > 0
                              ? String(dias_hospedaje)
                              : "—"}
                          </td>
                          <td className="text-center h-8 text-[10px]">
                            {costo_hospedaje_view > 0
                              ? `$${costo_hospedaje_view.toFixed(2)}`
                              : "—"}
                          </td>
                          <td className="text-center h-8 font-semibold text-[10px]">
                            {hospedaje_total > 0
                              ? `$${hospedaje_total.toFixed(2)}`
                              : "—"}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                  <td className="w-[12%] text-center h-8 align-top">
                    {costo_otros_view > 0 ? `$${costo_otros_view.toFixed(2)}` : "—"}
                  </td>
                  <td className="w-[36%] p-0 align-top">
                    <table className="osi-nested-table osi-cert-table w-full table-fixed border-collapse">
                      <colgroup>
                        <col className="w-1/3" />
                        <col className="w-1/3" />
                        <col className="w-1/3" />
                      </colgroup>
                      <tbody>
                        <tr>
                          <th className="osi-cert-label osi-th-nowrap w-1/3 border-b border-black py-1 leading-tight border-r">
                            CERTIFICADO
                          </th>
                          <th className="osi-th-nowrap w-1/3 border-b border-black py-1 leading-tight border-r">
                            CARNET
                          </th>
                          <th className="osi-th-nowrap w-1/3 border-b border-black py-1 leading-tight">
                            POP
                          </th>
                        </tr>
                        <tr>
                          <td className="text-center h-8 font-bold border-r border-black">
                            {data.certificadoImpreso ? "SÍ" : "NO"}
                          </td>
                          <td className="text-center h-8 font-bold border-r border-black">
                            {data.carnetImpreso ? "SÍ" : "NO"}
                  </td>
                  <td className="text-center h-8 font-bold">
                    {data.popIncluido ? "SÍ" : "NO"}
                  </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </>
            ) : (
              <>
                <tr>
                  <th className="text-left">EJECUTIVO DE NEGOCIOS</th>
                  <th className="text-left">TIPO DE SERVICIO</th>
                  <th className="text-left" colSpan={2}>
                    FECHA DE INICIO DEL SERVICIO
                  </th>
                </tr>
                <tr>
                  <td>{data.ejecutivoNegocios || "—"}</td>
                  <td>{data.tipoServicio || "Servicios Tecnicos"}</td>
                  <td
                    colSpan={2}
                    className={cn("align-top", cellHl(hl.fechaServicio))}
                  >
                    {st_fecha_inicio_cell}
                  </td>
                </tr>
                <tr>
                  <td colSpan={4} className="!text-left align-top text-[10px] leading-snug">
                    {(data.stServicios ?? []).length > 0 ? (
                      <div className="space-y-2">
                        {data.stServicios!.map((svc, idx) => (
                          <div key={`st-svc-${idx}`}>
                            <div className="font-semibold">{svc.nombre}</div>
                            {svc.detalle ? (
                              <div className="text-muted-foreground">{svc.detalle}</div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : (
                      data.servicio || "—"
                    )}
                  </td>
                </tr>
                 <tr>
                  <th colSpan={4} className={section_header_class}>
                    RECURSOS ESTIMADOS PARA EL SERVICIO
                  </th>
                </tr>
                <tr>
                  <td colSpan={4} className="p-0 align-top">
                    <table className="w-full border-collapse [&_td]:border [&_td]:border-black [&_th]:border [&_th]:border-black">
                      <tbody>
                        <tr>
                          <td className="w-1/4 align-top p-1">
                            <table className="w-full border-collapse [&_td]:border [&_td]:border-black [&_th]:border [&_th]:border-black">
                              <tbody>
                                <tr>
                                  <th
                                    colSpan={3}
                                    className="bg-slate-100 text-[9px] px-1 py-0.5"
                                  >
                                    DÍAS POR SERVICIO / ESPECIALISTAS
                                  </th>
                                </tr>
                                <tr>
                                  <th className="text-[8px]">DÍAS CAMPO</th>
                                  <th className="text-[8px]">DÍAS INFORME</th>
                                  <th className="text-[8px]">ANALISTAS/REC.</th>
                                </tr>
                                <tr>
                                  <td className="text-center text-[9px]">
                                    {data.stDiasCampo ?? "—"}
                                  </td>
                                  <td className="text-center text-[9px]">
                                    {data.stDiasInforme ?? "—"}
                                  </td>
                                  <td className="text-center text-[9px]">
                                    {data.stAnalistas ?? "—"}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </td>
                          <td className="w-1/4 align-top p-1">
                            <table className="w-full border-collapse [&_td]:border [&_td]:border-black [&_th]:border [&_th]:border-black">
                              <tbody>
                                <tr>
                                  <th
                                    colSpan={3}
                                    className="bg-slate-100 text-[9px] px-1 py-0.5"
                                  >
                                    HOSPEDAJE
                                  </th>
                                </tr>
                                <tr>
                                  <th className="text-[8px]">DÍAS</th>
                                  <th className="text-[8px]">$/DÍA</th>
                                  <th className="text-[8px]">TOTAL</th>
                                </tr>
                                <tr>
                                  <td className="text-center text-[9px]">
                                    {dias_hospedaje > 0 ? String(dias_hospedaje) : "—"}
                                  </td>
                                  <td className="text-center text-[9px]">
                                    {costo_hospedaje_view > 0
                                      ? `$${costo_hospedaje_view.toFixed(2)}`
                                      : "—"}
                                  </td>
                                  <td className="text-center font-semibold text-[9px]">
                                    {hospedaje_total > 0
                                      ? `$${hospedaje_total.toFixed(2)}`
                                      : "—"}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </td>
                          <td className="w-1/4 align-top p-1">
                            <table className="w-full border-collapse [&_td]:border [&_td]:border-black [&_th]:border [&_th]:border-black">
                              <tbody>
                                <tr>
                                  <th
                                    colSpan={4}
                                    className="bg-slate-100 text-[9px] px-1 py-0.5"
                                  >
                                    LOGÍSTICA / COMIDA
                                  </th>
                                </tr>
                                <tr>
                                  <th className="text-[8px]">DÍAS</th>
                                  <th className="text-[8px]">REC.</th>
                                  <th className="text-[8px]">$/DÍA</th>
                                  <th className="text-[8px]">TOTAL</th>
                                </tr>
                                <tr>
                                  <td className="text-center text-[9px]">
                                    {dias_logistica > 0 ? String(dias_logistica) : "—"}
                                  </td>
                                  <td className="text-center text-[9px]">
                                    {(data.stLogisticaRecursos ?? data.stAnalistas ?? 0) >
                                    0
                                      ? String(
                                          data.stLogisticaRecursos ?? data.stAnalistas,
                                        )
                                      : "—"}
                                  </td>
                                  <td className="text-center text-[9px]">
                                    {costo_logistica_view > 0
                                      ? `$${costo_logistica_view.toFixed(2)}`
                                      : "—"}
                                  </td>
                                  <td className="text-center font-semibold text-[9px]">
                                    {logistica_total > 0
                                      ? `$${logistica_total.toFixed(2)}`
                                      : "—"}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </td>
                          <td className="w-1/4 align-top p-1">
                            <table className="w-full border-collapse [&_td]:border [&_td]:border-black [&_th]:border [&_th]:border-black">
                              <tbody>
                                <tr>
                                  <th className="bg-slate-100 text-[9px] px-1 py-0.5">
                                    IMPRESIÓN DE MATERIAL
                                  </th>
                                </tr>
                                <tr>
                                  <td className="text-center font-bold text-[9px] py-1">
                                    {impresion_si ? "SÍ" : "NO"}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </td>
                        </tr>
                        <tr>
                          <td className="align-top p-1">
                            <table className="w-full border-collapse [&_td]:border [&_td]:border-black [&_th]:border [&_th]:border-black">
                              <tbody>
                                <tr>
                                  <th
                                    colSpan={3}
                                    className="bg-slate-100 text-[9px] px-1 py-0.5"
                                  >
                                    TRASLADOS
                                  </th>
                                </tr>
                                {st_traslados_list.length > 0 ? (
                                  st_traslados_list.map((traslado, idx) => (
                                    <Fragment key={`st-traslado-${idx}`}>
                                      <tr>
                                        <th
                                          colSpan={3}
                                          className="text-[8px] font-normal"
                                        >
                                          {OSI_ST_TRASLADO_LABELS[traslado.tipo]}
                                        </th>
                                      </tr>
                                      <tr>
                                        <th className="text-[8px]">CANT.</th>
                                        <th className="text-[8px]">$/U</th>
                                        <th className="text-[8px]">TOTAL</th>
                                      </tr>
                                      <tr>
                                        <td className="text-center text-[9px]">
                                          {traslado.cantidad > 0
                                            ? String(traslado.cantidad)
                                            : "—"}
                                        </td>
                                        <td className="text-center text-[9px]">
                                          {!is_hidden("costo_traslado") &&
                                          traslado.costo_unidad > 0
                                            ? `$${traslado.costo_unidad.toFixed(2)}`
                                            : "—"}
                                        </td>
                                        <td className="text-center font-semibold text-[9px]">
                                          {!is_hidden("costo_traslado") &&
                                          traslado.cantidad * traslado.costo_unidad > 0
                                            ? `$${(traslado.cantidad * traslado.costo_unidad).toFixed(2)}`
                                            : "—"}
                                        </td>
                                      </tr>
                                    </Fragment>
                                  ))
                                ) : (
                                  <>
                                    <tr>
                                      <th className="text-[8px]">URBANO</th>
                                      <th className="text-[8px]" colSpan={2}>
                                        EXTERNOS
                                      </th>
                                    </tr>
                                    <tr>
                                      <td className="text-center text-[9px]">
                                        {st_traslado_total > 0
                                          ? `$${st_traslado_total.toFixed(2)}`
                                          : "—"}
                                      </td>
                                      <td
                                        className="text-center text-[9px]"
                                        colSpan={2}
                                      >
                                        {st_traslado_externo_total > 0
                                          ? `$${st_traslado_externo_total.toFixed(2)}`
                                          : "—"}
                                      </td>
                                    </tr>
                                  </>
                                )}
                              </tbody>
                            </table>
                          </td>
                          <td className="align-top p-1">
                            <table className="w-full border-collapse [&_td]:border [&_td]:border-black [&_th]:border [&_th]:border-black">
                              <tbody>
                                <tr>
                                  <th colSpan={2} className="bg-slate-100 text-[9px] px-1 py-0.5">
                                    ENVÍOS
                                  </th>
                                </tr>
                                <tr>
                                  <th className="text-[8px]">FACTURA</th>
                                  <th className="text-[8px]">MATERIALES</th>
                                </tr>
                                <tr>
                                  <td className="text-center text-[9px] py-1">
                                    {st_envio_factura_view > 0
                                      ? `$${Number(st_envio_factura_view).toFixed(2)}`
                                      : "—"}
                                  </td>
                                  <td className="text-center text-[9px] py-1">
                                    {st_envio_materiales_view > 0
                                      ? `$${Number(st_envio_materiales_view).toFixed(2)}`
                                      : "—"}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </td>
                          <td className="align-top p-1">
                            <table className="w-full border-collapse [&_td]:border [&_td]:border-black [&_th]:border [&_th]:border-black">
                              <tbody>
                                <tr>
                                  <th className="bg-slate-100 text-[9px] px-1 py-0.5">
                                    OTROS
                                  </th>
                                </tr>
                                <tr>
                                  <td className="text-center text-[9px] py-1">
                                    {costo_otros_view + st_envio_total > 0
                                      ? `$${(costo_otros_view + st_envio_total).toFixed(2)}`
                                      : costo_otros_view > 0
                                        ? `$${costo_otros_view.toFixed(2)}`
                                        : "—"}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                  </td>
                          <td className="align-top p-1">
                            <table className="w-full border-collapse [&_td]:border [&_td]:border-black [&_th]:border [&_th]:border-black">
                              <tbody>
                                <tr>
                                  <th className="bg-slate-100 text-[9px] px-1 py-0.5">
                                    BATERÍA
                                  </th>
                                </tr>
                                <tr>
                                  <td className="text-center font-bold text-[9px] py-1">
                                    {bateria_si ? "SÍ" : "NO"}
                  </td>
                                </tr>
                              </tbody>
                            </table>
                  </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </>
            )}

            <tr>
              <th colSpan={4} className={section_header_class}>
                PRETENSIONES DEL CLIENTE
              </th>
            </tr>
            <tr>
              <td
                colSpan={4}
                className="osi-long-text min-h-12 max-w-0 align-top relative !text-left px-2 py-2"
              >
                {pretensiones_items_visible.length > 0 ? (
                  <div className="space-y-2">
                    {pretensiones_items_visible.map((item, idx) => (
                      <div key={`pret-item-${idx}`} className="border-b border-dashed pb-2 last:border-b-0 last:pb-0">
                        <div className="text-[9px] font-bold uppercase text-slate-600">
                          {item.servicio
                            ? `${item.servicio} — ${item.fuente}`
                            : item.fuente}
                        </div>
                        <OsiRichHtmlContent content={item.contenido} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <span>—</span>
                )}
              </td>
            </tr>

            <tr>
              <th colSpan={4} className={section_header_class}>
                OBSERVACIONES ADICIONALES
              </th>
            </tr>
            <tr>
              <td
                colSpan={4}
                className="osi-long-text min-h-12 max-w-0 align-top relative !text-left px-2 py-2"
              >
                {observaciones_items_visible.length > 0 ? (
                  <div className="space-y-2">
                    {observaciones_items_visible.map((item, idx) => (
                      <div key={`obs-item-${idx}`} className="border-b border-dashed pb-2 last:border-b-0 last:pb-0">
                        <div className="text-[9px] font-bold uppercase text-slate-600">
                          {item.servicio
                            ? `${item.servicio} — ${item.fuente}`
                            : item.fuente}
                        </div>
                        <OsiRichHtmlContent content={item.contenido} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <span>—</span>
                )}
              </td>
            </tr>

            <tr>
              <th colSpan={4} className={section_header_class}>
                CIERRE DEL SERVICIO EJECUTADO / LLENAR POR EL DEPARTAMENTO EJECUTANTE
              </th>
            </tr>
            <tr>
               <th className="text-[8px]">DEPARTAMENTO EJECUTANTE / NOMBRE</th>
               <th className="p-0" colSpan={2}>
                    <table className="w-full h-full border-collapse">
                      <tbody>
                        <tr>
                            <th className="w-1/3 border-r border-black border-b text-[8px] px-1 py-1 h-10">FECHA DE RECEPCIÓN DE OSI</th>
                            <th className="w-1/3 border-r border-black border-b text-[8px] px-1 py-1 h-10">FECHA DE INICIO DEL SERVICIO</th>
                            <th className="w-1/3 border-black border-b text-[8px] px-1 py-1 h-10">FECHA DE FINALIZACIÓN DEL SERVICIO</th>
                        </tr>
                        <tr>
                            <td colSpan={3} className="text-center font-bold text-[9px] py-1 border-b border-black">
                                ¿SU DPTO. CUENTA CON TODOS LOS SOPORTES REQUERIDOS INDICADOS EN ESTA OSI?
                            </td>
                        </tr>
                        <tr>
                            <th colSpan={3} className="text-left px-2 py-1 text-[8px] font-bold" style={{ background: "transparent" }}>
                                DE SER NO, JUSTIFIQUE
                            </th>
                        </tr>
                      </tbody>
                    </table>
               </th>
               <th className="p-0">
                  <table className="w-full h-full border-collapse">
                      <tbody>
                          <tr>
                              <th colSpan={2} className="border-b border-black text-[9px] py-1">RESPONSABLE DEL DPTO.</th>
                          </tr>
                          <tr>
                              <th className="w-1/2 border-r border-b border-black text-[9px] py-1 h-8" style={{ background: "transparent" }}>NOMBRE Y APELLIDO</th>
                              <th className="w-1/2 border-b border-black text-[9px] py-1 h-8" style={{ background: "transparent" }}>FIRMA</th>
                          </tr>
                          <tr>
                              <td colSpan={2} className="h-10"></td>
                          </tr>
                      </tbody>
                  </table>
               </th>
            </tr>
            <tr>
                <th className="h-8 align-middle text-left bg-transparent">REQUISICIONES</th>
                <th className="p-0" colSpan={3}>
                    <table className="w-full h-full border-collapse">
                        <tbody>
                            <tr>
                                <th className="w-[15%] text-[9px] border-r border-black" style={{ background: "transparent" }}>CANTIDAD</th>
                                <th className="w-[35%] text-[9px] border-r border-black" style={{ background: "transparent" }}>DETALLE</th>
                                <th className="w-[20%] text-[9px] border-r border-black" style={{ background: "transparent" }}>N° SOLICITUD(ES) DE ORDEN DE COMPRA</th>
                                <th className="w-[15%] text-[9px] border-r border-black" style={{ background: "transparent" }}>CANTIDAD</th>
                                <th className="w-[15%] text-[9px]" style={{ background: "transparent" }}>DETALLE</th>
                            </tr>
                        </tbody>
                    </table>
                </th>
            </tr>

            <tr>
                <th colSpan={4} className="bg-slate-100 text-center h-8">
                    QUEJAS, OBSERVACIONES O RECLAMOS RECIBIDOS POR EL CLIENTE
                </th>
            </tr>
            <tr>
               <td colSpan={4} className="h-10"></td>
            </tr>

            <tr>
               <td className="p-0 border-0" colSpan={4}>
                   <table className="w-full border-collapse h-full [&_td]:border [&_td]:border-black [&_td]:px-1 [&_td]:py-1 [&_th]:border [&_th]:border-black [&_th]:px-1 [&_th]:py-1">
                      <tbody>
                          <tr>
                              <th className="w-[15%] bg-transparent border-t-0 border-l-0 border-b-0 border-r-0"></th>
                              <th className="w-[25%] bg-slate-100">GENERACIÓN DE SOPORTE</th>
                              <th className="w-[40%] bg-slate-100" colSpan={2}>VALIDACIÓN DE SOPORTES</th>
                              <th className="w-[20%] bg-slate-100">VERIFICACIÓN DE SOPORTES</th>
                          </tr>
                           <tr>
                              <th className="text-left text-[9px] bg-transparent font-bold">NOMBRE Y APELLIDO:</th>
                              <td className="h-6"></td>
                              <td className="h-6 w-[20%]"></td>
                              <td className="h-6 w-[20%]"></td>
                              <td className="h-6"></td>
                          </tr>
                          <tr>
                              <th className="text-left text-[9px] bg-transparent font-bold">CARGO:</th>
                              <td className="text-center font-bold text-[8px]">[DEPARTAMENTO SOLICITANTE]</td>
                              <td className="text-center font-bold text-[8px]">[QHSE]</td>
                              <td className="text-center font-bold text-[8px]">[NEGOCIOS]</td>
                              <td className="text-center font-bold text-[8px]">DIRECTOR GERENTE</td>
                          </tr>
                          <tr>
                              <th className="text-left text-[9px] bg-transparent font-bold">FIRMA:</th>
                              <td className="h-8"></td>
                              <td className="h-8"></td>
                              <td className="h-8"></td>
                              <td className="h-8"></td>
                          </tr>
                           <tr>
                              <th className="text-left text-[9px] bg-transparent font-bold">FECHA:</th>
                              <td className="h-6"></td>
                              <td className="h-6"></td>
                              <td className="h-6"></td>
                              <td className="h-6"></td>
                          </tr>
                      </tbody>
                   </table>
               </td>
            </tr>
          </tbody>
        </table>

        {/* Footer */}
        <div className="osi-print-footer mt-1 w-full">
          <img
            src={assets.footerSrc}
            alt="Pie institucional"
            width={1280}
            height={120}
            loading="eager"
            decoding="async"
            className="mx-auto block h-auto w-full object-contain"
          />
        </div>
      </div>
    </div>
  );
}

