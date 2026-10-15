"use client";

import { NumberInput } from "@/components/ui/number-input";
import type { OSIFixedItem } from "@/types/requisiciones";
import { osi_fixed_line_total } from "@/lib/requisicion-osi-clone";

export function ReqAltaOsiBlock({
  fi,
  item_start,
  edit,
  on_patch,
}: {
  fi: OSIFixedItem;
  item_start: number;
  edit: boolean;
  on_patch: (updates: Partial<OSIFixedItem>) => void;
}) {
  const traslado =
    Number(fi.dias_traslado || 0) * Number(fi.costo_traslado || 0);
  const sub = osi_fixed_line_total(fi);
  const cols = edit ? 7 : 6;
  return (
    <>
      <tr className="border-b border-gray-300 bg-blue-100/60">
        <td colSpan={cols} className="p-2 text-xs font-bold text-blue-800">
          OSI: {fi.nro_osi || `#${fi.id_osi}`}
        </td>
      </tr>
      <tr className="border-b border-gray-300">
        <td className="border-r border-gray-300 p-2 text-center font-bold">
          {item_start}
        </td>
        <td className="border-r border-gray-300 p-2 text-center font-bold">T</td>
        <td className="border-r border-gray-300 p-2" />
        <td className="border-r border-gray-300 p-2">
          <div className="flex flex-wrap items-center gap-2">
            {edit ? (
              <NumberInput
                value={fi.dias_traslado || 0}
                allowDecimal={false}
                min={0}
                className="h-6 w-12 border-gray-300 p-1 text-center"
                onValueChange={(v) => on_patch({ dias_traslado: v })}
              />
            ) : (
              <span className="font-bold">{fi.dias_traslado || 0}</span>
            )}
            <span className="text-[10px] font-medium uppercase">
              DÍAS DE TRASL. COSTO X C/U $
            </span>
            {edit ? (
              <NumberInput
                value={fi.costo_traslado || 0}
                allowDecimal
                min={0}
                className="h-6 w-20 border-gray-300 p-1 font-bold"
                onValueChange={(v) => on_patch({ costo_traslado: v })}
              />
            ) : (
              <span className="font-bold">
                {(fi.costo_traslado || 0).toFixed(2)}
              </span>
            )}
          </div>
        </td>
        <td className="border-r border-gray-300 p-2 text-center font-bold">
          ${traslado.toFixed(2)}
        </td>
        <td className="p-2" />
        {edit ? <td /> : null}
      </tr>
      <tr className="border-b border-gray-300">
        <td className="border-r border-gray-300 p-2 text-center font-bold">
          {item_start + 1}
        </td>
        <td className="border-r border-gray-300 p-2 text-center font-bold">I</td>
        <td className="border-r border-gray-300 p-2" />
        <td className="border-r border-gray-300 p-2 uppercase">IMPRESIÓN TOTAL $</td>
        <td className="border-r border-gray-300 p-2 text-center font-bold">
          {edit ? (
            <NumberInput
              value={fi.impresion_total || 0}
              allowDecimal
              min={0}
              className="h-6 w-24 border-gray-300 p-1 text-center font-bold"
              onValueChange={(v) => on_patch({ impresion_total: v })}
            />
          ) : (
            `$${(fi.impresion_total || 0).toFixed(2)}`
          )}
        </td>
        <td className="p-2" />
        {edit ? <td /> : null}
      </tr>
      <tr className="border-b border-gray-300">
        <td className="border-r border-gray-300 p-2 text-center font-bold">
          {item_start + 2}
        </td>
        <td className="border-r border-gray-300 p-2 text-center font-bold">H</td>
        <td className="border-r border-gray-300 p-2" />
        <td className="border-r border-gray-300 p-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium uppercase">HONORARIOS $</span>
            {edit ? (
              <NumberInput
                value={fi.honorarios_costo_hora || 0}
                allowDecimal
                min={0}
                className="h-6 w-20 border-gray-300 p-1 font-bold"
                onValueChange={(v) =>
                  on_patch({ honorarios_costo_hora: v })
                }
              />
            ) : (
              <span className="font-bold">
                ${(fi.honorarios_costo_hora || 0).toFixed(2)}
              </span>
            )}
            <span className="font-medium uppercase">, POR HORAS</span>
            {edit ? (
              <NumberInput
                value={fi.honorarios_horas || 0}
                allowDecimal
                min={0}
                className="h-6 w-12 border-gray-300 p-1 text-center"
                onValueChange={(v) => on_patch({ honorarios_horas: v })}
              />
            ) : (
              <span className="font-bold">{fi.honorarios_horas || 0}</span>
            )}
          </div>
        </td>
        <td className="border-r border-gray-300 p-2 text-center font-bold">
          ${(fi.honorarios_total || 0).toFixed(2)}
        </td>
        <td className="p-2" />
        {edit ? <td /> : null}
      </tr>
      <tr className="border-b border-gray-300">
        <td className="border-r border-gray-300 p-2 text-center font-bold">
          {item_start + 3}
        </td>
        <td className="border-r border-gray-300 p-2 text-center font-bold">IF</td>
        <td className="border-r border-gray-300 p-2" />
        <td className="border-r border-gray-300 p-2 uppercase">INFORME FINAL $</td>
        <td className="border-r border-gray-300 p-2 text-center font-bold">
          {edit ? (
            <NumberInput
              value={fi.informe_final_total || 0}
              allowDecimal
              min={0}
              className="h-6 w-24 border-gray-300 p-1 text-center font-bold"
              onValueChange={(v) => on_patch({ informe_final_total: v })}
            />
          ) : (
            `$${(fi.informe_final_total || 0).toFixed(2)}`
          )}
        </td>
        <td className="p-2" />
        {edit ? <td /> : null}
      </tr>
      <tr className="border-b border-gray-300 bg-gray-50">
        <td colSpan={4} className="p-2 text-right text-[10px] font-bold uppercase">
          Subtotal OSI {fi.nro_osi}:
        </td>
        <td className="border-r border-gray-300 p-2 text-center font-bold">
          ${sub.toFixed(2)}
        </td>
        <td className="bg-yellow-50 p-2 text-center font-bold">${sub.toFixed(2)}</td>
        {edit ? <td /> : null}
      </tr>
    </>
  );
}
