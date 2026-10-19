"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Building2, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  STOCK_NIVEL_CLASS,
  STOCK_NIVEL_LABEL,
  type StockNivel,
} from "../../lib/req-stock-status";

/** Badge de estatus legible (estilo almacén). */
export function StockNivelBadge({
  nivel,
  className,
}: {
  nivel: StockNivel;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-lg border px-3 py-1.5 text-sm font-semibold tracking-wide",
        STOCK_NIVEL_CLASS[nivel],
        className,
      )}
    >
      {STOCK_NIVEL_LABEL[nivel]}
    </span>
  );
}

/** Chip de departamento clickeable / solo lectura. */
export function StockDeptChip({
  nombre,
  href,
  cantidad,
  nivel,
  className,
}: {
  nombre: string;
  href?: string;
  cantidad?: number;
  nivel?: StockNivel;
  className?: string;
}) {
  const inner = (
    <>
      <MapPin className="h-4 w-4 shrink-0 opacity-70" />
      <span className="max-w-[12rem] truncate font-semibold">{nombre}</span>
      {cantidad != null ? (
        <span className="tabular-nums font-medium opacity-80">
          {cantidad.toFixed(0)}
        </span>
      ) : null}
    </>
  );

  const base = cn(
    "inline-flex max-w-full items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm",
    nivel === "agotado"
      ? "border-rose-200 bg-rose-50 text-rose-900"
      : nivel === "bajo"
        ? "border-amber-200 bg-amber-50 text-amber-950"
        : "border-slate-200 bg-slate-50 text-slate-800",
    href && "transition hover:border-amber-400 hover:bg-amber-50",
    className,
  );

  if (href) {
    return (
      <Link
        href={href}
        onClick={(event) => event.stopPropagation()}
        className={base}
        title={
          cantidad != null && nivel
            ? `${nombre}: ${cantidad.toFixed(2)} · ${STOCK_NIVEL_LABEL[nivel]}`
            : nombre
        }
      >
        {inner}
      </Link>
    );
  }

  return <span className={base}>{inner}</span>;
}

export function StockWarehouseShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-full min-h-[28rem] w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function StockSectionBanner({
  title,
  count,
  icon,
  open,
  on_toggle,
}: {
  title: string;
  count: number;
  icon: ReactNode;
  open: boolean;
  on_toggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={on_toggle}
      className="flex w-full items-center justify-between gap-3 border-b border-slate-200/80 bg-white px-4 py-3 text-left transition hover:bg-amber-50/40"
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-900">
          {icon}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-slate-900">
            {title}
          </span>
          <span className="text-xs text-slate-500">
            {count} {count === 1 ? "artículo" : "artículos"}
          </span>
        </span>
      </span>
      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
        {open ? "Ocultar" : "Ver"}
      </span>
    </button>
  );
}

export function StockDeptLabel({
  nombre,
  className,
}: {
  nombre: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-sm font-medium text-slate-700",
        className,
      )}
    >
      <Building2 className="h-4 w-4 shrink-0 text-slate-400" />
      <span className="truncate">{nombre}</span>
    </span>
  );
}
