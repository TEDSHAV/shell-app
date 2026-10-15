"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { list_catalogo_pedido_action } from "@/actions/req-lineas";
import type { CajonPedido, CatalogAmbitoPedido } from "../../lib/req-destino";
import type { CatalogoPedidoItem } from "../../lib/req-sugerir-reposicion";

export function ReqDescripcionCombo({
  value,
  cajon,
  ambito,
  id_departamento,
  departamento_nombre,
  disabled,
  on_text,
  on_pick,
}: {
  value: string;
  cajon: CajonPedido;
  ambito: CatalogAmbitoPedido;
  id_departamento?: number | null;
  departamento_nombre?: string | null;
  disabled?: boolean;
  on_text: (nombre: string) => void;
  on_pick: (item: CatalogoPedidoItem) => void;
}) {
  const [items, setItems] = useState<CatalogoPedidoItem[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    list_catalogo_pedido_action(
      cajon,
      ambito,
      id_departamento,
      departamento_nombre,
    ).then((rows) => {
      if (alive) setItems(rows);
    });
    return () => {
      alive = false;
    };
  }, [cajon, ambito, id_departamento, departamento_nombre]);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return items.slice(0, 8);
    return items
      .filter((row) => row.nombre_item.toLowerCase().includes(q))
      .slice(0, 8);
  }, [items, value]);

  return (
    <div className="relative">
      <Input
        className="h-6 w-full border-gray-300 p-1 uppercase"
        value={value}
        disabled={disabled}
        placeholder="Escriba o elija del catálogo…"
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          on_text(e.target.value);
          setOpen(true);
        }}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 150);
        }}
      />
      {open && !disabled && filtered.length > 0 ? (
        <div className="absolute z-40 mt-0.5 max-h-40 w-full overflow-y-auto rounded border border-gray-300 bg-white shadow">
          {filtered.map((row) => (
            <button
              key={row.id}
              type="button"
              className="flex w-full items-start justify-between gap-2 px-2 py-1 text-left text-[11px] hover:bg-blue-50"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                on_pick(row);
                setOpen(false);
              }}
            >
              <span className="font-medium uppercase">{row.nombre_item}</span>
              <span className="shrink-0 text-gray-500">
                {Number(row.costo_unitario_base || 0).toFixed(2)}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
