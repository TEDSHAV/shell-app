"use client";

import { useEffect, useState } from "react";
import { Package, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NumberInput } from "@/components/ui/number-input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  get_depositos_ui_access_action,
  lookup_stock_for_items_action,
  registrar_salida_stock_action,
} from "@/actions/req-stock";
import {
  STOCK_NIVEL_CLASS,
  STOCK_NIVEL_LABEL,
  stock_nivel,
} from "../../lib/req-stock-status";
import type { ReqDeposito } from "../../lib/req-stock-types";
import type { ReqLineaDraft } from "../../lib/req-lineas-types";
import { cn } from "@/lib/utils";

type StockHit = {
  id_stock: number;
  id_item_costo: number;
  cantidad: number;
  minimo: number;
  unidad: string | null;
  nombre_item: string;
};

export function ReqAltaStockAnalisis({
  open,
  on_open_change,
  deposito,
  id_departamento,
  lineas,
}: {
  open: boolean;
  on_open_change: (open: boolean) => void;
  deposito: ReqDeposito;
  id_departamento?: number | null;
  lineas: ReqLineaDraft[];
}) {
  const [hits, setHits] = useState<StockHit[]>([]);
  const [canConsume, setCanConsume] = useState(false);
  const [busy, setBusy] = useState(false);
  const [qty, setQty] = useState<Record<number, number>>({});

  const ids = lineas
    .map((row) => row.id_item_costo)
    .filter((id): id is number => typeof id === "number" && id > 0);

  useEffect(() => {
    if (!open) return;
    void get_depositos_ui_access_action().then((access) =>
      setCanConsume(access.can_consume),
    );
  }, [open]);

  useEffect(() => {
    if (!open || ids.length === 0) {
      setHits([]);
      return;
    }
    void lookup_stock_for_items_action({
      ids_item: ids,
      deposito,
      id_departamento,
    }).then(setHits);
  }, [open, deposito, id_departamento, ids.join(",")]);

  async function consume(hit: StockHit, agotar: boolean) {
    const cantidad = agotar
      ? hit.cantidad
      : Number(qty[hit.id_stock] ?? 0);
    if (!(cantidad > 0)) {
      window.alert("Indique una cantidad mayor a 0.");
      return;
    }
    setBusy(true);
    const res = await registrar_salida_stock_action({
      id_stock: hit.id_stock,
      tipo: "gastado",
      cantidad,
      notas: agotar ? "Marcado agotado desde alta" : "Consumo desde alta",
    });
    setBusy(false);
    if (!res.ok) {
      window.alert(res.error || "No se pudo registrar.");
      return;
    }
    const next = await lookup_stock_for_items_action({
      ids_item: ids,
      deposito,
      id_departamento,
    });
    setHits(next);
  }

  return (
    <div className="rounded-xl border border-sky-100 bg-sky-50/40 p-3">
      <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-800">
        <Checkbox
          checked={open}
          onCheckedChange={(state) => on_open_change(state === true)}
        />
        Analizar stock actual (abastecimiento)
      </label>
      <p className="mt-1 text-xs text-slate-500">
        Ve cuánto hay disponible antes de pedir. Si tienes permiso, puedes
        registrar consumo o marcar agotado.
      </p>

      {open ? (
        <div className="mt-3 space-y-2">
          {ids.length === 0 ? (
            <p className="text-xs text-slate-500">
              Agrega ítems del catálogo para ver el stock.
            </p>
          ) : hits.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
              Aún no hay stock registrado para estos ítems en este inventario.
            </p>
          ) : (
            hits.map((hit) => {
              const nivel = stock_nivel(hit.cantidad, hit.minimo);
              return (
                <div
                  key={hit.id_stock}
                  className="rounded-lg border border-white bg-white px-3 py-2 text-sm shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 font-medium text-slate-900">
                        <Package className="h-3.5 w-3.5 text-slate-400" />
                        {hit.nombre_item}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Disponible{" "}
                        <span className="font-semibold text-slate-800">
                          {hit.cantidad.toFixed(2)} {hit.unidad || ""}
                        </span>
                        {" · "}
                        mínimo {hit.minimo.toFixed(2)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                        STOCK_NIVEL_CLASS[nivel],
                      )}
                    >
                      {nivel !== "en_stock" ? (
                        <AlertTriangle className="h-3 w-3" />
                      ) : null}
                      {STOCK_NIVEL_LABEL[nivel]}
                    </span>
                  </div>
                  {canConsume && hit.cantidad > 0 ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <NumberInput
                        value={qty[hit.id_stock] ?? 1}
                        min={0.001}
                        max={hit.cantidad}
                        className="h-7 w-24 text-xs"
                        onValueChange={(n) =>
                          setQty((prev) => ({ ...prev, [hit.id_stock]: n }))
                        }
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        className="h-7 text-xs"
                        onClick={() => void consume(hit, false)}
                      >
                        Registrar consumo
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        className="h-7 text-xs text-rose-700"
                        onClick={() => void consume(hit, true)}
                      >
                        Marcar agotado
                      </Button>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
