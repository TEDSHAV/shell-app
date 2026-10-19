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
import { ReqStockAnalisisHistorial } from "./req-stock-analisis-historial";

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
  // Enteros limpios: evita residuos tipo 0.001 → 1.001 → 2.001
  const base = Math.max(1, Math.round(Number(row.cantidad || 0)));
  const cantidad = Math.max(1, base + delta);
  next[idx] = { ...row, cantidad };
  return next;
}

function Stepper({
  value,
  label,
  tone,
  disabled_minus,
  disabled_plus,
  hide_plus,
  on_minus,
  on_plus,
}: {
  value: string;
  label: string;
  tone: "slate" | "rose" | "emerald";
  disabled_minus: boolean;
  disabled_plus: boolean;
  /** Si true, no se muestra el + (p. ej. ya estás en el stock real). */
  hide_plus?: boolean;
  on_minus: () => void;
  on_plus: () => void;
}) {
  const value_cls =
    tone === "rose"
      ? "text-rose-700"
      : tone === "emerald"
        ? "text-emerald-800"
        : "text-slate-900";

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        disabled={disabled_minus}
        className="h-11 w-11 shrink-0 rounded-xl"
        aria-label={`Bajar ${label}`}
        onClick={on_minus}
      >
        <Minus className="h-5 w-5" />
      </Button>
      <div className="min-w-[4.5rem] text-center">
        <p className={`text-xl font-bold tabular-nums ${value_cls}`}>{value}</p>
        <p className="text-[10px] leading-tight text-slate-500">{label}</p>
      </div>
      {hide_plus ? (
        <span className="h-11 w-11 shrink-0" aria-hidden />
      ) : (
        <Button
          type="button"
          variant="outline"
          disabled={disabled_plus}
          className="h-11 w-11 shrink-0 rounded-xl"
          aria-label={`Subir ${label}`}
          onClick={on_plus}
        >
          <Plus className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
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
  /** Token para refrescar historial tras un consumo confirmado. */
  const [historial_tick, setHistorialTick] = useState(0);

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
    setHistorialTick((n) => n + 1);
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
            Dos ajustes aparte: el pedido de la requisición, y el consumo de lo
            que ya tenés en stock.
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

                {/* Cuenta clara: stock − consumo + pedido */}
                <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-center text-xs text-slate-600">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">
                      Stock
                    </p>
                    <p className="text-base font-bold tabular-nums text-slate-900">
                      {hit.cantidad.toFixed(0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">
                      − Consumo
                    </p>
                    <p
                      className={`text-base font-bold tabular-nums ${
                        pending > 0 ? "text-rose-700" : "text-slate-400"
                      }`}
                    >
                      {pending > 0 ? `−${pending.toFixed(0)}` : "0"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">
                      + Pedido
                    </p>
                    <p className="text-base font-bold tabular-nums text-emerald-800">
                      {pedida.toFixed(0)}
                    </p>
                  </div>
                  <div className="col-span-3 border-t border-slate-200 pt-2 text-sm text-slate-700">
                    Quedarían{" "}
                    <span className="font-semibold tabular-nums">
                      {stock_tras.toFixed(2)}
                    </span>
                    {pedida > 0 ? (
                      <>
                        {" "}
                        + lo pedido →{" "}
                        <span className="font-semibold tabular-nums text-emerald-800">
                          {proyeccion.toFixed(2)} {und}
                        </span>
                      </>
                    ) : (
                      <> {und}</>
                    )}
                    {stock_tras < hit.minimo ? (
                      <span className="mt-1 flex items-center justify-center gap-1 text-xs text-amber-800">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Bajo el mínimo ({hit.minimo.toFixed(2)})
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* 1) Pedido en la requisición — independiente */}
                {on_lineas ? (
                  <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/40 px-3 py-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-emerald-950">
                          Pedido en la requisición
                        </p>
                        <p className="text-xs text-emerald-900/70">
                          Cambia la cantidad de la tabla de arriba. No toca el
                          stock.
                        </p>
                      </div>
                      <Stepper
                        value={pedida.toFixed(0)}
                        label={und}
                        tone="emerald"
                        disabled_minus={busy || pedida <= 1}
                        disabled_plus={busy}
                        on_minus={() => {
                          on_lineas(
                            bump_req_qty(lineas, hit.id_item_costo, -1),
                          );
                          setAviso(
                            "Se bajó la cantidad pedida en la requisición.",
                          );
                        }}
                        on_plus={() => {
                          on_lineas(
                            bump_req_qty(lineas, hit.id_item_costo, 1),
                          );
                          setAviso(
                            "Se aumentó la cantidad pedida en la requisición (+1).",
                          );
                        }}
                      />
                    </div>
                  </div>
                ) : null}

                {/* 2) Consumo del stock — independiente, arranca en 0 */}
                {canConsume ? (
                  <div className="mt-2 rounded-xl border border-rose-100 bg-rose-50/40 px-3 py-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-rose-950">
                          Consumo del stock actual
                        </p>
                        <p className="text-xs text-rose-900/70">
                          Arranca en lo que hay ahora. − implica consumo; +
                          deshace hasta el stock real (ahí se oculta el +).
                        </p>
                      </div>
                      <Stepper
                        value={stock_tras.toFixed(0)}
                        label={
                          pending > 0
                            ? `quedan (${und})`
                            : `stock actual (${und})`
                        }
                        tone={pending > 0 ? "rose" : "slate"}
                        disabled_minus={
                          busy || stock_tras <= 0 || hit.cantidad <= 0
                        }
                        disabled_plus={busy || pending <= 0}
                        hide_plus={pending <= 0}
                        on_minus={() => {
                          const next = pending + 1;
                          set_consumo(hit.id_stock, next, hit.cantidad);
                          setAviso(
                            `Consumo pendiente −${next.toFixed(0)} ${und} (quedan ${(hit.cantidad - next).toFixed(0)}). Confirmá con «Actualizar stock».`,
                          );
                        }}
                        on_plus={() => {
                          const next = Math.max(0, pending - 1);
                          set_consumo(hit.id_stock, next, hit.cantidad);
                          setAviso(
                            next > 0
                              ? `Deshecho: quedan ${(hit.cantidad - next).toFixed(0)} ${und}.`
                              : "Volviste al stock actual (sin consumo pendiente).",
                          );
                        }}
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-rose-100/80 pt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={busy || hit.cantidad <= 0}
                        className="h-10 rounded-xl text-rose-700 hover:bg-rose-100/80 hover:text-rose-800"
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
                        className="h-10 rounded-xl bg-amber-600 hover:bg-amber-700"
                        onClick={() => void actualizar_stock(hit)}
                      >
                        Actualizar stock
                      </Button>
                    </div>
                  </div>
                ) : null}

                <ReqStockAnalisisHistorial
                  id_stock={hit.id_stock}
                  refresh_token={historial_tick}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
