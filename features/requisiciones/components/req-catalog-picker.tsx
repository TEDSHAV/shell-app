"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { list_catalogo_pedido_action } from "@/actions/req-lineas";
import type { CajonPedido, CatalogAmbitoPedido } from "../lib/req-destino";
import type { CatalogoPedidoItem } from "../lib/req-sugerir-reposicion";

export function ReqCatalogPicker({
  cajon,
  ambito,
  disabled,
  on_pick,
}: {
  cajon: CajonPedido;
  ambito: CatalogAmbitoPedido;
  disabled?: boolean;
  on_pick: (item: CatalogoPedidoItem) => void;
}) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<CatalogoPedidoItem[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    list_catalogo_pedido_action(cajon, ambito).then((rows) => {
      if (alive) setItems(rows);
    });
    return () => {
      alive = false;
    };
  }, [cajon, ambito]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 12);
    return items
      .filter((row) => row.nombre_item.toLowerCase().includes(q))
      .slice(0, 12);
  }, [items, query]);

  return (
    <div className="relative">
      <Input
        value={query}
        disabled={disabled}
        placeholder="Buscar en catálogo…"
        className="h-8 text-xs"
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-40 mt-1 max-h-48 w-full overflow-y-auto rounded border border-gray-300 bg-white shadow">
          {filtered.map((row) => (
            <button
              key={row.id}
              type="button"
              className="flex w-full items-start justify-between gap-2 px-2 py-1.5 text-left text-xs hover:bg-blue-50"
              onClick={() => {
                on_pick(row);
                setQuery("");
                setOpen(false);
              }}
            >
              <span className="font-medium">{row.nombre_item}</span>
              <span className="shrink-0 text-gray-500">
                {Number(row.costo_unitario_base || 0).toFixed(2)}
              </span>
            </button>
          ))}
        </div>
      )}
      {open && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-1 h-6 px-1 text-[10px]"
          onClick={() => setOpen(false)}
        >
          Cerrar lista
        </Button>
      )}
    </div>
  );
}
