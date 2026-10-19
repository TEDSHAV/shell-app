"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Minus, Package, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  get_depositos_ui_access_action,
  lookup_stock_for_items_action,
  registrar_salida_stock_action,
} from "@/actions/req-stock";
import { stock_nivel } from "../../lib/req-stock-status";
import { DEPOSITO_LABEL, type ReqDeposito } from "../../lib/req-stock-types";
import type { ReqLineaDraft } from "../../lib/req-lineas-types";
import { StockNivelBadge } from "../depositos/req-stock-ui";

type StockHit = {
  id_stock: number;
  id_item_costo: number;
  cantidad: number;
  minimo: number;
  unidad: string | null;
  nombre_item: string;
  deposito: ReqDeposito;
  departamento: string | null;
};

function req_qty_for_item(lineas: ReqLineaDraft[], id_item: number): number {
  return lineas
    .filter((row) => row.id_item_costo === id_item)
    .reduce((sum, row) => sum + Number(row.cantidad || 0), 0);
}

function bump_req_qty(
  lineas: ReqLineaDraft[],
  id_item: number,
  delta: number,
): ReqLineaDraft[] {
  const idx = lineas.findIndex((row) => row.id_item_costo === id_item);
  if (idx < 0) return lineas;
  const next = [...lineas];
  const row = next[idx];
  const cantidad = Math.max(0.001, Number(row.cantidad || 0) + delta);
  next[idx] = { ...row, cantidad };
  return next;
}

