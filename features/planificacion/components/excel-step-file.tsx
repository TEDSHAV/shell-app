"use client";

import { useState } from "react";
import { FileSpreadsheet, Upload } from "lucide-react";
import { Label } from "@/components/ui/label";

export function ExcelStepFile({
  anio,
  file,
  on_anio,
  on_file,
}: {
  anio: string;
  file: File | null;
  on_anio: (value: string) => void;
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
              Arrastra el Excel aquí
            </p>
            <p className="mt-1 text-sm text-gray-500">
              o haz clic para elegir un archivo .xlsx
            </p>
          </>
        )}
      </label>

      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Año por defecto</h2>
          <p className="mt-1 text-sm text-gray-500">
            Si una tarea no trae fecha, usa el 1 de enero de este año. El Gantt
            toma el mes desde el rango o la fecha de cada tarea.
          </p>
        </div>
        <div>
          <Label>Año</Label>
          <input
            className="mt-1 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800"
            type="number"
            value={anio}
            onChange={(event) => on_anio(event.target.value)}
          />
        </div>
        <div className="rounded-xl border border-gray-100 bg-[#f8f9fb] px-4 py-3 text-xs leading-5 text-gray-500">
          Columnas: APP, Módulo, Tarea / Feature, Origen, Estado, Entregables.
          En APP va una sola (NEGOCIOS) o varias separadas por coma
          (NEGOCIOS, ADMINISTRACIÓN). GENERAL es el Shell / transversal, no
          Prisma. Fechas opcionales: Fecha, Inicio, Fin.
        </div>
      </div>
    </div>
  );
}
