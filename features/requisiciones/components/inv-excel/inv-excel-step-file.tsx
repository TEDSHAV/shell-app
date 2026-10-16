"use client";

import { useState } from "react";
import { FileSpreadsheet, Upload } from "lucide-react";

export function InvExcelStepFile({
  file,
  on_file,
}: {
  file: File | null;
  on_file: (file: File | null) => void;
}) {
  const [over, set_over] = useState(false);

  function take_file(next: File | null) {
    if (next && !next.name.toLowerCase().endsWith(".xlsx")) return;
    on_file(next);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.8fr)]">
      <label
        onDragOver={(event) => {
          event.preventDefault();
          set_over(true);
        }}
        onDragLeave={() => set_over(false)}
        onDrop={(event) => {
          event.preventDefault();
          set_over(false);
          take_file(event.dataTransfer.files?.[0] ?? null);
        }}
        className={`flex min-h-[280px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
          over
            ? "border-gray-900 bg-gray-50"
            : file
              ? "border-gray-300 bg-gray-50"
              : "border-gray-200 bg-[#f8f9fb] hover:border-gray-400 hover:bg-white"
        }`}
      >
        <input
          className="sr-only"
          type="file"
          accept=".xlsx"
          onChange={(event) => take_file(event.target.files?.[0] ?? null)}
        />
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
          {file ? (
            <FileSpreadsheet className="h-6 w-6 text-gray-800" />
          ) : (
            <Upload className="h-6 w-6 text-gray-500" />
          )}
        </span>
        {file ? (
          <>
            <p className="mt-4 text-base font-semibold text-gray-900">
              {file.name}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {(file.size / 1024).toFixed(0)} KB · clic para cambiar
            </p>
          </>
        ) : (
          <>
            <p className="mt-4 text-base font-semibold text-gray-900">
              Arrastra el Excel de inventario
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Columnas: CONCEPTO, SUSCRIPCIONES, PERIODICIDAD, OBEDECE A UN
              SERVICIO
            </p>
          </>
        )}
      </label>
      <div className="space-y-3 rounded-2xl border border-gray-100 bg-[#f8f9fb] p-4 text-sm text-gray-600">
        <p className="font-medium text-gray-900">Qué hace esta carga</p>
        <ul className="list-disc space-y-1 pl-4">
          <li>Crea u homologa artículos en el catálogo.</li>
          <li>Marca consumible vs suscripción (recurrente).</li>
          <li>Arma stock en 0 para consumibles (no para suscripciones).</li>
        </ul>
      </div>
    </div>
  );
}
