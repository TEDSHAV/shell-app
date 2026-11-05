"use client";

import { useRef, useState } from "react";
import { Building2, CheckSquare, ChevronDown, ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";

import { ESTADO_UI, ESTADOS_LEYENDA } from "../lib/estado-sesion";
import { contar_filtros_panel, type FiltrosCalendario } from "../lib/filtros";
import type { EstadoSesion } from "../lib/types";
import PanelFiltros, { FiltrosActivos, type OpcionesFiltros } from "./filtros/PanelFiltros";
import SelectorMes from "./SelectorMes";
import SelectorSemana from "./SelectorSemana";

export type Vista = "dia" | "semana" | "mes";

const VISTAS: Array<{ v: Vista; etiqueta: string }> = [
  { v: "dia", etiqueta: "Día" },
  { v: "semana", etiqueta: "Semana" },
  { v: "mes", etiqueta: "Mes" },
];

type EncabezadoProps = {
  /** "Octubre" en vista mes; "2 – 8 nov" en vista semana; "Jueves 5 nov" en vista día. */
  mesTitulo: string;
  anio: string;
  vista: Vista;
  onVista: (v: Vista) => void;
  filtros: FiltrosCalendario;
  conteo: Partial<Record<EstadoSesion, number>>;
  conteoEnSha: number;
  opciones: OpcionesFiltros;
  /** Sesiones por N° de OC en el periodo visible. */
  ocEnPeriodo: Map<string, number>;
  mostrarTipo: boolean;
  onPrev: () => void;
  onNext: () => void;
  onFiltros: (f: FiltrosCalendario) => void;
  /** Vista semana: lunes elegido, hoy y salto directo a otra semana. */
  lunes: string;
  hoy: string;
  onSemana: (lunes: string) => void;
  /** Vista día: día elegido y salto directo a otra fecha. */
  dia: string;
  onDia: (fecha: string) => void;
  /** Vista mes: mes cargado ('YYYY-MM') y salto directo a otro mes. */
  mes: string;
  onMes: (mes: string) => void;
  /** Selección múltiple: solo se ofrece si el usuario tiene algún permiso de acción. */
  puedeSeleccionar: boolean;
  /** Botón «Exportar» (PNG / PDF). */
  exportar: React.ReactNode;
  seleccionando: boolean;
  onSeleccionar: () => void;
};

const ANTERIOR: Record<Vista, string> = { dia: "Día anterior", semana: "Semana anterior", mes: "Mes anterior" };
const SIGUIENTE: Record<Vista, string> = { dia: "Día siguiente", semana: "Semana siguiente", mes: "Mes siguiente" };

/**
 * Arriba: ‹ mes año › y, a la derecha, Filtros (panel plegable).
 * Debajo: la leyenda de estados, que también filtra, y a su derecha el selector Mes | Semana.
 */
export default function Encabezado(props: EncabezadoProps) {
  const { filtros, onFiltros } = props;
  const [panel, set_panel] = useState(false);
  const [selector, set_selector] = useState(false);
  const fecha_input = useRef<HTMLInputElement>(null);
  const set = <K extends keyof FiltrosCalendario>(k: K, v: FiltrosCalendario[K]) => onFiltros({ ...filtros, [k]: v });
  const n_filtros = contar_filtros_panel(filtros);
  const total = Object.values(props.conteo).reduce((a, b) => a + (b ?? 0), 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1">
        <button type="button" onClick={props.onPrev} aria-label={ANTERIOR[props.vista]} className="shrink-0 rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 sm:p-2">
          <ChevronLeft className="h-5 w-5" />
        </button>
        {/* El título abre un selector: anual en vista mes, de semanas en vista semana. */}
        <div className="relative min-w-0">
          <button
            type="button"
            onClick={() => {
              if (props.vista !== "dia") return set_selector((v) => !v);
              try {
                fecha_input.current?.showPicker();
              } catch {
                fecha_input.current?.focus();
              }
            }}
            aria-expanded={props.vista === "dia" ? undefined : selector}
            title={props.vista === "mes" ? "Elegir mes" : props.vista === "semana" ? "Elegir semana" : "Elegir fecha"}
            className="inline-flex min-w-0 items-center gap-1 rounded-lg px-1 hover:bg-slate-100"
          >
            <h2 className={`min-w-0 truncate whitespace-nowrap font-semibold text-slate-900 ${props.vista === "semana" ? "text-lg sm:text-2xl" : props.vista === "dia" ? "text-xl sm:text-[1.7rem]" : "text-xl capitalize sm:text-[1.7rem]"}`}>
              {props.mesTitulo} <span className="font-normal text-slate-400">{props.anio}</span>
            </h2>
            <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${selector ? "rotate-180" : ""}`} />
          </button>
          {props.vista === "dia" ? (
            <input
              ref={fecha_input}
              type="date"
              value={props.dia}
              onChange={(e) => e.target.value && props.onDia(e.target.value)}
              tabIndex={-1}
              aria-hidden
              className="pointer-events-none absolute bottom-0 left-0 h-0 w-0 opacity-0"
            />
          ) : null}
          {selector && props.vista === "semana" ? (
            <SelectorSemana
              lunes={props.lunes}
              hoy={props.hoy}
              onSelect={(l) => {
                set_selector(false);
                props.onSemana(l);
              }}
              onClose={() => set_selector(false)}
            />
          ) : null}
          {selector && props.vista === "mes" ? (
            <SelectorMes
              mes={props.mes}
              hoy={props.hoy}
              onSelect={(m) => {
                set_selector(false);
                props.onMes(m);
              }}
              onClose={() => set_selector(false)}
            />
          ) : null}
        </div>
        <button type="button" onClick={props.onNext} aria-label={SIGUIENTE[props.vista]} className="mr-auto shrink-0 rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 sm:p-2">
          <ChevronRight className="h-5 w-5" />
        </button>
        {props.exportar}
        {props.puedeSeleccionar ? (
          <button
            type="button"
            onClick={props.onSeleccionar}
            aria-pressed={props.seleccionando}
            title={props.seleccionando ? "Terminar selección" : "Seleccionar varias sesiones"}
            className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-[15px] font-medium transition ${props.seleccionando ? "border-sky-700 bg-sky-700 text-white" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}
          >
            <CheckSquare className="h-4 w-4" />
            <span className="hidden sm:inline">{props.seleccionando ? "Listo" : "Seleccionar"}</span>
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => set_panel((v) => !v)}
          aria-expanded={panel}
          className={`relative inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-[15px] font-medium transition ${panel || n_filtros ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Filtros</span>
          {n_filtros ? <span className="rounded-full bg-white/20 px-1.5 text-xs">{n_filtros}</span> : null}
        </button>
      </div>

      {panel ? (
        <PanelFiltros filtros={filtros} onFiltros={onFiltros} opciones={props.opciones} mostrarTipo={props.mostrarTipo} ocEnPeriodo={props.ocEnPeriodo} />
      ) : (
        <FiltrosActivos filtros={filtros} onFiltros={onFiltros} />
      )}

      {/* Estados: en pantallas medianas y grandes bajan de línea en lugar de amontonarse (sidebar abierto); en teléfono se deslizan. */}
      <div className="flex items-start gap-2">
      <div className="-mx-1 flex min-w-0 flex-1 gap-1.5 px-1 max-sm:overflow-x-auto max-sm:pr-6 max-sm:[mask-image:linear-gradient(to_right,black_85%,transparent)] max-sm:[scrollbar-width:none] sm:flex-wrap max-sm:[&::-webkit-scrollbar]:hidden">
        <ChipFiltro
          activo={filtros.estado === ""}
          onClick={() => set("estado", "")}
          titulo="Todas las sesiones del periodo"
          etiqueta="Todos"
          n={total}
        />
        {ESTADOS_LEYENDA.map((estado) => {
          const ui = ESTADO_UI[estado];
          const sel = filtros.estado === estado;
          return (
            <ChipFiltro
              key={estado}
              activo={sel}
              onClick={() => set("estado", sel ? "" : estado)}
              titulo={ui.descripcion}
              etiqueta={ui.etiqueta}
              n={props.conteo[estado] ?? 0}
              icono={<span className={`h-2 w-2 rounded-full ${ui.punto}`} />}
            />
          );
        })}
        <span className="mx-0.5 my-1 w-px shrink-0 self-stretch bg-slate-200" aria-hidden />
        <ChipFiltro
          activo={filtros.en_sha}
          onClick={() => set("en_sha", !filtros.en_sha)}
          titulo="Solo los servicios que se dictan en las instalaciones de SHA (Puerto La Cruz)"
          etiqueta="En SHA"
          n={props.conteoEnSha}
          icono={<Building2 className="h-3.5 w-3.5" />}
          tono="sha"
        />
      </div>
      <div className="inline-flex shrink-0 rounded-lg border border-slate-200 bg-slate-100 p-0.5">
        {VISTAS.map(({ v, etiqueta }) => (
          <button
            key={v}
            type="button"
            onClick={() => props.onVista(v)}
            aria-pressed={props.vista === v}
            className={`rounded-md px-2.5 py-1 text-sm font-medium transition sm:px-3 ${props.vista === v ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
          >
            {etiqueta}
          </button>
        ))}
      </div>
      </div>
    </div>
  );
}

function ChipFiltro({ activo, onClick, titulo, etiqueta, n, icono, tono = "estado" }: {
  activo: boolean;
  onClick: () => void;
  titulo: string;
  etiqueta: string;
  n: number;
  icono?: React.ReactNode;
  tono?: "estado" | "sha";
}) {
  const sel = tono === "sha" ? "border-sky-700 bg-sky-700 text-white" : "border-slate-900 bg-slate-900 text-white";
  return (
    <button
      type="button"
      title={titulo}
      onClick={onClick}
      aria-pressed={activo}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-medium transition ${
        activo ? sel : "border-slate-200 text-slate-600 hover:bg-slate-50"
      } ${n === 0 && !activo ? "opacity-60" : ""}`}
    >
      {icono}
      {etiqueta}
      <span className={`tabular-nums ${activo ? "text-white/70" : "text-slate-400"}`}>{n}</span>
    </button>
  );
}
