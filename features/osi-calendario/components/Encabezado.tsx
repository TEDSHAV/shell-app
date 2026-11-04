"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal, X } from "lucide-react";

import { ESTADO_UI, ESTADOS_LEYENDA } from "../lib/estado-sesion";
import type { EstadoSesion } from "../lib/types";

export type FiltrosCalendario = {
  texto: string;
  tipo: "" | "capacitacion" | "servicios_tecnicos";
  ejecutivo: string;
  estado: "" | EstadoSesion;
};

export const FILTROS_VACIOS: FiltrosCalendario = { texto: "", tipo: "", ejecutivo: "", estado: "" };

type EncabezadoProps = {
  mesTitulo: string;
  anio: string;
  filtros: FiltrosCalendario;
  conteo: Partial<Record<EstadoSesion, number>>;
  ejecutivos: string[];
  mostrarTipo: boolean;
  onPrev: () => void;
  onNext: () => void;
  onHoy: () => void;
  onFiltros: (f: FiltrosCalendario) => void;
};

const CAMPO = "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-slate-400";

/**
 * Una fila: mes con flechas y "Hoy"; a la derecha, buscar y filtros (en un panel plegable).
 * Debajo, la leyenda de estados, que también filtra.
 */
export default function Encabezado(props: EncabezadoProps) {
  const { filtros, onFiltros } = props;
  const [panel, set_panel] = useState(false);
  const set = <K extends keyof FiltrosCalendario>(k: K, v: FiltrosCalendario[K]) => onFiltros({ ...filtros, [k]: v });
  const n_filtros = [filtros.texto, filtros.tipo, filtros.ejecutivo].filter(Boolean).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h2 className="mr-auto whitespace-nowrap text-lg font-semibold capitalize text-slate-900 sm:text-2xl">
          {props.mesTitulo} <span className="font-normal text-slate-400">{props.anio}</span>
        </h2>
        <button type="button" onClick={props.onHoy} className="h-9 rounded-lg border border-slate-200 px-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:px-3">
          Hoy
        </button>
        <div className="flex">
          <button type="button" onClick={props.onPrev} aria-label="Mes anterior" className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 sm:p-2">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button type="button" onClick={props.onNext} aria-label="Mes siguiente" className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 sm:p-2">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => set_panel((v) => !v)}
          aria-expanded={panel}
          className={`relative inline-flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-sm font-medium transition ${panel || n_filtros ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Filtros</span>
          {n_filtros ? <span className="rounded-full bg-white/20 px-1.5 text-xs">{n_filtros}</span> : null}
        </button>
      </div>

      {panel ? (
        <div className="grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-[1fr_auto_auto_auto]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={filtros.texto} onChange={(e) => set("texto", e.target.value)} placeholder="N° OSI, empresa o servicio" className={`${CAMPO} pl-9`} />
          </label>
          {props.mostrarTipo ? (
            <select value={filtros.tipo} onChange={(e) => set("tipo", e.target.value as FiltrosCalendario["tipo"])} className={CAMPO} aria-label="Tipo de servicio">
              <option value="">Todos los tipos</option>
              <option value="capacitacion">Capacitación</option>
              <option value="servicios_tecnicos">Servicios técnicos</option>
            </select>
          ) : null}
          <select value={filtros.ejecutivo} onChange={(e) => set("ejecutivo", e.target.value)} className={CAMPO} aria-label="Ejecutivo">
            <option value="">Todos los ejecutivos</option>
            {props.ejecutivos.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => onFiltros({ ...FILTROS_VACIOS, estado: filtros.estado })}
            disabled={!n_filtros}
            className="inline-flex h-10 items-center justify-center gap-1 rounded-lg px-3 text-sm font-medium text-slate-600 hover:bg-slate-200 disabled:opacity-40"
          >
            <X className="h-4 w-4" /> Limpiar
          </button>
        </div>
      ) : null}

      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {ESTADOS_LEYENDA.map((estado) => {
          const ui = ESTADO_UI[estado];
          const sel = filtros.estado === estado;
          const n = props.conteo[estado] ?? 0;
          return (
            <button
              key={estado}
              type="button"
              title={ui.descripcion}
              onClick={() => set("estado", sel ? "" : estado)}
              aria-pressed={sel}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
                sel ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${ui.punto}`} />
              {ui.etiqueta}
              <span className={`tabular-nums ${sel ? "text-white/70" : "text-slate-400"}`}>{n}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
