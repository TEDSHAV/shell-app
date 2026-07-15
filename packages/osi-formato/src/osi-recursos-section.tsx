"use client";

import { Fragment } from "react";
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
}: {
  layout: OsiRecursosLayout;
  section_header_class: string;
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
        <th colSpan={4} className={section_header_class}>
          DESGLOSE DIARIO POR SESIÓN
        </th>
      </tr>
      <tr>
        <td colSpan={4} className="!text-left align-top p-1 overflow-x-auto">
          <OsiRecursosVariacionesTable layout={layout} />
        </td>
      </tr>
    </>
  );
}

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
        <OsiRecursosVariacionesRows
          layout={layout}
          section_header_class={section_header_class}
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
        <th colSpan={4} className={section_header_class}>
          RECURSOS ESTIMADOS PARA EL SERVICIO
        </th>
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
                <th className="osi-label-sm osi-th-nowrap px-0.5 py-0.5 leading-tight">
                  COSTO/H
                </th>
                <th className="osi-label-sm px-0.5 py-0.5 leading-tight">
                  TOTAL
                  <br />
                  HON.
                </th>
              </tr>
              <tr>
                <td className="text-center h-8 font-bold text-[10px]">
                  {horas_view > 0 ? String(horas_view) : "—"}
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
          {format_money_or_dash(
            costo_impresion_material_view,
            impresion_mask_hidden,
          )}
        </td>
        <td className="text-center h-8">
          {format_money_or_dash(costo_traslado_view, traslado_mask_hidden)}
        </td>
        <td className="text-center h-8">
          {format_money_or_dash(
            traslado_externo_view,
            traslado_ext_mask_hidden,
          )}
        </td>
      </tr>
      <tr>
        <th className="w-[26%] osi-label-md leading-tight">LOGÍSTICA</th>
        <th className="w-[26%] osi-label-md leading-tight">HOSPEDAJE</th>
        <th className="w-[12%] osi-label-md leading-tight">OTROS</th>
        <th className="w-[36%] osi-label-md leading-tight">
          CERTIFICADO / CARNET / POP
        </th>
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
                  {dias_logistica > 0 ? String(dias_logistica) : "—"}
                </td>
                <td className="text-center h-8 text-[10px]">
                  {costo_logistica_view > 0
                    ? `$${costo_logistica_view.toFixed(2)}`
                    : "—"}
                </td>
                <td className="text-center h-8 font-semibold text-[10px]">
                  {logistica_total > 0 ? `$${logistica_total.toFixed(2)}` : "—"}
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
                  {dias_hospedaje > 0 ? String(dias_hospedaje) : "—"}
                </td>
                <td className="text-center h-8 text-[10px]">
                  {costo_hospedaje_view > 0
                    ? `$${costo_hospedaje_view.toFixed(2)}`
                    : "—"}
                </td>
                <td className="text-center h-8 font-semibold text-[10px]">
                  {hospedaje_total > 0 ? `$${hospedaje_total.toFixed(2)}` : "—"}
                </td>
              </tr>
            </tbody>
          </table>
        </td>
        <td className="w-[12%] text-center h-8 align-middle">
          {format_money_or_dash(costo_otros_view, otros_mask_hidden)}
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
                  {slice.certificadoImpreso ? "SÍ" : "NO"}
                </td>
                <td className="text-center h-8 font-bold border-r border-black">
                  {slice.carnetImpreso ? "SÍ" : "NO"}
                </td>
                <td className="text-center h-8 font-bold">
                  {slice.popIncluido ? "SÍ" : "NO"}
                </td>
              </tr>
            </tbody>
          </table>
        </td>
      </tr>
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
                          {slice.stDiasCampo || "—"}
                        </td>
                        <td className="text-center text-[9px]">
                          {slice.stDiasInforme || "—"}
                        </td>
                        <td className="text-center text-[9px]">
                          {slice.stAnalistas || "—"}
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
                        <td className="text-center text-[9px]">
                          {st_totals.total_hospedaje > 0
                            ? `$${st_totals.total_hospedaje.toFixed(2)}`
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
                          {(slice.stLogisticaRecursos ?? slice.stAnalistas ?? 0) >
                          0
                            ? String(
                                slice.stLogisticaRecursos ?? slice.stAnalistas,
                              )
                            : "—"}
                        </td>
                        <td className="text-center text-[9px]">
                          {costo_logistica_view > 0
                            ? `$${costo_logistica_view.toFixed(2)}`
                            : "—"}
                        </td>
                        <td className="text-center font-semibold text-[9px]">
                          {st_totals.total_logistica > 0
                            ? `$${st_totals.total_logistica.toFixed(2)}`
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
                      <tr>
                        <td className="text-center text-[9px]">
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
                                {!traslado_mask && traslado.costo_unidad > 0
                                  ? `$${traslado.costo_unidad.toFixed(2)}`
                                  : "—"}
                              </td>
                              <td className="text-center font-semibold text-[9px]">
                                {!traslado_mask &&
                                traslado.cantidad * traslado.costo_unidad > 0
                                  ? `$${(
                                      traslado.cantidad * traslado.costo_unidad
                                    ).toFixed(2)}`
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
                            <td className="text-center text-[9px]" colSpan={2}>
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
                        <th
                          colSpan={2}
                          className="bg-slate-100 text-[9px] px-1 py-0.5"
                        >
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
                <td className="align-top p-1" colSpan={2}>
                  <table className="w-full border-collapse [&_td]:border [&_td]:border-black [&_th]:border [&_th]:border-black">
                    <tbody>
                      <tr>
                        <th className="bg-slate-100 text-[9px] px-1 py-0.5">
                          OTROS
                        </th>
                      </tr>
                      <tr>
                        <td className="text-center text-[9px] py-1">
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
