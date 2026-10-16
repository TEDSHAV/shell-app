"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export function InvExcelStepDone({
  created,
  updated,
  stocked,
  skipped_recurrente,
  failed,
}: {
  created: number;
  updated: number;
  stocked: number;
  skipped_recurrente: number;
  failed: string[];
}) {
  return (
    <div className="mx-auto max-w-lg space-y-5 text-center">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Carga lista</h2>
        <p className="mt-1 text-sm text-gray-500">
          Resumen de lo aplicado en catálogo e inventario.
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
          <dt className="text-gray-500">Creados</dt>
          <dd className="text-lg font-semibold tabular-nums">{created}</dd>
        </div>
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
          <dt className="text-gray-500">Homologados</dt>
          <dd className="text-lg font-semibold tabular-nums">{updated}</dd>
        </div>
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
          <dt className="text-gray-500">Stock (filas)</dt>
          <dd className="text-lg font-semibold tabular-nums">{stocked}</dd>
        </div>
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
          <dt className="text-gray-500">Suscripciones</dt>
          <dd className="text-lg font-semibold tabular-nums">
            {skipped_recurrente}
          </dd>
        </div>
      </dl>
      {failed.length > 0 ? (
        <div className="max-h-40 overflow-y-auto rounded-xl border border-red-100 bg-red-50 p-3 text-left text-xs text-red-700">
          {failed.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      ) : null}
      <Button asChild>
        <Link href="/requisiciones/depositos">Volver a Inventario</Link>
      </Button>
    </div>
  );
}
