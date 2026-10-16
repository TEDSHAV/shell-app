"use client";

import { cn } from "@/lib/utils";
import type { InvExcelUnidad } from "../../actions/import-inv-excel";

/**
 * Unidades del catálogo (mismo clasificador). Inventario → «Unidad»;
 * Hora/Sesión/Día/etc. van como servicios/costos.
 */
export function InvExcelUnidadSelect({
  unidades,
  value,
  on_change,
  className,
  allow_none = true,
  hint = true,
}: {
  unidades: InvExcelUnidad[];
  value: number | null;
  on_change: (value: number | null) => void;
  className?: string;
  allow_none?: boolean;
  hint?: boolean;
}) {
  const stock = unidades.filter((unit) => unit.kind === "stock");
  const servicio = unidades.filter((unit) => unit.kind === "servicio");

  return (
    <div className="space-y-1">
      <select
        value={value == null ? "none" : String(value)}
        onChange={(event) => {
          const raw = event.target.value;
          on_change(raw === "none" ? null : Number(raw));
        }}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm",
          className,
        )}
      >
        {allow_none ? <option value="none">Sin unidad</option> : null}
        {stock.length > 0 ? (
          <optgroup label="Inventario (recomendado)">
            {stock.map((unit) => (
              <option key={unit.id} value={String(unit.id)}>
                {unit.label}
              </option>
            ))}
          </optgroup>
        ) : null}
        {servicio.length > 0 ? (
          <optgroup label="Servicios / costos">
            {servicio.map((unit) => (
              <option key={unit.id} value={String(unit.id)}>
                {unit.label}
              </option>
            ))}
          </optgroup>
        ) : null}
      </select>
      {hint ? (
        <p className="text-[11px] text-gray-500">
          Inventario casi siempre = Unidad. Hora, Sesión, Día, etc. son de
          servicios/costos (mismo clasificador del catálogo).
        </p>
      ) : null}
    </div>
  );
}
