"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { NumberInput } from "@/components/ui/number-input";
import type { ReqDeposito, ReqOsiRepartoRow } from "../lib/req-stock-types";

function day_key(value: string | null): string | null {
  if (!value) return null;
  return value.slice(0, 10);
}

function month_cells(cursor: Date) {
  const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const pad = (start.getDay() + 6) % 7;
  const days = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells: Array<{ date: Date | null; iso: string | null }> = [];
  for (let i = 0; i < pad; i += 1) cells.push({ date: null, iso: null });
  for (let day = 1; day <= days; day += 1) {
    const date = new Date(cursor.getFullYear(), cursor.getMonth(), day);
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({ date, iso });
  }
  return cells;
}

type PanelPos = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

export function ReqDepositosConsumo({
  deposito,
  unidad,
  unidad_contenido = null,
  unidades_por_empaque = null,
  osis,
  busy,
  onInterno,
  onSalida,
  onDanado,
}: {
  deposito: ReqDeposito;
  unidad: string | null;
  unidad_contenido?: string | null;
  unidades_por_empaque?: number | null;
  osis: ReqOsiRepartoRow[];
  busy: boolean;
  onInterno: (cantidad: number) => Promise<void>;
  onSalida: (cantidad: number, ids_osi: number[]) => Promise<void>;
  onDanado: (cantidad: number) => Promise<void>;
}) {
  const panel_id = `req-consumo-${useId().replace(/:/g, "")}`;
  const root_ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState(1);
  const [salida_modo, setSalidaModo] = useState<"empaque" | "contenido">(
    "empaque",
  );
  const [danado, setDanado] = useState(false);
  const has_escalera =
    unidades_por_empaque != null &&
    Number(unidades_por_empaque) > 0 &&
    Boolean(unidad_contenido || unidad);
  const [picked, setPicked] = useState<number[]>(() => osis.map((row) => row.id_osi));
  const [cursor, setCursor] = useState(() => new Date());
  const [pos, setPos] = useState<PanelPos>({
    top: 0,
    left: 0,
    width: 288,
    maxHeight: 360,
  });

  useEffect(() => {
    setPicked(osis.map((row) => row.id_osi));
  }, [osis]);

  const marked = useMemo(() => {
    const set = new Set<string>();
    for (const osi of osis) {
      const key = day_key(osi.fecha_culminacion || osi.fecha_emision);
      if (key) set.add(key);
    }
    return set;
  }, [osis]);

  const is_depto = deposito === "departamento";

  function place() {
    const box = root_ref.current?.getBoundingClientRect();
    if (!box) return;
    const gap = 8;
    const width = Math.max(box.width, 288);
    const space_below = window.innerHeight - box.bottom - gap;
    const space_above = box.top - gap;
    const preferred = Math.min(420, Math.max(space_below, space_above, 220));
    const maxHeight = Math.min(preferred, Math.max(space_below, space_above) - 4);
    const open_up = space_below < 280 && space_above > space_below;
    const left = Math.min(
      Math.max(8, box.left),
      Math.max(8, window.innerWidth - width - 8),
    );
    setPos({
      top: open_up ? Math.max(8, box.top - gap - maxHeight) : box.bottom + gap,
      left,
      width,
      maxHeight: Math.max(200, maxHeight),
    });
  }

  useEffect(() => {
    if (!open) return;
    place();
    function on_doc(event: MouseEvent) {
      const node = event.target as Node;
      if (root_ref.current?.contains(node)) return;
      const panel = document.getElementById(panel_id);
      if (panel?.contains(node)) return;
      setOpen(false);
    }
    function on_reflow() {
      place();
    }
    document.addEventListener("mousedown", on_doc);
    window.addEventListener("resize", on_reflow);
    window.addEventListener("scroll", on_reflow, true);
    return () => {
      document.removeEventListener("mousedown", on_doc);
      window.removeEventListener("resize", on_reflow);
      window.removeEventListener("scroll", on_reflow, true);
    };
  }, [open, panel_id]);

  const qty_stock = (() => {
    if (!has_escalera || salida_modo === "empaque") return qty;
    const factor = Number(unidades_por_empaque);
    if (!Number.isFinite(factor) || factor <= 0) return qty;
    return Math.round((qty / factor) * 1000) / 1000;
  })();

  const submit = async () => {
    if (danado) {
      await onDanado(qty_stock);
      setOpen(false);
      return;
    }
    if (is_depto) {
      await onInterno(qty_stock);
      setOpen(false);
      return;
    }
    await onSalida(qty_stock, picked);
    setOpen(false);
  };

  const panel =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            id={panel_id}
            style={{
              top: pos.top,
              left: pos.left,
              width: pos.width,
              maxHeight: pos.maxHeight,
            }}
            className="fixed z-[80] flex flex-col overflow-hidden rounded-2xl border border-white/70 bg-white/95 shadow-xl backdrop-blur"
          >
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
              {!is_depto ? (
                <>
                  <div className="flex items-center justify-between text-sm font-medium">
                    <button
                      type="button"
                      onClick={() =>
                        setCursor(
                          new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1),
                        )
                      }
                    >
                      ‹
                    </button>
                    <span>
                      {cursor.toLocaleDateString("es-VE", {
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setCursor(
                          new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1),
                        )
                      }
                    >
                      ›
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center text-[10px]">
                    {["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"].map((d) => (
                      <span key={d} className="text-slate-400">
                        {d}
                      </span>
                    ))}
                    {month_cells(cursor).map((cell, idx) => (
                      <span
                        key={idx}
                        className={`rounded-full py-1 ${
                          cell.iso && marked.has(cell.iso)
                            ? "bg-sky-600 text-white"
                            : "text-slate-600"
                        }`}
                      >
                        {cell.date ? cell.date.getDate() : ""}
                      </span>
                    ))}
                  </div>
                  <ul className="max-h-24 space-y-1 overflow-y-auto text-xs">
                    {osis.map((osi) => (
                      <li key={osi.id_osi} className="flex items-center gap-2">
                        <Checkbox
                          checked={picked.includes(osi.id_osi)}
                          onCheckedChange={(checked) =>
                            setPicked((prev) =>
                              checked
                                ? [...prev, osi.id_osi]
                                : prev.filter((id) => id !== osi.id_osi),
                            )
                          }
                        />
                        <span>
                          OSI #{osi.nro_osi_secuencial}
                          {osi.fecha_culminacion
                            ? ` (${new Date(osi.fecha_culminacion).toLocaleDateString("es-VE")})`
                            : ""}
                        </span>
                      </li>
                    ))}
                    {osis.length === 0 ? (
                      <li className="text-slate-400">No hay OSI pendientes.</li>
                    ) : null}
                  </ul>
                </>
              ) : null}
              {has_escalera ? (
                <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5 text-[11px] font-medium">
                  <button
                    type="button"
                    className={`flex-1 rounded-md px-2 py-1 ${
                      salida_modo === "empaque"
                        ? "bg-white shadow-sm"
                        : "text-slate-500"
                    }`}
                    onClick={() => setSalidaModo("empaque")}
                  >
                    {unidad || "Empaque"}
                  </button>
                  <button
                    type="button"
                    className={`flex-1 rounded-md px-2 py-1 ${
                      salida_modo === "contenido"
                        ? "bg-white shadow-sm"
                        : "text-slate-500"
                    }`}
                    onClick={() => setSalidaModo("contenido")}
                  >
                    {unidad_contenido || "Unidad"}
                  </button>
                </div>
              ) : null}
              <div className="flex items-center gap-2">
                <NumberInput
                  value={qty}
                  min={0}
                  allowDecimal
                  className="h-8 w-24 text-xs"
                  onValueChange={setQty}
                />
                <span className="text-xs text-slate-500">
                  {has_escalera && salida_modo === "contenido"
                    ? unidad_contenido || "und"
                    : unidad || ""}
                </span>
              </div>
              {has_escalera && salida_modo === "contenido" ? (
                <p className="text-[11px] text-slate-500">
                  ≈ {qty_stock} {unidad || "empaque"}
                  {unidades_por_empaque
                    ? ` (${unidades_por_empaque} ${unidad_contenido || "und"}/caja)`
                    : ""}
                </p>
              ) : null}
              <label className="flex items-center gap-2 text-xs">
                <Checkbox
                  checked={danado}
                  onCheckedChange={(checked) => setDanado(Boolean(checked))}
                />
                Marcar como dañado / roto
              </label>
            </div>
            <div className="shrink-0 border-t border-slate-100 p-3">
              <Button
                type="button"
                className="w-full"
                disabled={busy}
                onClick={() => void submit()}
              >
                Confirmar consumo
              </Button>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={root_ref} className="relative">
      <Button type="button" className="w-full" onClick={() => setOpen((v) => !v)}>
        {is_depto ? "Registrar consumo interno" : "Registrar consumo / salida"}
      </Button>
      {panel}
    </div>
  );
}
