"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { CatalogoPedidoItem } from "../lib/req-sugerir-reposicion";
import { linea_total, type ReqLineaDraft } from "../lib/req-lineas-types";
import { ReqLineasEditor } from "./req-lineas-editor";
import type { CatalogAmbitoPedido } from "../lib/req-destino";

export function ReqWizardHermana({
  open,
  suggested,
  ambito,
  lineas,
  confirmed,
  disabled,
  on_confirmed,
  on_lineas,
  on_skip,
}: {
  open: boolean;
  suggested: CatalogoPedidoItem[];
  ambito: CatalogAmbitoPedido;
  lineas: ReqLineaDraft[];
  confirmed: boolean;
  disabled?: boolean;
  on_confirmed: (value: boolean) => void;
  on_lineas: (next: ReqLineaDraft[]) => void;
  on_skip: () => void;
}) {
  if (!open) return null;

  const names = suggested.map((row) => row.nombre_item).join(", ");
  const total = lineas.reduce((sum, row) => sum + linea_total(row), 0);

  return (
    <div className="mx-3 mb-3 rounded border border-amber-300 bg-amber-50 p-3 space-y-2">
      <p className="text-sm font-bold">Reposición de inventario</p>
      <p className="text-xs text-gray-700">
        Esta OSI puede necesitar reponer
        {names ? ` ${names}` : " ítems de inventario del mismo ámbito"}.
        ¿Solicitar reposición ahora? Se crea un segundo documento (hermana),
        sin cargar el curso.
      </p>
      <label className="flex items-center gap-2 text-xs font-medium">
        <Checkbox
          checked={confirmed}
          disabled={disabled}
          onCheckedChange={(v) => on_confirmed(v === true)}
        />
        Sí, enviar también la req de reposición
      </label>
      {confirmed ? (
        <>
          <ReqLineasEditor
            cajon="inventario"
            ambito={ambito}
            lineas={lineas}
            disabled={disabled}
            on_change={on_lineas}
          />
          <p className="text-xs font-bold">Total reposición: {total.toFixed(2)}</p>
        </>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={on_skip}
        >
          Solo el documento del curso
        </Button>
      )}
    </div>
  );
}
