"use client";

import { Fragment } from "react";
import { cn } from "./utils/cn";
import {
  type OsiRecursosCostSlice,
  type OsiRecursosLayout,
  build_osi_recursos_layout,
} from "./osi-recursos-layout";
import {
  compute_st_recursos_totals,
  OSI_ST_TRASLADO_LABELS,
} from "./st-recursos-types";
import { OsiRecursosColGroup } from "./osi-recursos-colgroup";
import type { OsiPreviewData } from "./osi-preview-data";
import {
  format_money_or_dash,
} from "./osi-recursos-segmentado";
import { OsiRecursosVariacionesTable } from "./osi-recursos-variaciones-table";
import { OsiResumenRecursosConsolidado } from "./osi-resumen-recursos";
import {
  format_certificado_entrega_display,
  format_osi_si_no,
  OSI_BOOLEAN_VALUE_CLASS,
  OSI_DOC_VALUE_BOLD_CLASS,
  OSI_DOC_VALUE_CLASS,
} from "./osi-document-typography";

export type { OsiRecursosCostSlice, OsiRecursosLayout };
export { build_osi_recursos_layout };
export { build_osi_recursos_cost_slices } from "./osi-recursos-layout";

type MaskFns = {
  is_hidden: (key: string) => boolean;
  section_header_class: string;
};

function OsiRecursosVariacionesRows({
  layout,
  section_header_class,
  maskMonetary,
}: {
  layout: OsiRecursosLayout;
  section_header_class: string;
  maskMonetary?: boolean;
}) {
  if (
    !layout.esPorSesion ||
    layout.variaciones.length === 0 ||
    layout.variacionColumnas.length === 0
  ) {
    return null;
  }

  return (
    <>
      <tr>
        <th colSpan={6} className={section_header_class}>
          DESGLOSE DIARIO POR SESIÓN
        </th>
      </tr>
      <tr>
        <td colSpan={6} className="!text-left align-top p-1 overflow-x-auto">
          <OsiRecursosVariacionesTable
            layout={layout}
            maskMonetary={maskMonetary}
          />
        </td>
      </tr>
    </>
  );
}

function OsiCapDesgloseDiarioRows({
  layout,
  section_header_class,
  maskMonetary,
}: {
  layout: OsiRecursosLayout;
  section_header_class: string;
  maskMonetary?: boolean;
}) {
  const hasVariaciones =
    layout.esPorSesion &&
    layout.variaciones.length > 0 &&
    layout.variacionColumnas.length > 0;

  return (
    <>
      <tr>
        <th colSpan={6} className={section_header_class}>
          DESGLOSE DIARIO POR SESIÓN
        </th>
      </tr>
      <tr>
        <td colSpan={6} className="!text-left align-top p-1 overflow-x-auto">
          {hasVariaciones ? (
            <OsiRecursosVariacionesTable
              layout={layout}
              maskMonetary={maskMonetary}
            />
          ) : (
            <p className="text-left text-[12px] leading-snug px-1 py-1">
              detalle en el cuadro resumen de recursos del servicio
            </p>
          )}
        </td>
      </tr>
    </>
  );
}

export { format_certificado_entrega_display } from "./osi-document-typography";

