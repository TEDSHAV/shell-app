"use client";

/** Selección de OSIs en la tabla de consulta (acciones en lote sobre sus sesiones). */
export type SeleccionOSI = {
  tiene: (id: number) => boolean;
  alternar: (id: number) => void;
  alternar_varias: (ids: number[]) => void;
};

const CASILLA = "h-4 w-4 cursor-pointer rounded border-gray-300 text-sky-600 focus:ring-sky-500";

export function CasillaOSI({ seleccion, id }: { seleccion?: SeleccionOSI; id: number | null }) {
  if (!seleccion || !id) return null;
  return (
    <input
      type="checkbox"
      checked={seleccion.tiene(id)}
      onChange={() => seleccion.alternar(id)}
      onClick={(e) => e.stopPropagation()}
      aria-label="Seleccionar OSI"
      className={`${CASILLA} mr-1 align-middle`}
    />
  );
}

export function CasillaTodasOSI({ seleccion, ids }: { seleccion?: SeleccionOSI; ids: number[] }) {
  if (!seleccion || !ids.length) return null;
  const todas = ids.every((id) => seleccion.tiene(id));
  const alguna = !todas && ids.some((id) => seleccion.tiene(id));
  return (
    <input
      type="checkbox"
      checked={todas}
      ref={(el) => {
        if (el) el.indeterminate = alguna;
      }}
      onChange={() => seleccion.alternar_varias(ids)}
      aria-label="Seleccionar todas las OSIs de la página"
      className={CASILLA}
    />
  );
}
