"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Package,
  PackageCheck,
  Warehouse,
} from "lucide-react";
import type { ReqStockDeptCard } from "../../lib/req-stock-group";

export function ReqDepositosDeptCards({
  cards,
  from_query,
}: {
  cards: ReqStockDeptCard[];
  from_query?: string;
}) {
  if (cards.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-14 text-center">
        <Warehouse className="mx-auto mb-3 h-10 w-10 text-slate-300" />
        <p className="text-sm font-medium text-slate-600">
          No hay stock departamental todavía
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Cuando ingresen artículos, verás una tarjeta por departamento.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => {
        const href = `/requisiciones/depositos/departamento/${card.id_departamento}${
          from_query ? `?from=${encodeURIComponent(from_query)}` : ""
        }`;
        const critical = card.alertas > 0;
        return (
          <Link
            key={card.id_departamento}
            href={href}
            className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-amber-400 hover:shadow-md"
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 to-orange-400" />
            <div className="p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-900">
                    <Building2 className="h-6 w-6" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-lg font-bold text-slate-900">
                      {card.nombre}
                    </p>
                    <p className="mt-0.5 text-sm text-slate-500">
                      Almacén departamental
                    </p>
                  </div>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-amber-600" />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-emerald-50 px-2 py-3 text-center">
                  <PackageCheck className="mx-auto mb-1.5 h-4 w-4 text-emerald-700" />
                  <p className="text-xl font-bold tabular-nums text-emerald-950">
                    {card.con_saldo}
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-emerald-800">
                    Con stock
                  </p>
                </div>
                <div
                  className={
                    critical
                      ? "rounded-xl bg-rose-50 px-2 py-3 text-center ring-1 ring-rose-200"
                      : "rounded-xl bg-slate-50 px-2 py-3 text-center"
                  }
                >
                  <AlertTriangle
                    className={
                      critical
                        ? "mx-auto mb-1.5 h-4 w-4 text-rose-700"
                        : "mx-auto mb-1.5 h-4 w-4 text-slate-400"
                    }
                  />
                  <p
                    className={
                      critical
                        ? "text-xl font-bold tabular-nums text-rose-950"
                        : "text-xl font-bold tabular-nums text-slate-800"
                    }
                  >
                    {card.alertas}
                  </p>
                  <p
                    className={
                      critical
                        ? "mt-0.5 text-xs font-medium text-rose-800"
                        : "mt-0.5 text-xs font-medium text-slate-500"
                    }
                  >
                    Stock bajo
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 px-2 py-3 text-center">
                  <Package className="mx-auto mb-1.5 h-4 w-4 text-slate-600" />
                  <p className="text-xl font-bold tabular-nums text-slate-900">
                    {card.total_items}
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-slate-500">
                    Artículos
                  </p>
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