export function OsiCapacitacionRecursosBlocks({
  layout,
  is_hidden,
  section_header_class,
}: {
  layout: OsiRecursosLayout;
} & MaskFns) {
  if (layout.esPorSesion) {
    return (
      <>
        <OsiResumenRecursosConsolidado
          layout={layout}
          is_hidden={is_hidden}
          section_header_class={section_header_class}
          is_capacitacion
        />
        <OsiCapDesgloseDiarioRows
          layout={layout}
          section_header_class={section_header_class}
          maskMonetary={is_hidden("gran_total")}
        />
      </>
    );
  }

  const slice = layout.consolidado;
  const honorarios_mask_hidden = is_hidden("honorarios_unit_cost");
  const logistica_mask_hidden = is_hidden("logistica_unit_cost");
  const hospedaje_mask_hidden = is_hidden("hospedaje_unit_cost");
  const impresion_mask_hidden = is_hidden("costo_impresion_material");
  const traslado_mask_hidden = is_hidden("costo_traslado");
  const traslado_ext_mask_hidden = is_hidden("traslado_externo");
  const otros_mask_hidden = is_hidden("costo_otros");

  const tarifa_honorarios_view = honorarios_mask_hidden
    ? 0
    : slice.tarifaHoraHonorarios;
  const total_honorarios_view = honorarios_mask_hidden
    ? 0
    : slice.costoHonorariosInstructor;
  const horas_view = honorarios_mask_hidden
    ? 0
    : slice.horasHonorariosInstructor;
  const costo_impresion_material_view = impresion_mask_hidden
    ? 0
    : slice.costoImpresionMaterial;
  const costo_traslado_view = traslado_mask_hidden ? 0 : slice.costoTraslado;
  const traslado_externo_view = traslado_ext_mask_hidden
    ? 0
    : slice.trasladoExterno;
  const costo_otros_view = otros_mask_hidden ? 0 : slice.costoOtros;
  const costo_logistica_view = logistica_mask_hidden
    ? 0
    : slice.costoLogisticaComida;
  const costo_hospedaje_view = hospedaje_mask_hidden
    ? 0
    : slice.costoHospedaje;
  const dias_logistica = slice.diasLogisticaFacilitador;
  const dias_hospedaje = slice.diasHospedajeFacilitador;
  const logistica_total = dias_logistica * costo_logistica_view;
  const hospedaje_total = dias_hospedaje * costo_hospedaje_view;

  return (
    <>
      <tr>
        <th colSpan={6} className={section_header_class}>
          RECURSOS ESTIMADOS PARA EL SERVICIO
        </th>
      </tr>
      <tr>
        <td className="p-0 align-middle w-[34%]" colSpan={2}>
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
                <th className="osi-label-sm osi-th-nowrap px-0.5 py-0.5 leading-tight">
                  COSTO
                </th>
                <th className="osi-label-sm px-0.5 py-0.5 leading-tight">TOTAL</th>
              </tr>
              <tr>
                <td className={cn(OSI_DOC_VALUE_BOLD_CLASS, "h-9")}>
                  {horas_view > 0 ? String(horas_view) : "N/A"}
                </td>
                <td className={cn(OSI_DOC_VALUE_CLASS, "h-9")}>
                  {tarifa_honorarios_view > 0
                    ? `$${tarifa_honorarios_view.toFixed(2)}`
                    : "N/A"}
                </td>
                <td className={cn(OSI_DOC_VALUE_CLASS, "h-9")}>
                  {total_honorarios_view > 0
                    ? `$${total_honorarios_view.toFixed(2)}`
                    : "N/A"}
                </td>
              </tr>
            </tbody>
          </table>
        </td>
        <td className="w-[33%] p-0 align-top" colSpan={2}>
          <table className="osi-nested-table w-full table-fixed border-collapse [&_td]:border [&_td]:border-black [&_th]:border [&_th]:border-black">
            <OsiRecursosColGroup />
            <tbody>
              <tr>
                <th
                  colSpan={3}
                  className="bg-slate-100 text-black osi-label-md px-0.5 py-0.5 leading-tight"
                >
                  HOSPEDAJE
                </th>
              </tr>
              <tr>
                <th className="osi-label-sm px-0.5 py-0.5 leading-tight">DÍAS</th>
                <th className="osi-label-sm osi-th-nowrap px-0.5 py-0.5 leading-tight">
                  COSTO
                </th>
                <th className="osi-label-sm px-0.5 py-0.5 leading-tight">TOTAL</th>
              </tr>
              <tr>
                <td className={cn(OSI_DOC_VALUE_BOLD_CLASS, "h-9")}>
                  {dias_hospedaje > 0 ? String(dias_hospedaje) : "N/A"}
                </td>
                <td className={cn(OSI_DOC_VALUE_CLASS, "h-9")}>
                  {costo_hospedaje_view > 0
                    ? `$${costo_hospedaje_view.toFixed(2)}`
                    : "N/A"}
                </td>
                <td className={cn(OSI_DOC_VALUE_CLASS, "h-9")}>
                  {hospedaje_total > 0 ? `$${hospedaje_total.toFixed(2)}` : "N/A"}
                </td>
              </tr>
            </tbody>
          </table>
        </td>
        <td className="w-[33%] p-0 align-top" colSpan={2}>
          <table className="osi-nested-table w-full table-fixed border-collapse [&_td]:border [&_td]:border-black [&_th]:border [&_th]:border-black">
            <OsiRecursosColGroup />
            <tbody>
              <tr>
                <th
                  colSpan={3}
                  className="bg-slate-100 text-black osi-label-md px-0.5 py-0.5 leading-tight"
                >
                  LOGÍSTICA / COMIDA
                </th>
              </tr>
              <tr>
                <th className="osi-label-sm px-0.5 py-0.5 leading-tight">DÍAS</th>
                <th className="osi-label-sm osi-th-nowrap px-0.5 py-0.5 leading-tight">
                  COSTO
                </th>
                <th className="osi-label-sm px-0.5 py-0.5 leading-tight">TOTAL</th>
              </tr>
              <tr>
                <td className={cn(OSI_DOC_VALUE_BOLD_CLASS, "h-9")}>
                  {dias_logistica > 0 ? String(dias_logistica) : "N/A"}
                </td>
                <td className={cn(OSI_DOC_VALUE_CLASS, "h-9")}>
                  {costo_logistica_view > 0
                    ? `$${costo_logistica_view.toFixed(2)}`
                    : "N/A"}
                </td>
                <td className={cn(OSI_DOC_VALUE_CLASS, "h-9")}>
                  {logistica_total > 0 ? `$${logistica_total.toFixed(2)}` : "N/A"}
                </td>
              </tr>
            </tbody>
          </table>
        </td>
      </tr>
      <tr>
        <td className="p-0 align-top" colSpan={3}>
          <table className="osi-nested-table w-full table-fixed border-collapse [&_td]:border [&_td]:border-black [&_th]:border [&_th]:border-black">
            <tbody>
              <tr>
                <th className="bg-slate-100 text-black osi-label-md px-0.5 py-0.5 leading-tight">
                  IMPRESIÓN DE MATERIAL
                </th>
              </tr>
              <tr>
                <td className={cn(OSI_DOC_VALUE_CLASS, "h-9")}>
                  {format_money_or_dash(
                    costo_impresion_material_view,
                    impresion_mask_hidden,
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </td>
        <td className="p-0 align-top" colSpan={3}>
          <table className="osi-nested-table w-full table-fixed border-collapse [&_td]:border [&_td]:border-black [&_th]:border [&_th]:border-black">
            <tbody>
              <tr>
                <th
                  colSpan={3}
                  className="bg-slate-100 text-black osi-label-md px-0.5 py-0.5 leading-tight"
                >
                  TRASLADOS
                </th>
              </tr>
              <tr>
                <th className="osi-label-sm px-0.5 py-0.5 leading-tight">URBANO</th>
                <th className="osi-label-sm px-0.5 py-0.5 leading-tight">
                  EXTRAURBANO
                </th>
                <th className="osi-label-sm px-0.5 py-0.5 leading-tight">OTROS</th>
              </tr>
              <tr>
                <td className={cn(OSI_DOC_VALUE_CLASS, "h-9")}>
                  {format_money_or_dash(costo_traslado_view, traslado_mask_hidden)}
                </td>
                <td className={cn(OSI_DOC_VALUE_CLASS, "h-9")}>
                  {format_money_or_dash(
                    traslado_externo_view,
                    traslado_ext_mask_hidden,
                  )}
                </td>
                <td className={cn(OSI_DOC_VALUE_CLASS, "h-9")}>
                  {format_money_or_dash(costo_otros_view, otros_mask_hidden)}
                </td>
              </tr>
            </tbody>
          </table>
        </td>
      </tr>
      <tr>
        <th
          className="osi-cert-label osi-th-nowrap border-b border-black py-1.5 leading-tight osi-label-md"
          colSpan={2}
        >
          CERTIFICADO
        </th>
        <th
          className="osi-th-nowrap border-b border-black py-1.5 leading-tight osi-label-md"
          colSpan={2}
        >
          CARNET
        </th>
        <th className="osi-th-nowrap border-b border-black py-1.5 leading-tight osi-label-md">
          POP
        </th>
        <th className="osi-th-nowrap border-b border-black py-1.5 leading-tight osi-label-md">
          INCLUYE REFRIGERIO
        </th>
      </tr>
      <tr>
        <td className={cn(OSI_BOOLEAN_VALUE_CLASS, "h-9 px-1 leading-tight")} colSpan={2}>
          {format_certificado_entrega_display(
            slice.certificadoImpreso,
            slice.entregaCertificado,
          )}
        </td>
        <td className={cn(OSI_BOOLEAN_VALUE_CLASS, "h-9")} colSpan={2}>
          {format_osi_si_no(slice.carnetImpreso)}
        </td>
        <td className={cn(OSI_BOOLEAN_VALUE_CLASS, "h-9")}>
          {format_osi_si_no(slice.popIncluido)}
        </td>
        <td className={cn(OSI_BOOLEAN_VALUE_CLASS, "h-9")}>
          {format_osi_si_no(slice.incluyeRefrigerio)}
        </td>
      </tr>
      <OsiCapDesgloseDiarioRows
        layout={layout}
        section_header_class={section_header_class}
        maskMonetary={is_hidden("gran_total")}
      />
    </>
  );
}

export function OsiStRecursosBlocks({
  layout,
  is_hidden,
  section_header_class,
}: {
  layout: OsiRecursosLayout;
} & MaskFns) {
  if (layout.esPorSesion) {
    return (
      <>
        <OsiResumenRecursosConsolidado
          layout={layout}
          is_hidden={is_hidden}
          section_header_class={section_header_class}
          is_capacitacion={false}
        />
        <OsiRecursosVariacionesRows
          layout={layout}
          section_header_class={section_header_class}
          maskMonetary={is_hidden("gran_total")}
        />
      </>
    );
  }

  const slice = layout.consolidado;
  const logistica_mask_hidden = is_hidden("logistica_unit_cost");
  const hospedaje_mask_hidden = is_hidden("hospedaje_unit_cost");
  const impresion_mask_hidden = is_hidden("costo_impresion_material");
  const otros_mask_hidden = is_hidden("costo_otros");
  const envio_factura_mask = is_hidden("st_envio_factura");
  const envio_mat_mask = is_hidden("st_envio_materiales");
  const traslado_mask = is_hidden("costo_traslado");

  const costo_logistica_view = logistica_mask_hidden
    ? 0
    : slice.costoLogisticaComida;
  const costo_hospedaje_view = hospedaje_mask_hidden ? 0 : slice.costoHospedaje;
  const st_envio_factura_view = envio_factura_mask ? 0 : slice.stEnvioFactura;
  const st_envio_materiales_view = envio_mat_mask ? 0 : slice.stEnvioMateriales;
  const costo_otros_view = otros_mask_hidden ? 0 : slice.costoOtros;
  const costo_impresion_material_view = impresion_mask_hidden
    ? 0
    : slice.costoImpresionMaterial;
  const dias_logistica = slice.diasLogisticaFacilitador;
  const dias_hospedaje = slice.diasHospedajeFacilitador;
  const st_totals = compute_st_recursos_totals({
    dias_hospedaje_facilitador: dias_hospedaje,
    costo_hospedaje: costo_hospedaje_view,
    dias_logistica_facilitador: dias_logistica,
    costo_logistica_comida: costo_logistica_view,
    st_logistica_recursos: slice.stLogisticaRecursos,
    st_envio_factura: st_envio_factura_view,
    st_envio_materiales: st_envio_materiales_view,
    st_traslados: slice.stTraslados,
  });
  const st_traslado_total = st_totals.costo_traslado;
  const st_traslado_externo_total = st_totals.traslado_externo;
  const impresion_si = slice.impresionMaterialIncluida;
  const st_traslados_list = slice.stTraslados;

  return (
    <>
      <tr>
        <th colSpan={6} className={section_header_class}>
          RECURSOS ESTIMADOS PARA EL SERVICIO
        </th>
      </tr>
      <tr>
        <td colSpan={6} className="p-0 align-top">
          <table className="w-full border-collapse [&_td]:border [&_td]:border-black [&_th]:border [&_th]:border-black">
            <tbody>
              <tr>
                <td className="w-1/4 align-top p-1">
                  <table className="w-full border-collapse [&_td]:border [&_td]:border-black [&_th]:border [&_th]:border-black">
                    <tbody>
                      <tr>
                        <th
                          colSpan={3}
                          className="bg-slate-100 osi-label-md px-1 py-0.5"
                        >
                          DÍAS POR SERVICIO / ESPECIALISTAS
                        </th>
                      </tr>
                      <tr>
                        <th className="osi-label-sm">DÍAS CAMPO</th>
                        <th className="osi-label-sm">DÍAS INFORME</th>
                        <th className="osi-label-sm">ANALISTAS/REC.</th>
                      </tr>
                      <tr>
                        <td className="osi-doc-value text-center">
                          {slice.stDiasCampo || "N/A"}
                        </td>
                        <td className="osi-doc-value text-center">
                          {slice.stDiasInforme || "N/A"}
                        </td>
                        <td className="osi-doc-value text-center">
                          {slice.stAnalistas || "N/A"}
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
                          className="bg-slate-100 osi-label-md px-1 py-0.5"
                        >
                          HOSPEDAJE
                        </th>
                      </tr>
                      <tr>
                        <th className="osi-label-sm">DÍAS</th>
                        <th className="osi-label-sm">$/DÍA</th>
                        <th className="osi-label-sm">TOTAL</th>
                      </tr>
                      <tr>
                        <td className="osi-doc-value text-center">
                          {dias_hospedaje > 0 ? String(dias_hospedaje) : "N/A"}
                        </td>
                        <td className="osi-doc-value text-center">
                          {costo_hospedaje_view > 0
                            ? `$${costo_hospedaje_view.toFixed(2)}`
                            : "N/A"}
                        </td>
                        <td className="osi-doc-value text-center">
                          {st_totals.total_hospedaje > 0
                            ? `$${st_totals.total_hospedaje.toFixed(2)}`
                            : "N/A"}
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
                          colSpan={6}
                          className="bg-slate-100 osi-label-md px-1 py-0.5"
                        >
                          LOGÍSTICA / COMIDA
                        </th>
                      </tr>
                      <tr>
                        <th className="osi-label-sm">DÍAS</th>
                        <th className="osi-label-sm">REC.</th>
                        <th className="osi-label-sm">$/DÍA</th>
                        <th className="osi-label-sm">TOTAL</th>
                      </tr>
                      <tr>
                        <td className="osi-doc-value text-center">
                          {dias_logistica > 0 ? String(dias_logistica) : "N/A"}
                        </td>
                        <td className="osi-doc-value text-center">
                          {(slice.stLogisticaRecursos ?? slice.stAnalistas ?? 0) >
                          0
                            ? String(
                                slice.stLogisticaRecursos ?? slice.stAnalistas,
                              )
                            : "N/A"}
                        </td>
                        <td className="osi-doc-value text-center">
                          {costo_logistica_view > 0
                            ? `$${costo_logistica_view.toFixed(2)}`
                            : "N/A"}
                        </td>
                        <td className="osi-doc-value text-center font-semibold">
                          {st_totals.total_logistica > 0
                            ? `$${st_totals.total_logistica.toFixed(2)}`
                            : "N/A"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
                <td className="w-1/4 align-top p-1">
                  <table className="w-full border-collapse [&_td]:border [&_td]:border-black [&_th]:border [&_th]:border-black">
                    <tbody>
                      <tr>
                        <th className="bg-slate-100 osi-label-md px-1 py-0.5">
                          IMPRESIÓN DE MATERIAL
                        </th>
                      </tr>
                      <tr>
                        <td className="osi-doc-value text-center font-bold py-1">
                          {format_osi_si_no(impresion_si)}
                        </td>
                      </tr>
                      <tr>
                        <td className="osi-doc-value text-center">
                          {format_money_or_dash(
                            costo_impresion_material_view,
                            impresion_mask_hidden,
                          )}
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
                          className="bg-slate-100 osi-label-md px-1 py-0.5"
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
                                className="osi-label-sm font-normal"
                              >
                                {OSI_ST_TRASLADO_LABELS[traslado.tipo]}
                              </th>
                            </tr>
                            <tr>
                              <th className="osi-label-sm">CANT.</th>
                              <th className="osi-label-sm">$/U</th>
                              <th className="osi-label-sm">TOTAL</th>
                            </tr>
                            <tr>
                              <td className="osi-doc-value text-center">
                                {traslado.cantidad > 0
                                  ? String(traslado.cantidad)
                                  : "N/A"}
                              </td>
                              <td className="osi-doc-value text-center">
                                {!traslado_mask && traslado.costo_unidad > 0
                                  ? `$${traslado.costo_unidad.toFixed(2)}`
                                  : "N/A"}
                              </td>
                              <td className="osi-doc-value text-center font-semibold">
                                {!traslado_mask &&
                                traslado.cantidad * traslado.costo_unidad > 0
                                  ? `$${(
                                      traslado.cantidad * traslado.costo_unidad
                                    ).toFixed(2)}`
                                  : "N/A"}
                              </td>
                            </tr>
                          </Fragment>
                        ))
                      ) : (
                        <>
                          <tr>
                            <th className="osi-label-sm">URBANO</th>
                            <th className="osi-label-sm" colSpan={2}>
                              EXTERNOS
                            </th>
                          </tr>
                          <tr>
                            <td className="osi-doc-value text-center">
                              {st_traslado_total > 0
                                ? `$${st_traslado_total.toFixed(2)}`
                                : "N/A"}
                            </td>
                            <td className="osi-doc-value text-center" colSpan={2}>
                              {st_traslado_externo_total > 0
                                ? `$${st_traslado_externo_total.toFixed(2)}`
                                : "N/A"}
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
                        <th
                          colSpan={2}
                          className="bg-slate-100 osi-label-md px-1 py-0.5"
                        >
                          ENVÍOS
                        </th>
                      </tr>
                      <tr>
                        <th className="osi-label-sm">FACTURA</th>
                        <th className="osi-label-sm">MATERIALES</th>
                      </tr>
                      <tr>
                        <td className="osi-doc-value text-center py-1">
                          {st_envio_factura_view > 0
                            ? `$${Number(st_envio_factura_view).toFixed(2)}`
                            : "N/A"}
                        </td>
                        <td className="osi-doc-value text-center py-1">
                          {st_envio_materiales_view > 0
                            ? `$${Number(st_envio_materiales_view).toFixed(2)}`
                            : "N/A"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
                <td className="align-top p-1" colSpan={2}>
                  <table className="w-full border-collapse [&_td]:border [&_td]:border-black [&_th]:border [&_th]:border-black">
                    <tbody>
                      <tr>
                        <th className="bg-slate-100 osi-label-md px-1 py-0.5">
                          OTROS
                        </th>
                      </tr>
                      <tr>
                        <td className="osi-doc-value text-center py-1">
                          {format_money_or_dash(
                            costo_otros_view,
                            otros_mask_hidden,
                          )}
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
  );
}

export function build_layout_from_preview(
  data: OsiPreviewData,
): OsiRecursosLayout {
  return build_osi_recursos_layout(data);
}
