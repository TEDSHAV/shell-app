"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  STOCK_NIVEL_CLASS,
  STOCK_NIVEL_LABEL,
  stock_nivel,
} from "../lib/req-stock-status";
import {
  DEPOSITO_LABEL,
  type ReqDeposito,
  type ReqStockRow,
} from "../lib/req-stock-types";

const DEPOSITOS: ReqDeposito[] = ["departamento", "capacitacion", "tecnico"];

function matches(row: ReqStockRow, term: string): boolean {
  if (!term) return true;
  const blob = `${row.nombre_item} ${row.departamento || ""} ${row.categoria || ""} ${DEPOSITO_LABEL[row.deposito]}`.toLowerCase();
  return blob.includes(term);
}

export function ReqDepositosItemList({
  rows,
  selectedId,
  showDepartamento,
  expanded,
  grouped,
  loading,
  onSelect,
}: {
  rows: ReqStockRow[];
  selectedId: number | null;
  showDepartamento: boolean;
  expanded?: boolean;
  grouped?: boolean;
  loading?: boolean;
  onSelect: (row: ReqStockRow) => void;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Record<ReqDeposito, boolean>>({
    departamento: true,
    capacitacion: true,
    tecnico: true,
  });
  const term = q.trim().toLowerCase();
  const filtered = useMemo(
    () => rows.filter((row) => matches(row, term)),
    [rows, term],
  );

  const cols = expanded
    ? grouped || showDepartamento
      ? "grid-cols-[minmax(0,2fr)_minmax(8rem,1fr)_minmax(8rem,1fr)_auto_8rem]"
      : "grid-cols-[minmax(0,2fr)_minmax(8rem,1fr)_auto_8rem]"
    : "grid-cols-[1fr_auto_7rem]";

  const show_depto_col = Boolean(expanded && (showDepartamento || grouped));
  const show_cat_col = Boolean(expanded);

  return (
    <div className="flex h-full min-h-[28rem] w-full flex-col rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur">
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
        <Input
          value={q}
          placeholder="Buscar ítem, categoría o inventario…"
          className="h-9 pl-8"
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div
        className={cn(
          "mb-3 grid gap-2 px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400",
          cols,
        )}
      >
        <span>Ítems</span>
        {show_depto_col ? <span>Departamento</span> : null}
        {show_cat_col ? <span>Categoría</span> : null}
        <span>Estatus</span>
        <span className="text-right">Saldo</span>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {loading ? (
          <p className="py-12 text-center text-sm text-slate-400">
            Cargando inventario…
          </p>
        ) : grouped
          ? DEPOSITOS.map((deposito) => {
              const group = filtered.filter((row) => row.deposito === deposito);
              if (term && group.length === 0) return null;
              const is_open = term ? true : open[deposito];
              return (
                <div key={deposito} className="rounded-xl border border-slate-100">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-semibold text-slate-700"
                    onClick={() =>
                      setOpen((prev) => ({ ...prev, [deposito]: !prev[deposito] }))
                    }
                  >
                    <span className="flex items-center gap-1">
                      {is_open ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      {DEPOSITO_LABEL[deposito]}
                    </span>
                    <span className="text-xs font-normal text-slate-400">
                      {group.length}
                    </span>
                  </button>
                  {is_open ? (
                    <div className="space-y-2 border-t border-slate-100 p-2">
                      {group.length === 0 ? (
                        <p className="py-4 text-center text-xs text-slate-400">
                          Sin ítems en este inventario.
                        </p>
                      ) : (
                        group.map((row) => (
                          <ItemRow
                            key={row.id}
                            row={row}
                            cols={cols}
                            selected={selectedId === row.id}
                            showDeptoCol={show_depto_col}
                            showCatCol={show_cat_col}
                            showDeptoHint={!expanded}
                            onSelect={onSelect}
                          />
                        ))
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })
          : filtered.map((row) => (
              <ItemRow
                key={row.id}
                row={row}
                cols={cols}
                selected={selectedId === row.id}
                showDeptoCol={show_depto_col}
                showCatCol={show_cat_col}
                showDeptoHint={!expanded && showDepartamento}
                onSelect={onSelect}
              />
            ))}
        {!loading && !grouped && filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-400">
            {term
              ? "Ningún ítem coincide con la búsqueda."
              : "Este inventario no tiene saldo todavía."}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ItemRow({
  row,
  cols,
  selected,
  showDeptoCol,
  showCatCol,
  showDeptoHint,
  onSelect,
}: {
  row: ReqStockRow;
  cols: string;
  selected: boolean;
  showDeptoCol: boolean;
  showCatCol: boolean;
  showDeptoHint: boolean;
  onSelect: (row: ReqStockRow) => void;
}) {
  const nivel = stock_nivel(Number(row.cantidad), row.minimo ?? 1);
  return (
    <button
      type="button"
      onClick={() => onSelect(row)}
      className={cn(
        "grid w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition",
        cols,
        selected
          ? "border-sky-300 bg-sky-50/80"
          : "border-slate-100 bg-white hover:border-sky-200",
      )}
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-slate-900">
          {row.nombre_item}
        </span>
        {showDeptoHint ? (
          <span className="text-[11px] text-slate-400">
            {row.departamento || DEPOSITO_LABEL[row.deposito]}
          </span>
        ) : null}
      </span>
      {showDeptoCol ? (
        <span className="truncate text-xs text-slate-500">
          {row.departamento || DEPOSITO_LABEL[row.deposito]}
        </span>
      ) : null}
      {showCatCol ? (
        <span className="truncate text-xs text-slate-500">
          {row.categoria || "—"}
        </span>
      ) : null}
      <span
        className={cn(
          "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
          STOCK_NIVEL_CLASS[nivel],
        )}
      >
        {STOCK_NIVEL_LABEL[nivel]}
      </span>
      <span className="text-right text-sm font-semibold text-slate-800">
        {Number(row.cantidad).toFixed(2)}{" "}
        <span className="text-[11px] font-normal text-slate-400">
          {row.unidad || ""}
        </span>
      </span>
    </button>
  );
}
