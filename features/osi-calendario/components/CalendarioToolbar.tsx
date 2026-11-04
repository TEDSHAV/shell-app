"use client";

import { CalendarDays, CalendarRange, ChevronLeft, ChevronRight, Search, X } from "lucide-react";

import type { EstadoSesion } from "../lib/types";

export type Vista = "mes" | "semana";

export type FiltrosCalendario = {
  texto: string;
  tipo: "" | "capacitacion" | "servicios_tecnicos";
  ejecutivo: string;
  estado: "" | EstadoSesion;
};

export const FILTROS_VACIOS: FiltrosCalendario = { texto: "", tipo: "", ejecutivo: "", estado: "" };

type CalendarioToolbarProps = {
  titulo: string;
  subtitulo: string;
  vista: Vista;
  filtros: FiltrosCalendario;
  ejecutivos: string[];
  mostrarTipo: boolean;
  onPrev: () => void;
  onNext: () => void;
  onHoy: () => void;
  onVista: (v: Vista) => void;
  onFiltros: (f: FiltrosCalendario) => void;
};

const CAMPO = "h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100";

export default function CalendarioToolbar(props: CalendarioToolbarProps) {
  const { filtros, onFiltros } = props;
  const set = <K extends keyof FiltrosCalendario>(k: K, v: FiltrosCalendario[K]) => onFiltros({ ...filtros, [k]: v });
  const hay_filtros = !!(filtros.texto || filtros.tipo || filtros.ejecutivo || filtros.estado);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
          <button type="button" onClick={props.onPrev} aria-label="Anterior" className="rounded-md p-1.5 text-slate-600 transition hover:bg-slate-100">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" onClick={props.onHoy} className="rounded-md px-3 py-1 text-sm font-medium text-slate-700 transition hover:bg-slate-100">
            Hoy
          </button>
          <button type="button" onClick={props.onNext} aria-label="Siguiente" className="rounded-md p-1.5 text-slate-600 transition hover:bg-slate-100">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="min-w-0">
          <h2 className="text-xl font-semibold capitalize leading-tight text-slate-900">{props.titulo}</h2>
          <p className="text-xs text-slate-500">{props.subtitulo}</p>
        </div>
        <div className="ml-auto inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
          {([
            { v: "mes", label: "Mes", icono: CalendarDays },
            { v: "semana", label: "Semana", icono: CalendarRange },
          ] as const).map(({ v, label, icono: Icono }) => (
            <button
              key={v}
              type="button"
              onClick={() => props.onVista(v)}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                props.vista === v ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Icono className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[14rem] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={filtros.texto}
            onChange={(e) => set("texto", e.target.value)}
            placeholder="Buscar N° OSI o empresa"
            className={`${CAMPO} w-full pl-8`}
          />
        </label>
        {props.mostrarTipo ? (
          <select value={filtros.tipo} onChange={(e) => set("tipo", e.target.value as FiltrosCalendario["tipo"])} className={CAMPO} aria-label="Tipo de servicio">
            <option value="">Capacitación y servicios técnicos</option>
            <option value="capacitacion">Solo capacitación</option>
            <option value="servicios_tecnicos">Solo servicios técnicos</option>
          </select>
        ) : null}
        <select value={filtros.ejecutivo} onChange={(e) => set("ejecutivo", e.target.value)} className={CAMPO} aria-label="Ejecutivo">
          <option value="">Todos los ejecutivos</option>
          {props.ejecutivos.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
        {hay_filtros ? (
          <button
            type="button"
            onClick={() => onFiltros(FILTROS_VACIOS)}
            className="inline-flex h-9 items-center gap-1 rounded-lg px-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
          >
            <X className="h-4 w-4" /> Limpiar filtros
          </button>
        ) : null}
      </div>
    </div>
  );
}
