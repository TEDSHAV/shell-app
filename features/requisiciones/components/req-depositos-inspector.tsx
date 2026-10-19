"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DEPOSITO_LABEL, type ReqDeposito, type ReqIngresoPendiente, type ReqKardexRow, type ReqOsiRepartoRow, type ReqStockRow } from "../lib/req-stock-types";
import { kardex_label, stock_nivel } from "../lib/req-stock-status";
import { ReqDepositosConsumo } from "./req-depositos-consumo";
import { StockNivelBadge } from "./depositos/req-stock-ui";

export function ReqDepositosInspector({
  deposito,
  row,
  kardex,
  osis,
  ingresos,
  kardex_limit,
  busy,
  can_process,
  can_consume = false,
  can_request = false,
  restock_open,
  onInterno,
  onSalida,
  onDanado,
  onIngreso,
  onRestock,
  onMoreKardex,
}: {
  deposito: ReqDeposito;
  row: ReqStockRow | null;
  kardex: ReqKardexRow[];
  osis: ReqOsiRepartoRow[];
  ingresos: ReqIngresoPendiente[];
  kardex_limit: number;
  busy: boolean;
  can_process: boolean;
  /** Consumo / agotado (inventario:consume o process). */
  can_consume?: boolean;
  /** Pedir reabastecimiento (inventario:request). */
  can_request?: boolean;
  restock_open: boolean;
  onInterno: (cantidad: number) => Promise<void>;
  onSalida: (cantidad: number, ids_osi: number[]) => Promise<void>;
  onDanado: (cantidad: number) => Promise<void>;
  onIngreso: (ingreso: ReqIngresoPendiente) => Promise<void>;
  onRestock: () => void;
  onMoreKardex: () => void;
}) {
  const [tab, setTab] = useState<"gestion" | "historial">("gestion");
  const [ingreso_open, setIngresoOpen] = useState(false);

  if (!row) {
    return (
      <div className="flex min-h-[28rem] items-center justify-center rounded-2xl border border-white/70 bg-white/70 p-6 text-sm text-slate-400 shadow-sm backdrop-blur">
        Seleccione un ítem para gestionar el depósito.
      </div>
    );
  }

  const nivel = stock_nivel(Number(row.cantidad), row.minimo ?? 1);
  const sign = (tipo: string, qty: number) =>
    tipo === "entrada" ? `+${qty}` : `−${qty}`;

  return (
    <div className="relative z-10 flex min-h-[28rem] flex-col overflow-visible rounded-2xl border border-sky-100/80 bg-gradient-to-b from-white/95 to-sky-50/70 p-5 shadow-sm backdrop-blur">
      <div className="mb-4 flex gap-1 rounded-full bg-sky-100/70 p-1 text-xs font-medium">
        {(
          [
            ["gestion", "Gestión"],
            ["historial", "Historial"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "flex-1 rounded-full px-3 py-1.5",
              tab === key ? "bg-white text-sky-800 shadow-sm" : "text-sky-700/70",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "gestion" ? (
        <div className="space-y-4">
          <div>
            <p className="text-lg font-semibold text-slate-900">{row.nombre_item}</p>
            <p className="text-xs text-slate-500">{DEPOSITO_LABEL[deposito]}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-2xl font-bold tabular-nums text-slate-900">
                {Number(row.cantidad).toFixed(2)}
              </span>
              <span className="text-sm font-medium text-slate-500">
                {row.unidad || "und"}
              </span>
              <StockNivelBadge nivel={nivel} />
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Mínimo {Number(row.minimo ?? 1).toFixed(2)} {row.unidad || ""}
            </p>
          </div>

          {can_consume || can_process ? (
            <ReqDepositosConsumo
              deposito={deposito}
              unidad={row.unidad}
              osis={osis}
              busy={busy}
              onInterno={onInterno}
              onSalida={onSalida}
              onDanado={onDanado}
            />
          ) : null}

          <div className="relative space-y-2">
            {can_process ? (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setIngresoOpen((v) => !v)}
              >
                Procesar ingreso
              </Button>
            ) : null}
            {can_request ? (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={onRestock}
              >
                Solicitar reabastecimiento
              </Button>
            ) : null}
            {can_process && ingreso_open ? (
              <div className="absolute z-10 mt-2 w-full rounded-xl border bg-white p-3 text-xs shadow-lg">
                {ingresos.length === 0 ? (
                  <p className="text-slate-400">No hay requisiciones pendientes de este ítem.</p>
                ) : (
                  <ul className="space-y-2">
                    {ingresos.map((ing) => (
                      <li key={ing.id_linea} className="flex items-center justify-between gap-2">
                        <Link
                          href={`/requisiciones/view/${ing.id_requisicion}`}
                          className="text-sky-700 underline"
                        >
                          Req #{ing.id_requisicion} · {ing.pendiente.toFixed(2)} pend.
                        </Link>
                        <Button
                          type="button"
                          size="sm"
                          disabled={busy}
                          onClick={() => void onIngreso(ing)}
                        >
                          Ingresar
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}
          </div>
          {restock_open && can_request ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Ya hay una requisición abierta de este artículo. Ábrala desde Gestión o
              cree otra si necesita más cantidad.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <ol className="relative space-y-4 border-l border-sky-200 pl-4">
            {kardex.map((mov) => (
              <li key={mov.id} className="text-sm">
                <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-white bg-sky-400" />
                <p className="font-medium text-slate-800">
                  {kardex_label(mov.tipo)}{" "}
                  <span
                    className={
                      mov.tipo === "entrada" ? "text-emerald-700" : "text-rose-700"
                    }
                  >
                    {sign(mov.tipo, Number(mov.cantidad))}
                  </span>
                </p>
                <p className="text-[11px] text-slate-400">
                  {new Date(mov.creado_en).toLocaleString("es-VE")}
                </p>
                {mov.id_requisicion ? (
                  <Link
                    href={`/requisiciones/view/${mov.id_requisicion}`}
                    className="mr-2 text-xs text-sky-700 underline"
                  >
                    Req #{mov.id_requisicion}
                  </Link>
                ) : null}
                {mov.id_osi ? (
                  <Link
                    href={`/consulta-osi/preview/${mov.id_osi}`}
                    className="text-xs text-sky-700 underline"
                  >
                    OSI #{mov.id_osi}
                  </Link>
                ) : null}
                {mov.notas ? (
                  <p className="text-xs text-slate-500">{mov.notas}</p>
                ) : null}
              </li>
            ))}
            {kardex.length === 0 ? (
              <li className="text-sm text-slate-400">Sin movimientos.</li>
            ) : null}
          </ol>
          <button
            type="button"
            className="mt-4 text-left text-xs text-sky-700 underline"
            onClick={onMoreKardex}
          >
            {kardex_limit <= 80
              ? "Ver historial completo…"
              : `Mostrando ${kardex.length} movimientos`}
          </button>
        </div>
      )}
    </div>
  );
}
