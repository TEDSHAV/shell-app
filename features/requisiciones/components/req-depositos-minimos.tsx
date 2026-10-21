"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { FALLBACK_STOCK_MINIMO } from "../lib/req-stock-status";
import {
  DEPOSITO_LABEL,
  DEPOSITO_TAB_LABEL,
  type ReqDeposito,
  type ReqStockMinimoRow,
  type ReqStockRow,
} from "../lib/req-stock-types";

const ALL_DEPOSITOS: ReqDeposito[] = [
  "departamento",
  "capacitacion",
  "tecnico",
];

export function ReqDepositosMinimos({
  deposito: deposito_fixed,
  rows: rows_all,
  rules: rules_all,
  depositos_seleccionables,
  onSave,
  onDelete,
}: {
  /** Depósito fijo (si no hay selector). */
  deposito?: ReqDeposito;
  rows: ReqStockRow[];
  rules: ReqStockMinimoRow[];
  /** Si se pasa, el sheet permite elegir depósito. */
  depositos_seleccionables?: ReqDeposito[];
  onSave: (params: {
    deposito: ReqDeposito;
    alcance: "general" | "categoria" | "item";
    cantidad_minima: number;
    id_categoria?: number | null;
    id_item_costo?: number | null;
  }) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const selectable = depositos_seleccionables?.length
    ? depositos_seleccionables
    : null;
  const [depositoPick, setDepositoPick] = useState<ReqDeposito>(
    deposito_fixed ?? selectable?.[0] ?? "departamento",
  );
  const deposito = deposito_fixed ?? depositoPick;

  useEffect(() => {
    if (deposito_fixed) setDepositoPick(deposito_fixed);
  }, [deposito_fixed]);

  const rows = useMemo(
    () => rows_all.filter((row) => row.deposito === deposito),
    [rows_all, deposito],
  );
  const rules = useMemo(
    () => rules_all.filter((row) => row.deposito === deposito),
    [rules_all, deposito],
  );

  const general = rules.find((row) => row.alcance === "general");
  const default_min = Number(general?.cantidad_minima || FALLBACK_STOCK_MINIMO);
  const [generalQty, setGeneralQty] = useState(default_min);
  const [q, setQ] = useState("");

  useEffect(() => {
    setGeneralQty(Number(general?.cantidad_minima || FALLBACK_STOCK_MINIMO));
  }, [general?.cantidad_minima, deposito]);

  const categorias = useMemo(() => {
    const map = new Map<number, string>();
    for (const row of rows) {
      if (row.id_categoria != null && row.categoria) {
        map.set(row.id_categoria, row.categoria);
      }
    }
    return [...map.entries()].map(([id, nombre]) => ({ id, nombre }));
  }, [rows]);

  const items = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = rows.filter(
      (row) => !term || row.nombre_item.toLowerCase().includes(term),
    );
    return list.sort((a, b) => {
      const a_custom = rules.some(
        (r) => r.alcance === "item" && r.id_item_costo === a.id_item_costo,
      );
      const b_custom = rules.some(
        (r) => r.alcance === "item" && r.id_item_costo === b.id_item_costo,
      );
      if (a_custom !== b_custom) return a_custom ? -1 : 1;
      return a.nombre_item.localeCompare(b.nombre_item, "es");
    });
  }, [rows, q, rules]);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          Configurar mínimos
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Alertas de stock bajo</SheetTitle>
          <SheetDescription>
            En {DEPOSITO_LABEL[deposito]}, un ítem pasa a “Bajo stock” cuando su
            stock es menor que el mínimo. Si no defines nada, se usa{" "}
            {FALLBACK_STOCK_MINIMO}.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-6 p-4">
          {selectable ? (
            <label className="block text-xs font-medium text-slate-600">
              Inventario
              <select
                className="mt-1 flex h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm"
                value={deposito}
                onChange={(e) => setDepositoPick(e.target.value as ReqDeposito)}
              >
                {(selectable.length ? selectable : ALL_DEPOSITOS).map((key) => (
                  <option key={key} value={key}>
                    {DEPOSITO_TAB_LABEL[key]}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <section className="rounded-xl border border-sky-100 bg-sky-50/60 p-3">
            <h3 className="text-sm font-semibold text-slate-800">
              Mínimo para todo el inventario
            </h3>
            <p className="mb-3 mt-1 text-xs text-slate-500">
              Este número aplica a todos los ítems, salvo que más abajo pongas
              uno distinto para una categoría o un artículo.
            </p>
            <div className="flex items-center gap-2">
              <NumberInput
                value={generalQty}
                min={0.01}
                allowDecimal
                className="h-9 w-24"
                onValueChange={setGeneralQty}
              />
              <Button
                type="button"
                size="sm"
                onClick={() =>
                  void onSave({
                    deposito,
                    alcance: "general",
                    cantidad_minima: generalQty,
                  })
                }
              >
                Guardar
              </Button>
            </div>
          </section>

          {categorias.length > 0 ? (
            <section>
              <h3 className="text-sm font-semibold text-slate-800">
                Mínimo por categoría
              </h3>
              <p className="mb-2 mt-1 text-xs text-slate-500">
                Opcional. Gana sobre el mínimo general, pero no sobre un ítem
                personalizado.
              </p>
              <ul className="space-y-2">
                {categorias.map((cat) => {
                  const rule = rules.find(
                    (row) =>
                      row.alcance === "categoria" && row.id_categoria === cat.id,
                  );
                  return (
                    <MinimoInlineRow
                      key={cat.id}
                      label={cat.nombre}
                      hint={`usa ${default_min} (inventario)`}
                      inicial={Number(rule?.cantidad_minima || default_min)}
                      custom={Boolean(rule)}
                      onSave={(qty) =>
                        void onSave({
                          deposito,
                          alcance: "categoria",
                          id_categoria: cat.id,
                          cantidad_minima: qty,
                        })
                      }
                      onClear={
                        rule ? () => void onDelete(rule.id) : undefined
                      }
                    />
                  );
                })}
              </ul>
            </section>
          ) : null}

          <section>
            <h3 className="text-sm font-semibold text-slate-800">
              Mínimo de un ítem
            </h3>
            <p className="mb-2 mt-1 text-xs text-slate-500">
              Opcional. El valor del artículo es el que manda si lo personalizas.
            </p>
            <Input
              value={q}
              placeholder="Buscar ítem…"
              className="mb-3 h-8"
              onChange={(e) => setQ(e.target.value)}
            />
            <ul className="max-h-[22rem] space-y-2 overflow-y-auto pr-1">
              {items.map((row) => {
                const rule = rules.find(
                  (r) =>
                    r.alcance === "item" && r.id_item_costo === row.id_item_costo,
                );
                return (
                  <MinimoInlineRow
                    key={row.id}
                    label={row.nombre_item}
                    hint={`stock ${Number(row.cantidad).toFixed(2)} ${row.unidad || ""} · mín. ${Number(row.minimo ?? default_min)}`}
                    inicial={Number(rule?.cantidad_minima ?? row.minimo ?? default_min)}
                    custom={Boolean(rule)}
                    onSave={(qty) =>
                      void onSave({
                        deposito,
                        alcance: "item",
                        id_item_costo: row.id_item_costo,
                        cantidad_minima: qty,
                      })
                    }
                    onClear={rule ? () => void onDelete(rule.id) : undefined}
                  />
                );
              })}
              {items.length === 0 ? (
                <li className="text-xs text-slate-400">No hay ítems.</li>
              ) : null}
            </ul>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function MinimoInlineRow({
  label,
  hint,
  inicial,
  custom,
  onSave,
  onClear,
}: {
  label: string;
  hint: string;
  inicial: number;
  custom: boolean;
  onSave: (qty: number) => void;
  onClear?: () => void;
}) {
  const [qty, setQty] = useState(inicial);
  useEffect(() => {
    setQty(inicial);
  }, [inicial]);
  return (
    <li className="rounded-lg border border-slate-100 bg-white px-3 py-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-800">{label}</p>
          <p className="text-[11px] text-slate-400">{hint}</p>
        </div>
        {custom ? (
          <span className="shrink-0 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
            Personalizado
          </span>
        ) : null}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <NumberInput
          value={qty}
          min={0.01}
          allowDecimal
          className="h-8 w-20 text-xs"
          onValueChange={setQty}
        />
        <Button type="button" size="sm" variant="outline" onClick={() => onSave(qty)}>
          Guardar
        </Button>
        {onClear ? (
          <button
            type="button"
            className="text-xs text-rose-600 underline"
            onClick={onClear}
          >
            Usar el del inventario
          </button>
        ) : null}
      </div>
    </li>
  );
}
