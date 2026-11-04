"use client";

import { useState } from "react";

import BarraLote from "@/features/osi-calendario/components/lote/BarraLote";
import DialogoLote from "@/features/osi-calendario/components/lote/DialogoLote";
import type { useSeleccion } from "@/features/osi-calendario/hooks/use-seleccion";
import type { AccionSesion, PermisosSesion } from "@/features/osi-calendario/lib/types";

type ConsultaOSILoteProps = {
  seleccion: ReturnType<typeof useSeleccion>;
  permisos: PermisosSesion;
  hoy: string;
  onDone: () => void;
};

/** Acciones en lote sobre las sesiones abiertas de las OSIs marcadas (mismo helper que el calendario). */
export function ConsultaOSILote({ seleccion, permisos, hoy, onDone }: ConsultaOSILoteProps) {
  const [accion, set_accion] = useState<AccionSesion | null>(null);
  const [aviso, set_aviso] = useState<string | null>(null);

  return (
    <>
      <BarraLote cantidad={seleccion.cantidad} unidad={["OSI", "OSIs"]} permisos={permisos} onAccion={set_accion} onLimpiar={seleccion.limpiar} />
      <DialogoLote
        accion={accion}
        objetivo={{ tipo: "osis", ids: [...seleccion.ids] }}
        hoy={hoy}
        onClose={() => set_accion(null)}
        onDone={(mensaje) => {
          set_accion(null);
          seleccion.limpiar();
          set_aviso(mensaje);
          window.setTimeout(() => set_aviso(null), 5000);
          onDone();
        }}
      />
      {aviso ? (
        <div role="status" className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-lg">
          {aviso}
        </div>
      ) : null}
    </>
  );
}