export function ReqAltaStockAnalisis({
  deposito,
  id_departamento,
  lineas,
  on_lineas,
}: {
  deposito: ReqDeposito;
  id_departamento?: number | null;
  lineas: ReqLineaDraft[];
  on_lineas?: (next: ReqLineaDraft[]) => void;
}) {
  const [hits, setHits] = useState<StockHit[]>([]);
  const [canConsume, setCanConsume] = useState(false);
  const [busy, setBusy] = useState(false);
  /** Consumo pendiente por id_stock (aún no guardado en BD). */
  const [consumo, setConsumo] = useState<Record<number, number>>({});
  const [aviso, setAviso] = useState<string | null>(null);

  const ids = useMemo(
    () =>
      lineas
        .map((row) => row.id_item_costo)
        .filter((id): id is number => typeof id === "number" && id > 0),
    [lineas],
  );

  useEffect(() => {
    void get_depositos_ui_access_action().then((access) =>
      setCanConsume(access.can_consume),
    );
  }, []);

  useEffect(() => {
    if (ids.length === 0) {
      setHits([]);
      return;
    }
    void lookup_stock_for_items_action({
      ids_item: ids,
      deposito,
      id_departamento,
    }).then((rows) => {
      setHits(rows);
      setConsumo((prev) => {
        const next: Record<number, number> = {};
        for (const row of rows) {
          next[row.id_stock] = Math.min(
            prev[row.id_stock] ?? 0,
            Number(row.cantidad),
          );
        }
        return next;
      });
    });
  }, [deposito, id_departamento, ids.join(",")]);

  function ubicacion(hit: StockHit): string {
    if (hit.deposito === "departamento") {
      return hit.departamento || DEPOSITO_LABEL.departamento;
    }
    return DEPOSITO_LABEL[hit.deposito];
  }

  function set_consumo(id_stock: number, value: number, max: number) {
    setConsumo((prev) => ({
      ...prev,
      [id_stock]: Math.max(0, Math.min(max, value)),
    }));
  }

  async function actualizar_stock(hit: StockHit) {
    const cantidad = Number(consumo[hit.id_stock] ?? 0);
    if (!(cantidad > 0)) {
      setAviso("No hay consumo pendiente que guardar.");
      return;
    }
    setBusy(true);
    const res = await registrar_salida_stock_action({
      id_stock: hit.id_stock,
      tipo: "gastado",
      cantidad,
      notas: "Consumo ajustado desde alta de requisición",
    });
    setBusy(false);
    if (!res.ok) {
      window.alert(res.error || "No se pudo actualizar el stock.");
      return;
    }
    setConsumo((prev) => ({ ...prev, [hit.id_stock]: 0 }));
    setAviso(
      `Stock actualizado: −${cantidad.toFixed(2)} ${hit.unidad || "und"} (consumo).`,
    );
    const next = await lookup_stock_for_items_action({
      ids_item: ids,
      deposito,
      id_departamento,
    });
    setHits(next);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-800">
          <Package className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-900">
            Stock actual de estos ítems
          </p>
          <p className="text-xs text-slate-500">
            − resta del stock (consumo). + suma a lo pedido en la requisición.
            Confirmá el consumo con «Actualizar stock».
          </p>
        </div>
      </div>

      {aviso ? (
        <p className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          {aviso}
        </p>
      ) : null}

      <div className="space-y-2">
        {ids.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-500">
            Elige ítems del catálogo para ver el stock.
          </p>
        ) : hits.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-500">
            Aún no hay stock registrado para estos ítems en este inventario.
          </p>
        ) : (
          hits.map((hit) => {
            const pedida = req_qty_for_item(lineas, hit.id_item_costo);
            const pending = Number(consumo[hit.id_stock] ?? 0);
            const stock_tras = Math.max(0, hit.cantidad - pending);
            const proyeccion = stock_tras + pedida;
            const nivel = stock_nivel(stock_tras, hit.minimo);
            const dirty = pending > 0;
            const und = hit.unidad || "und";

            return (
              <div
                key={hit.id_stock}
                className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-800">
                      <Package className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-slate-900">
                        {hit.nombre_item}
                      </p>
                      <p className="mt-0.5 text-sm text-slate-500">
                        {ubicacion(hit)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StockNivelBadge nivel={nivel} />
                    <p className="text-right text-sm text-slate-600">
                      Stock actual{" "}
                      <span className="font-bold tabular-nums text-slate-900">
                        {hit.cantidad.toFixed(2)}
                      </span>{" "}
                      {und}
                    </p>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  <p>
                    Pedís en la requisición{" "}
                    <span className="font-semibold tabular-nums">
                      {pedida.toFixed(2)} {und}
                    </span>
                    {pending > 0 ? (
                      <>
                        {" · "}consumo pendiente{" "}
                        <span className="font-semibold tabular-nums text-rose-700">
                          −{pending.toFixed(2)}
                        </span>
                      </>
                    ) : null}
                  </p>
                  <p className="text-xs leading-relaxed text-slate-600">
                    {pending > 0 ? (
                      <>
                        Tras consumir:{" "}
                        <span className="font-semibold tabular-nums">
                          {stock_tras.toFixed(2)}
                        </span>
                        {pedida > 0 ? (
                          <>
                            {" "}
                            + pedido ({pedida.toFixed(2)}) →{" "}
                            <span className="font-semibold tabular-nums text-emerald-800">
                              {proyeccion.toFixed(2)} {und}
                            </span>
                          </>
                        ) : (
                          <> {und} en stock.</>
                        )}
                      </>
                    ) : pedida > 0 ? (
                      <>
                        Con lo que pedís: {hit.cantidad.toFixed(2)} +{" "}
                        {pedida.toFixed(2)} →{" "}
                        <span className="font-semibold tabular-nums text-emerald-800">
                          {proyeccion.toFixed(2)} {und}
                        </span>{" "}
                        cuando entre el abastecimiento.
                      </>
                    ) : (
                      <>Sin cantidad en la requisición todavía.</>
                    )}
                  </p>
                  {stock_tras < hit.minimo ? (
                    <p className="flex items-center gap-1 text-xs text-amber-800">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Quedaría bajo el mínimo ({hit.minimo.toFixed(2)}).
                    </p>
                  ) : null}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={
                        busy ||
                        !canConsume ||
                        pending >= hit.cantidad ||
                        hit.cantidad <= 0
                      }
                      className="h-12 w-12 rounded-xl"
                      title="Restar 1 del stock (consumo pendiente)"
                      aria-label="Restar del stock"
                      onClick={() => {
                        const next = pending + 1;
                        set_consumo(hit.id_stock, next, hit.cantidad);
                        setAviso(
                          `Consumo pendiente −${next.toFixed(0)} ${und}. Confirmá con «Actualizar stock».`,
                        );
                      }}
                    >
                      <Minus className="h-5 w-5" />
                    </Button>

                    <div className="min-w-[5.5rem] px-1 text-center">
                      <p className="text-lg font-bold tabular-nums text-slate-900">
                        {pending > 0 ? (
                          <span className="text-rose-700">
                            −{pending.toFixed(0)}
                          </span>
                        ) : (
                          pedida.toFixed(0)
                        )}
                      </p>
                      <p className="text-[10px] leading-tight text-slate-500">
                        {pending > 0 ? "consumo pend." : "pedido en req"}
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      disabled={busy || !on_lineas}
                      className="h-12 w-12 rounded-xl"
                      title="Sumar 1 a la cantidad de la requisición"
                      aria-label="Sumar a la requisición"
                      onClick={() => {
                        if (!on_lineas) return;
                        on_lineas(bump_req_qty(lineas, hit.id_item_costo, 1));
                        setAviso(
                          "Se aumentó la cantidad pedida en la requisición (+1).",
                        );
                      }}
                    >
                      <Plus className="h-5 w-5" />
                    </Button>
                  </div>

                  {canConsume ? (
                    <>
                      {dirty ? (
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={busy}
                          className="h-12 rounded-xl text-slate-600"
                          onClick={() => {
                            set_consumo(hit.id_stock, 0, hit.cantidad);
                            setAviso("Consumo pendiente cancelado.");
                          }}
                        >
                          Deshacer −
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={busy || hit.cantidad <= 0}
                        className="h-12 rounded-xl text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                        onClick={() => {
                          set_consumo(hit.id_stock, hit.cantidad, hit.cantidad);
                          setAviso(
                            `Marcado agotado (−${hit.cantidad.toFixed(2)} ${und}). Confirmá con «Actualizar stock».`,
                          );
                        }}
                      >
                        Marcar agotado
                      </Button>
                      <Button
                        type="button"
                        disabled={busy || !dirty}
                        className="h-12 rounded-xl bg-amber-600 hover:bg-amber-700"
                        onClick={() => void actualizar_stock(hit)}
                      >
                        Actualizar stock
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
