"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, History } from "lucide-react";
import { list_req_kardex_action } from "@/actions/req-stock";
import { kardex_label } from "../../lib/req-stock-status";
import type { ReqKardexRow } from "../../lib/req-stock-types";

function sign(tipo: string, cantidad: number): string {
  const n = Math.abs(cantidad).toFixed(2);
  return tipo === "entrada" ? `+${n}` : `−${n}`;
}

export function ReqStockAnalisisHistorial({
  id_stock,
  refresh_token = 0,
}: {
  id_stock: number;
  /** Se incrementa tras actualizar stock para recargar si el panel está abierto. */
  refresh_token?: number;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<ReqKardexRow[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setBusy(true);
    void list_req_kardex_action(id_stock, 25).then((data) => {
      if (cancelled) return;
      setRows(data);
      setBusy(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, id_stock, refresh_token]);

  return (
    <div className="mt-2 rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
      >
        <span className="flex items-center gap-1.5">
          {open ? (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-400" />
          )}
          <History className="h-3.5 w-3.5 text-slate-500" />
          Historial de movimientos
        </span>
        <span className="text-[10px] font-normal uppercase tracking-wide text-slate-400">
          {open ? "Ocultar" : "Ver"}
        </span>
      </button>

      {open ? (
        <div className="border-t border-slate-100 px-3 py-2">
          {busy ? (
            <p className="py-2 text-xs text-slate-400">Cargando…</p>
          ) : rows.length === 0 ? (
            <p className="py-2 text-xs text-slate-400">
              Sin movimientos registrados para este ítem.
            </p>
          ) : (
            <ol className="relative max-h-48 space-y-2.5 overflow-y-auto border-l border-slate-200 pl-3">
              {rows.map((mov) => (
                <li key={mov.id} className="relative text-xs">
                  <span className="absolute -left-[0.97rem] mt-1 h-2 w-2 rounded-full border border-white bg-sky-400" />
                  <p className="font-medium text-slate-800">
                    {kardex_label(mov.tipo)}{" "}
                    <span
                      className={
                        mov.tipo === "entrada"
                          ? "tabular-nums text-emerald-700"
                          : "tabular-nums text-rose-700"
                      }
                    >
                      {sign(mov.tipo, Number(mov.cantidad))}
                    </span>
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {new Date(mov.creado_en).toLocaleString("es-VE")}
                  </p>
                  {mov.id_requisicion ? (
                    <Link
                      href={`/requisiciones/view/${mov.id_requisicion}`}
                      className="mr-2 text-[11px] text-sky-700 underline"
                    >
                      Req #{mov.id_requisicion}
                    </Link>
                  ) : null}
                  {mov.id_osi ? (
                    <Link
                      href={`/consulta-osi/preview/${mov.id_osi}`}
                      className="text-[11px] text-sky-700 underline"
                    >
                      OSI #{mov.id_osi}
                    </Link>
                  ) : null}
                  {mov.notas ? (
                    <p className="text-[11px] text-slate-500">{mov.notas}</p>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </div>
      ) : null}
    </div>
  );
}
