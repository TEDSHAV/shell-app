"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  ChevronRight,
  GraduationCap,
  Package,
  Search,
  Warehouse,
  Wrench,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { stock_nivel } from "../lib/req-stock-status";
import {
  DEPOSITO_LABEL,
  type ReqDeposito,
  type ReqStockRow,
} from "../lib/req-stock-types";
import { group_departamental_by_item } from "../lib/req-stock-group";
import {
  INV_PAGE_SIZE_OPTIONS,
  ReqDepositosPagination,
} from "./depositos/req-depositos-pagination";
import {
  StockDeptChip,
  StockDeptLabel,
  StockNivelBadge,
  StockSectionBanner,
  StockWarehouseShell,
} from "./depositos/req-stock-ui";

const DEPOSITOS: ReqDeposito[] = ["departamento", "capacitacion", "tecnico"];

function DepositoIcon({ deposito }: { deposito: ReqDeposito }) {
  if (deposito === "departamento") return <Building2 className="h-4 w-4" />;
  if (deposito === "capacitacion") return <GraduationCap className="h-4 w-4" />;
  return <Wrench className="h-4 w-4" />;
}

function matches(row: ReqStockRow, term: string): boolean {
  if (!term) return true;
  const blob =
    `${row.nombre_item} ${row.departamento || ""} ${row.categoria || ""} ${DEPOSITO_LABEL[row.deposito]}`.toLowerCase();
  return blob.includes(term);
}

