"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { list_req_kardex_deposito_action } from "@/actions/req-stock";
import { kardex_label } from "../lib/req-stock-status";
import {
  DEPOSITO_LABEL,
  type ReqDeposito,
  type ReqKardexRow,
} from "../lib/req-stock-types";

const DEPOSITOS: ReqDeposito[] = ["departamento", "capacitacion", "tecnico"];

function ymd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function default_range() {
  const hasta = new Date();
  const desde = new Date();
  desde.setDate(hasta.getDate() - 30);
  return { desde: ymd(desde), hasta: ymd(hasta) };
}

export function ReqDepositosHistorial() {
  const initial = useMemo(() => default_range(), []);
  const [open, setOpen] = useState(false);
  const [desde, setDesde] = useState(initial.desde);
  const [hasta, setHasta] = useState(initial.hasta);
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<ReqKardexRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [groups, setGroups] = useState<Record<ReqDeposito, boolean>>({
    departamento: true,
    capacitacion: true,
    tecnico: true,
  });

  const load = async (start: string, end: string) => {
    setBusy(true);
    const data = await list_req_kardex_deposito_action({
      desde: start,
      hasta: end,
    });
    setRows(data);
    setBusy(false);
  };

  useEffect(() => {
    if (!open) return;
    const range = default_range();
    setDesde(range.desde);
    setHasta(range.hasta);
    setQ("");
    void load(range.desde, range.hasta);
  }, [open]);

  const term = q.trim().toLowerCase();
  const filtered = rows.filter((mov) => {
    if (!term) return true;
    const blob = `${mov.nombre_item} ${kardex_label(mov.tipo)} ${DEPOSITO_LABEL[mov.deposito]} ${mov.notas || ""}`.toLowerCase();
    return blob.includes(term);
  });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          Historial
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col overflow-hidden sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Historial general</SheetTitle>
          <SheetDescription>
            Movimientos de todo el inventario, del más reciente al más antiguo.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-2 border-b px-4 pb-3">
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs text-slate-500">
              Desde
              <Input
                type="date"
                value={desde}
                className="mt-1 h-8"
                onChange={(e) => setDesde(e.target.value)}
              />
            </label>
            <label className="text-xs text-slate-500">
              Hasta
              <Input
                type="date"
                value={hasta}
                className="mt-1 h-8"
                onChange={(e) => setHasta(e.target.value)}
              />
            </label>
            <Button
              type="button"
              size="sm"
              disabled={busy || !desde || !hasta}
              onClick={() => void load(desde, hasta)}
            >
              Filtrar
            </Button>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              value={q}
              placeholder="Buscar ítem, tipo o inventario…"
              className="h-8 pl-8"
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {busy ? <p className="text-sm text-slate-400">Cargando…</p> : null}
          {!busy && filtered.length === 0 ? (
            <p className="text-sm text-slate-400">
              No hay movimientos en ese rango.
            </p>
          ) : null}
          {DEPOSITOS.map((deposito) => {
            const group = filtered.filter((mov) => mov.deposito === deposito);
            if (group.length === 0) return null;
            const is_open = term ? true : groups[deposito];
            return (
              <section
                key={deposito}
                className="rounded-xl border border-slate-100"
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-semibold text-slate-700"
                  onClick={() =>
                    setGroups((prev) => ({
                      ...prev,
                      [deposito]: !prev[deposito],
                    }))
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
                  <ol className="space-y-2 border-t border-slate-100 p-2">
                    {group.map((mov) => (
                      <li
                        key={mov.id}
                        className="rounded-lg border border-slate-50 bg-white px-3 py-2 text-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-slate-800">
                            {mov.nombre_item}
                          </p>
                          <span
                            className={
                              mov.tipo === "entrada"
                                ? "font-semibold text-emerald-700"
                                : "font-semibold text-rose-700"
                            }
                          >
                            {mov.tipo === "entrada" ? "+" : "−"}
                            {Number(mov.cantidad).toFixed(2)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {kardex_label(mov.tipo)} ·{" "}
                          {new Date(mov.creado_en).toLocaleString("es-VE")}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs">
                          {mov.id_requisicion ? (
                            <Link
                              href={`/requisiciones/view/${mov.id_requisicion}`}
                              className="text-sky-700 underline"
                            >
                              Req #{mov.id_requisicion}
                            </Link>
                          ) : null}
                          {mov.id_osi ? (
                            <Link
                              href={`/consulta-osi/preview/${mov.id_osi}`}
                              className="text-sky-700 underline"
                            >
                              OSI #{mov.id_osi}
                            </Link>
                          ) : null}
                        </div>
                        {mov.notas ? (
                          <p className="mt-1 text-xs text-slate-500">
                            {mov.notas}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                ) : null}
              </section>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
