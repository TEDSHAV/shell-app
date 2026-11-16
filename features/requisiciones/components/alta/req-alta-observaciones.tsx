"use client";

import { Textarea } from "@/components/ui/textarea";

/**
 * Observaciones de la requisición: opcionales y distintas de la justificación del extra (esa solo sirve
 * para el control de costos). Se escriben en el paso Pedido y en Revisar solo se leen.
 */
export function ReqAltaObservaciones({
  modo,
  value,
  on_change,
}: {
  modo: "editar" | "ver";
  value: string;
  on_change?: (value: string) => void;
}) {
  return (
    <div className="border-t border-gray-300 text-xs">
      <div className="border-b border-gray-300 bg-gray-200 py-1 text-center text-sm font-bold uppercase">
        Observaciones
        {modo === "editar" ? (
          <span className="ml-1 text-[10px] font-normal normal-case text-gray-500">
            (opcional)
          </span>
        ) : null}
      </div>
      {modo === "editar" ? (
        <div className="p-2">
          <Textarea
            value={value}
            onChange={(event) => on_change?.(event.target.value)}
            className="min-h-[64px] border-gray-300 text-xs"
            placeholder="Cualquier nota para quien revisa o procesa esta requisición."
          />
        </div>
      ) : (
        <p className="m-0 whitespace-pre-wrap p-3 uppercase">
          {value.trim() || "Sin observaciones"}
        </p>
      )}
    </div>
  );
}
