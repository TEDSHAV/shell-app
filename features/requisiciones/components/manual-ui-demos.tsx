"use client";

import type { ReactNode } from "react";
import {
  Building2,
  ChevronRight,
  GraduationCap,
  History,
  Minus,
  Package,
  Plus,
  Wrench,
} from "lucide-react";

import {
  ReqAltaPasoComoSeUsa,
  ReqAltaPasoParaQuien,
} from "./alta/req-alta-paso-destino";

/** Marco visual reutilizable en los manuales (copia del estilo Figure de costos). */
export function ManualFigure({
  title,
  caption,
  children,
}: {
  title: string;
  caption: string;
  children: ReactNode;
}) {
  return (
    <figure className="space-y-2">
      <figcaption className="text-sm font-medium text-slate-800">
        {title}
      </figcaption>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        {children}
      </div>
      <p className="text-sm leading-relaxed text-slate-500">{caption}</p>
    </figure>
  );
}

export function DemoStockBadge({
  nivel,
}: {
  nivel: "en_stock" | "bajo" | "agotado";
}) {
  const map = {
    en_stock: {
      label: "En stock",
      className: "bg-emerald-100 text-emerald-900 border-emerald-300",
    },
    bajo: {
      label: "Bajo",
      className: "bg-amber-100 text-amber-950 border-amber-300",
    },
    agotado: {
      label: "Agotado",
      className: "bg-rose-100 text-rose-950 border-rose-300",
    },
  } as const;
  const row = map[nivel];
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${row.className}`}
    >
      {row.label}
    </span>
  );
}

export function DemoInvTabs() {
  const tabs = [
    { label: "Todos", Icon: Package, active: false },
    { label: "Departamentos", Icon: Building2, active: false },
    { label: "Serv. capacitación", Icon: GraduationCap, active: true },
    { label: "Serv. técnico", Icon: Wrench, active: false },
  ];
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
      {tabs.map((tab) => (
        <span
          key={tab.label}
          className={
            tab.active
              ? "inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white"
              : "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700"
          }
        >
          <tab.Icon className="h-3.5 w-3.5" />
          {tab.label}
        </span>
      ))}
    </div>
  );
}

export function DemoArticleCard({
  nombre,
  ubicacion,
  cantidad,
  unidad,
  nivel,
}: {
  nombre: string;
  ubicacion: string;
  cantidad: string;
  unidad: string;
  nivel: "en_stock" | "bajo" | "agotado";
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-800">
        <Package className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{nombre}</p>
        <p className="text-xs text-slate-500">{ubicacion}</p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <DemoStockBadge nivel={nivel} />
        <p className="text-xs font-semibold tabular-nums text-slate-800">
          {cantidad} {unidad}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 text-slate-400" />
    </div>
  );
}

export function DemoConsumoBlock() {
  return (
    <div className="space-y-2 rounded-xl border border-rose-100 bg-rose-50/50 p-3">
      <p className="text-sm font-semibold text-rose-950">
        Consumo del stock actual
      </p>
      <p className="text-xs text-rose-900/70">
        Arranca en lo que hay ahora. − implica consumo; + deshace hasta el
        stock real.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white">
            <Minus className="h-4 w-4" />
          </span>
          <div className="min-w-[3.5rem] text-center">
            <p className="text-lg font-bold tabular-nums text-rose-700">1</p>
            <p className="text-[10px] text-slate-500">quedan (CAJA)</p>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white">
            <Plus className="h-4 w-4" />
          </span>
        </div>
        <span className="text-sm text-rose-700">Marcar agotado</span>
        <span className="rounded-xl bg-amber-600 px-3 py-2 text-xs font-semibold text-white">
          Actualizar stock
        </span>
      </div>
    </div>
  );
}

function DemoStepper({
  value,
  label,
  tone,
}: {
  value: string;
  label: string;
  tone: "emerald" | "rose";
}) {
  const border =
    tone === "emerald" ? "border-emerald-200" : "border-rose-200";
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-xl border ${border} bg-white`}
      >
        <Minus className="h-4 w-4 text-slate-500" />
      </span>
      <div className="min-w-[3.25rem] text-center">
        <p
          className={`text-lg font-bold tabular-nums ${
            tone === "emerald" ? "text-emerald-800" : "text-rose-700"
          }`}
        >
          {value}
        </p>
        <p className="text-[10px] text-slate-500">{label}</p>
      </div>
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-xl border ${border} bg-white`}
      >
        <Plus className="h-4 w-4 text-slate-500" />
      </span>
    </div>
  );
}

export function DemoStockAnalisis() {
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
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-800">
              <Package className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-slate-900">
                AGUAS
              </p>
              <p className="mt-0.5 text-sm text-slate-500">
                Ejecución Capacitación
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <DemoStockBadge nivel="en_stock" />
            <p className="text-right text-sm text-slate-600">
              Stock actual{" "}
              <span className="font-bold tabular-nums text-slate-900">2.00</span>{" "}
              CAJA
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-center text-xs text-slate-600">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-slate-400">
              Stock
            </p>
            <p className="text-base font-bold tabular-nums text-slate-900">2</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-slate-400">
              − Consumo
            </p>
            <p className="text-base font-bold tabular-nums text-slate-400">0</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-slate-400">
              + Pedido
            </p>
            <p className="text-base font-bold tabular-nums text-emerald-800">1</p>
          </div>
          <p className="col-span-3 border-t border-slate-200 pt-2 text-sm text-slate-700">
            Quedarían 2.00 + lo pedido →{" "}
            <span className="font-semibold text-emerald-800">3.00 CAJA</span>
          </p>
        </div>

        <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/40 px-3 py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-emerald-950">
                Pedido en la requisición
              </p>
              <p className="text-xs text-emerald-900/70">
                Cambia la cantidad de la tabla de arriba. No toca el stock.
              </p>
            </div>
            <DemoStepper value="1" label="CAJA" tone="emerald" />
          </div>
        </div>

        <div className="mt-2 rounded-xl border border-rose-100 bg-rose-50/40 px-3 py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-rose-950">
                Consumo del stock actual
              </p>
              <p className="text-xs text-rose-900/70">
                Arranca en lo que hay ahora. − implica consumo; + deshace hasta
                el stock real.
              </p>
            </div>
            <DemoStepper value="2" label="stock actual (CAJA)" tone="rose" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function DemoReqLinea() {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-300 bg-white text-xs">
      <div className="grid grid-cols-[2rem_4rem_3rem_1fr_4rem] border-b border-slate-200 bg-slate-50 text-center font-semibold uppercase text-slate-600">
        <span className="border-r border-slate-200 p-2">#</span>
        <span className="border-r border-slate-200 p-2">Unidad</span>
        <span className="border-r border-slate-200 p-2">Cant</span>
        <span className="border-r border-slate-200 p-2 text-left">
          Descripción
        </span>
        <span className="p-2">Total</span>
      </div>
      <div className="grid grid-cols-[2rem_4rem_3rem_1fr_4rem] text-center">
        <span className="border-r border-slate-200 p-2 font-bold">1</span>
        <span className="border-r border-slate-200 p-2 uppercase">Caja</span>
        <span className="border-r border-slate-200 p-2 font-bold">1</span>
        <span className="border-r border-slate-200 p-2 text-left font-semibold uppercase">
          Aguas
        </span>
        <span className="bg-yellow-50 p-2 font-bold">$40.00</span>
      </div>
    </div>
  );
}

export function DemoHistorialRow() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
      <button
        type="button"
        className="flex w-full items-center justify-between text-left text-sm font-medium text-slate-700"
      >
        <span className="flex items-center gap-1.5">
          <ChevronRight className="h-4 w-4 text-slate-400" />
          <History className="h-3.5 w-3.5 text-slate-500" />
          Historial de movimientos
        </span>
        <span className="text-[10px] uppercase tracking-wide text-slate-400">
          Ver
        </span>
      </button>
    </div>
  );
}

/** Copia congelada del paso «Para quién» (tarjetas actuales). */
export function DemoReqPasoParaQuien({
  selected = "departamento",
}: {
  selected?: "departamento" | "servicio";
}) {
  return (
    <div className="pointer-events-none select-none [&_button]:cursor-default">
      <ReqAltaPasoParaQuien
        destino={selected}
        on_destino={() => undefined}
      />
    </div>
  );
}

/** Copia congelada del paso «Uso» (tarjetas actuales). */
export function DemoReqPasoComoSeUsa({
  selected = "directo",
}: {
  selected?: "directo" | "inventario" | null;
}) {
  return (
    <div className="pointer-events-none select-none [&_button]:cursor-default">
      <ReqAltaPasoComoSeUsa
        servicio={selected}
        on_servicio={() => undefined}
      />
    </div>
  );
}

/** @deprecated Usar DemoReqPasoParaQuien / DemoReqPasoComoSeUsa */
export function DemoReqDestinoQuestions({
  variant,
}: {
  variant: "interna" | "servicio";
}) {
  if (variant === "interna") {
    return <DemoReqPasoParaQuien selected="departamento" />;
  }
  return (
    <div className="space-y-4">
      <DemoReqPasoParaQuien selected="servicio" />
      <DemoReqPasoComoSeUsa selected="directo" />
    </div>
  );
}
