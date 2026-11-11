"use client";

import { useCallback, useMemo, useState } from "react";

/** Selección múltiple por id (sesiones en el calendario, OSIs en Consulta). */
export function useSeleccion<T extends number = number>() {
  const [ids, set_ids] = useState<Set<T>>(new Set());
  const [activa, set_activa] = useState(false);

  const alternar = useCallback((id: T) => {
    set_ids((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  /** Si todas las dadas ya están, las quita; si no, las agrega (p. ej. todas las sesiones de un día). */
  const alternar_varias = useCallback((lista: T[]) => {
    set_ids((prev) => {
      const next = new Set(prev);
      const todas = lista.length > 0 && lista.every((id) => next.has(id));
      for (const id of lista) {
        if (todas) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }, []);

  const limpiar = useCallback(() => set_ids(new Set()), []);
  const salir = useCallback(() => {
    set_ids(new Set());
    set_activa(false);
  }, []);

  return useMemo(
    () => ({ ids, activa, set_activa, alternar, alternar_varias, limpiar, salir, tiene: (id: T) => ids.has(id), cantidad: ids.size }),
    [ids, activa, alternar, alternar_varias, limpiar, salir],
  );
}
