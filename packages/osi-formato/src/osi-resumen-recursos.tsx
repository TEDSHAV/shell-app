"use client";

import type { OsiRecursosLayout } from "./osi-recursos-layout";

function money_cell(value: number, hidden?: boolean): string {
  if (hidden || !(value > 0)) return "N/A";
  return `$${value.toFixed(2)}`;
}

/**
 * Clean master resumen for per-session mode — totals only, no "ver abajo".
 */
export function OsiResumenRecursosConsolidado({
  layout,
  is_hidden,
  section_header_class,
  is_capacitacion,
}: {
  layout: OsiRecursosLayout;
  is_hidden: (key: string) => boolean;
  section_header_class: string;
  is_capacitacion: boolean;
}) {
  const t = layout.totales;
  const c = layout.consolidado;
  const gran_total =
    layout.variacionTotales.total_sesion ??
    t.honorarios +
      t.impresion +
      t.traslado +
      t.traslado_externo +
      t.logistica +
      t.hospedaje +
      t.otros +
      t.st_envios +
      t.st_traslados;

  if (is_capacitacion) {
    return (
      <>
        <tr>
          <th colSpan={4} className={section_header_class}>
            RESUMEN DE RECURSOS DEL SERVICIO
          </th>
        </tr>
        <tr>
          <th className="osi-label-md leading-tight">HONORARIOS</th>
          <th className="osi-label-md leading-tight">IMPRESIÓN DE MATERIAL</th>
          <th className="osi-label-md leading-tight">TRASLADO</th>
          <th className="osi-label-md leading-tight">
            CERTIFICADO / CARNET / POP
          </th>
        </tr>
        <tr>
          <td className="text-center h-9 text-[11px] font-semibold tabular-nums">
            {money_cell(t.honorarios, is_hidden("honorarios_unit_cost"))}
          </td>
          <td className="text-center h-9 text-[11px] font-semibold tabular-nums">
            {money_cell(
              t.impresion,
              is_hidden("costo_impresion_material"),
            )}
          </td>
          <td className="text-center h-9 text-[11px] font-semibold tabular-nums">
            {money_cell(
              t.traslado + t.traslado_externo,
              is_hidden("costo_traslado") && is_hidden("traslado_externo"),
            )}
          </td>
          <td className="p-0 align-top">
            <table className="w-full table-fixed border-collapse">
              <colgroup>
                <col className="w-1/3" />
                <col className="w-1/3" />
                <col className="w-1/3" />
              </colgroup>
              <tbody>
                <tr>
                  <td className="text-center h-9 text-[10px] font-bold border-r border-black">
                    {c.certificadoImpreso ? "SÍ" : "NO"}
                  </td>
                  <td className="text-center h-9 text-[10px] font-bold border-r border-black">
                    {c.carnetImpreso ? "SÍ" : "NO"}
                  </td>
                  <td className="text-center h-9 text-[10px] font-bold">
                    {c.popIncluido ? "SÍ" : "NO"}
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
        <tr>
          <th className="osi-label-md leading-tight">LOGÍSTICA</th>
          <th className="osi-label-md leading-tight">HOSPEDAJE</th>
          <th className="osi-label-md leading-tight">OTROS</th>
          <th className="osi-label-md leading-tight bg-slate-100">
            TOTAL OSI
          </th>
        </tr>
        <tr>
          <td className="text-center h-9 text-[11px] font-semibold tabular-nums">
            {money_cell(t.logistica, is_hidden("logistica_unit_cost"))}
          </td>
          <td className="text-center h-9 text-[11px] font-semibold tabular-nums">
            {money_cell(t.hospedaje, is_hidden("hospedaje_unit_cost"))}
          </td>
          <td className="text-center h-9 text-[11px] font-semibold tabular-nums">
            {money_cell(t.otros, is_hidden("costo_otros"))}
          </td>
          <td className="text-center h-9 text-[12px] font-bold tabular-nums bg-slate-50">
            {money_cell(gran_total)}
          </td>
        </tr>
      </>
    );
  }

  return (
    <>
      <tr>
        <th colSpan={4} className={section_header_class}>
          RESUMEN DE RECURSOS DEL SERVICIO
        </th>
      </tr>
      <tr>
        <th className="osi-label-md leading-tight">HOSPEDAJE</th>
        <th className="osi-label-md leading-tight">LOGÍSTICA</th>
        <th className="osi-label-md leading-tight">IMPRESIÓN / TRASLADOS</th>
        <th className="osi-label-md leading-tight bg-slate-100">TOTAL OSI</th>
      </tr>
      <tr>
        <td className="text-center h-9 text-[11px] font-semibold tabular-nums">
          {money_cell(t.hospedaje, is_hidden("hospedaje_unit_cost"))}
        </td>
        <td className="text-center h-9 text-[11px] font-semibold tabular-nums">
          {money_cell(t.logistica, is_hidden("logistica_unit_cost"))}
        </td>
        <td className="text-center h-9 text-[11px] font-semibold tabular-nums">
          {money_cell(
            t.impresion + t.st_traslados,
            is_hidden("costo_impresion_material") &&
              is_hidden("costo_traslado"),
          )}
        </td>
        <td className="text-center h-9 text-[12px] font-bold tabular-nums bg-slate-50">
          {money_cell(gran_total)}
        </td>
      </tr>
      <tr>
        <th className="osi-label-md leading-tight" colSpan={2}>
          ENVÍOS
        </th>
        <th className="osi-label-md leading-tight" colSpan={2}>
          OTROS
        </th>
      </tr>
      <tr>
        <td
          className="text-center h-9 text-[11px] font-semibold tabular-nums"
          colSpan={2}
        >
          {money_cell(
            t.st_envios,
            is_hidden("st_envio_factura") && is_hidden("st_envio_materiales"),
          )}
        </td>
        <td
          className="text-center h-9 text-[11px] font-semibold tabular-nums"
          colSpan={2}
        >
          {money_cell(t.otros, is_hidden("costo_otros"))}
        </td>
      </tr>
    </>
  );
}