export function ReqDepositosItemList({
  rows,
  selectedId,
  showDepartamento,
  expanded,
  grouped,
  loading,
  paginate = true,
  onSelect,
}: {
  rows: ReqStockRow[];
  selectedId: number | null;
  showDepartamento: boolean;
  expanded?: boolean;
  grouped?: boolean;
  loading?: boolean;
  paginate?: boolean;
  onSelect: (row: ReqStockRow) => void;
}) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(INV_PAGE_SIZE_OPTIONS[0]);
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

  useEffect(() => {
    setPage(1);
  }, [term, pageSize, rows.length, grouped]);

  const flat_page = useMemo(() => {
    if (grouped) return filtered;
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, grouped, page, pageSize]);

  return (
    <StockWarehouseShell>
      <div className="border-b border-slate-200/80 bg-white px-4 py-3">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Warehouse className="h-4 w-4 text-amber-700" />
          Artículos en almacén
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={q}
            placeholder="Buscar artículo, departamento o categoría…"
            className="h-10 border-slate-200 bg-white pl-9 text-sm"
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {loading ? (
          <p className="py-16 text-center text-sm text-slate-500">
            Cargando inventario…
          </p>
        ) : grouped ? (
          DEPOSITOS.map((deposito) => {
            const group = filtered.filter((row) => row.deposito === deposito);
            if (term && group.length === 0) return null;
            const is_open = term ? true : open[deposito];
            const grouped_items =
              deposito === "departamento"
                ? group_departamental_by_item(group)
                : null;
            const count = grouped_items?.length ?? group.length;

            return (
              <div
                key={deposito}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
              >
                <StockSectionBanner
                  title={DEPOSITO_LABEL[deposito]}
                  count={count}
                  icon={<DepositoIcon deposito={deposito} />}
                  open={is_open}
                  on_toggle={() =>
                    setOpen((prev) => ({
                      ...prev,
                      [deposito]: !prev[deposito],
                    }))
                  }
                />
                {is_open ? (
                  <div className="space-y-2 bg-white p-3">
                    {count === 0 ? (
                      <p className="py-6 text-center text-sm text-slate-500">
                        Sin artículos en este almacén.
                      </p>
                    ) : grouped_items ? (
                      <GroupedDeptPage
                        items={grouped_items}
                        selectedId={selectedId}
                        paginate={paginate}
                        onSelect={onSelect}
                      />
                    ) : (
                      <FlatPage
                        rows={group}
                        selectedId={selectedId}
                        showDepto={false}
                        showCat={Boolean(expanded)}
                        paginate={paginate}
                        onSelect={onSelect}
                      />
                    )}
                  </div>
                ) : null}
              </div>
            );
          })
        ) : (
          <div className="space-y-2">
            {flat_page.map((row) => (
              <ItemCard
                key={row.id}
                row={row}
                selected={selectedId === row.id}
                showDepto={Boolean(showDepartamento)}
                showDeptoHint={!expanded && showDepartamento}
                showCat={Boolean(expanded)}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
        {!loading && !grouped && filtered.length === 0 ? (
          <p className="py-16 text-center text-sm text-slate-500">
            {term
              ? "Ningún artículo coincide con la búsqueda."
              : "Este almacén aún no tiene artículos."}
          </p>
        ) : null}
      </div>

      {paginate && !grouped && !loading ? (
        <div className="border-t border-slate-200 bg-white px-4 py-2">
          <ReqDepositosPagination
            page={page}
            page_size={pageSize}
            total={filtered.length}
            on_page={setPage}
            on_page_size={setPageSize}
          />
        </div>
      ) : null}
    </StockWarehouseShell>
  );
}

function FlatPage({
  rows,
  selectedId,
  showDepto,
  showCat,
  paginate,
  onSelect,
}: {
  rows: ReqStockRow[];
  selectedId: number | null;
  showDepto: boolean;
  showCat: boolean;
  paginate: boolean;
  onSelect: (row: ReqStockRow) => void;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(INV_PAGE_SIZE_OPTIONS[0]);
  useEffect(() => setPage(1), [rows.length, pageSize]);
  const slice = paginate
    ? rows.slice((page - 1) * pageSize, page * pageSize)
    : rows;
  return (
    <>
      {slice.map((row) => (
        <ItemCard
          key={row.id}
          row={row}
          selected={selectedId === row.id}
          showDepto={showDepto}
          showDeptoHint={false}
          showCat={showCat}
          onSelect={onSelect}
        />
      ))}
      {paginate ? (
        <ReqDepositosPagination
          page={page}
          page_size={pageSize}
          total={rows.length}
          on_page={setPage}
          on_page_size={setPageSize}
        />
      ) : null}
    </>
  );
}

function GroupedDeptPage({
  items,
  selectedId,
  paginate,
  onSelect,
}: {
  items: ReturnType<typeof group_departamental_by_item>;
  selectedId: number | null;
  paginate: boolean;
  onSelect: (row: ReqStockRow) => void;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(INV_PAGE_SIZE_OPTIONS[0]);
  useEffect(() => setPage(1), [items.length, pageSize]);
  const slice = paginate
    ? items.slice((page - 1) * pageSize, page * pageSize)
    : items;

  return (
    <>
      {slice.map((item) => {
        const selected = item.departamentos.some(
          (d) => d.id_stock === selectedId,
        );
        return (
          <button
            key={item.id_item_costo}
            type="button"
            onClick={() => onSelect(item.representative)}
            className={cn(
              "w-full rounded-xl border bg-white p-4 text-left shadow-sm transition",
              selected
                ? "border-amber-400 ring-2 ring-amber-200"
                : "border-slate-200 hover:border-amber-300 hover:shadow",
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-800">
                    <Package className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-slate-900">
                      {item.nombre_item}
                    </p>
                    {item.categoria ? (
                      <p className="mt-0.5 text-sm text-slate-500">
                        {item.categoria}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <StockNivelBadge nivel={item.nivel} />
                <p className="text-right">
                  <span className="text-lg font-bold tabular-nums text-slate-900">
                    {item.cantidad_total.toFixed(2)}
                  </span>{" "}
                  <span className="text-sm font-medium text-slate-500">
                    {item.unidad || "und"}
                  </span>
                </p>
              </div>
            </div>
            <div className="mt-3 border-t border-slate-100 pt-3">
              <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Ubicaciones ({item.departamentos.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {item.departamentos.map((dept) => (
                  <StockDeptChip
                    key={dept.id}
                    nombre={dept.nombre}
                    href={`/requisiciones/depositos/departamento/${dept.id}`}
                    cantidad={dept.cantidad}
                    nivel={dept.nivel}
                  />
                ))}
              </div>
            </div>
          </button>
        );
      })}
      {paginate ? (
        <ReqDepositosPagination
          page={page}
          page_size={pageSize}
          total={items.length}
          on_page={setPage}
          on_page_size={setPageSize}
        />
      ) : null}
    </>
  );
}

function ItemCard({
  row,
  selected,
  showDepto,
  showDeptoHint,
  showCat,
  onSelect,
}: {
  row: ReqStockRow;
  selected: boolean;
  showDepto: boolean;
  showDeptoHint: boolean;
  showCat: boolean;
  onSelect: (row: ReqStockRow) => void;
}) {
  const nivel = stock_nivel(Number(row.cantidad), row.minimo ?? 1);
  const depto_name = row.departamento || DEPOSITO_LABEL[row.deposito];

  return (
    <button
      type="button"
      onClick={() => onSelect(row)}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border bg-white p-4 text-left shadow-sm transition",
        selected
          ? "border-amber-400 ring-2 ring-amber-200"
          : "border-slate-200 hover:border-amber-300 hover:shadow",
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-800">
        <Package className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-slate-900">
              {row.nombre_item}
            </p>
            {showCat && row.categoria ? (
              <p className="mt-0.5 text-sm text-slate-500">{row.categoria}</p>
            ) : null}
            {showDepto || showDeptoHint ? (
              <div className="mt-2">
                <StockDeptLabel nombre={depto_name} />
              </div>
            ) : null}
          </div>
          <div className="flex flex-col items-end gap-2">
            <StockNivelBadge nivel={nivel} />
            <p className="text-right">
              <span className="text-lg font-bold tabular-nums text-slate-900">
                {Number(row.cantidad).toFixed(2)}
              </span>{" "}
              <span className="text-sm font-medium text-slate-500">
                {row.unidad || "und"}
              </span>
            </p>
          </div>
        </div>
      </div>
      <ChevronRight
        className={cn(
          "mt-1 h-4 w-4 shrink-0",
          selected ? "text-amber-600" : "text-slate-300",
        )}
      />
    </button>
  );
}
