"use client";

import { ESTADO_UI } from "../lib/estado-sesion";
import type { EstadoSesion, EventoCalendario } from "../lib/types";

type ResumenEstadosProps = {
  eventos: EventoCalendario[];
  activo: "" | EstadoSesion;
  onSelect: (estado: "" | EstadoSesion) => void;
};

const TARJETAS: EstadoSesion[] = ["planificada", "atrasada", "reagendada", "ejecutada", "no_ejecutada"];

/** Tarjetas de conteo por estado. Sirven de leyenda y de filtro (clic para filtrar, clic otra vez para quitarlo). */
export default function ResumenEstados({ eventos, activo, onSelect }: ResumenEstadosProps) {
  const conteo = new Map<EstadoSesion, number>();
  for (const e of eventos) conteo.set(e.estado, (conteo.get(e.estado) ?? 0) + 1);

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      <button
        type="button"
        onClick={() => onSelect("")}
        className={`flex flex-col items-start rounded-xl border px-3 py-2 text-left transition ${activo === "" ? "border-slate-300 bg-slate-50 ring-2 ring-slate-200" : "border-slate-200 bg-white hover:bg-slate-50"}`}
      >
        <span className="text-2xl font-semibold tabular-nums text-slate-900">{eventos.length}</span>
        <span className="text-xs font-medium text-slate-500">Sesiones en el mes</span>
      </button>
      {TARJETAS.map((estado) => {
        const ui = ESTADO_UI[estado];
        const n = conteo.get(estado) ?? 0;
        const sel = activo === estado;
        return (
          <button
            key={estado}
            type="button"
            onClick={() => onSelect(sel ? "" : estado)}
            className={`flex flex-col items-start rounded-xl border px-3 py-2 text-left transition ${sel ? ui.tarjeta : "border-slate-200 bg-white hover:bg-slate-50"} ${n === 0 && !sel ? "opacity-60" : ""}`}
          >
            <span className={`text-2xl font-semibold tabular-nums ${n ? ui.texto : "text-slate-400"}`}>{n}</span>
            <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
              <span className={`h-2 w-2 rounded-full ${ui.punto}`} />
              {ui.corta}
            </span>
          </button>
        );
      })}
    </div>
  );
}
