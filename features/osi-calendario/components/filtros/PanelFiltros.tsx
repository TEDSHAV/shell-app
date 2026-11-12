"use client";

import { MapPin, Search, Tag, User, X } from "lucide-react";

import { contar_filtros_panel, FILTROS_VACIOS, type EmpresaOpcion, type FiltrosCalendario } from "../../lib/filtros";
import ListaBuscable from "./ListaBuscable";
import SelectorEmpresaSede from "./SelectorEmpresaSede";
import SelectorOrdenCompra from "./SelectorOrdenCompra";

export type OpcionesFiltros = {
  empresas: EmpresaOpcion[];
  ciudades: string[];
  ejecutivos: string[];
};

type PanelFiltrosProps = {
  filtros: FiltrosCalendario;
  onFiltros: (f: FiltrosCalendario) => void;
  opciones: OpcionesFiltros;
  mostrarTipo: boolean;
  ocEnPeriodo: Map<string, number>;
};

const TIPOS = [
  { valor: "capacitacion", etiqueta: "Capacitación" },
  { valor: "servicios_tecnicos", etiqueta: "Servicios técnicos" },
];
const a_opciones = (xs: string[]) => xs.map((x) => ({ valor: x, etiqueta: x }));

/**
 * Panel plegable. Todos los filtros son listas con buscador:
 * texto · tipo · ejecutivo / empresa → sede · ciudad · orden de compra; abajo, los aplicados y «Limpiar filtros».
 */
export default function PanelFiltros({ filtros, onFiltros, opciones, mostrarTipo, ocEnPeriodo }: PanelFiltrosProps) {
  const set = (cambios: Partial<FiltrosCalendario>) => onFiltros({ ...filtros, ...cambios });
  const n = contar_filtros_panel(filtros);

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-slate-50 p-3">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <label className={`relative ${mostrarTipo ? "sm:col-span-2" : "sm:col-span-2 lg:col-span-3"}`}>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={filtros.texto}
            onChange={(e) => set({ texto: e.target.value })}
            placeholder="N° OSI, empresa o servicio"
            className={`h-10 w-full min-w-0 rounded-lg border bg-white pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-slate-400 ${filtros.texto ? "border-slate-900" : "border-slate-200"}`}
          />
        </label>
        {mostrarTipo ? (
          <ListaBuscable
            vacio="Todos los tipos"
            icono={<Tag className="h-4 w-4" />}
            valor={filtros.tipo}
            opciones={TIPOS}
            onChange={(tipo) => set({ tipo: tipo as FiltrosCalendario["tipo"] })}
            buscar="Buscar tipo"
          />
        ) : null}
        <ListaBuscable
          vacio="Todos los ejecutivos"
          icono={<User className="h-4 w-4" />}
          valor={filtros.ejecutivo}
          opciones={a_opciones(opciones.ejecutivos)}
          onChange={(ejecutivo) => set({ ejecutivo })}
          buscar="Buscar ejecutivo"
        />
        <div className="sm:col-span-2">
          <SelectorEmpresaSede empresa={filtros.empresa} sede={filtros.sede} empresas={opciones.empresas} onChange={(empresa, sede) => set({ empresa, sede })} />
        </div>
        <ListaBuscable
          vacio="Todas las ciudades"
          icono={<MapPin className="h-4 w-4" />}
          valor={filtros.ciudad}
          opciones={a_opciones(opciones.ciudades)}
          onChange={(ciudad) => set({ ciudad })}
          buscar="Buscar ciudad"
        />
        <SelectorOrdenCompra valor={filtros.oc} onChange={(oc) => set({ oc })} enPeriodo={ocEnPeriodo} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <FiltrosActivos filtros={filtros} onFiltros={onFiltros} sinQuitarTodos />
        </div>
        <button
          type="button"
          onClick={() => onFiltros({ ...FILTROS_VACIOS, estado: filtros.estado, en_sha: filtros.en_sha })}
          disabled={!n}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-40 max-sm:w-full"
        >
          <X className="h-4 w-4" /> Limpiar filtros
        </button>
      </div>
    </div>
  );
}

const ETIQUETA_TIPO = { capacitacion: "Capacitación", servicios_tecnicos: "Servicios técnicos" } as const;

/** Los filtros aplicados como chips que se quitan con un toque (con el panel cerrado, y dentro del panel junto a «Limpiar filtros»). */
export function FiltrosActivos({ filtros, onFiltros, sinQuitarTodos = false }: { filtros: FiltrosCalendario; onFiltros: (f: FiltrosCalendario) => void; sinQuitarTodos?: boolean }) {
  const chips: Array<{ clave: string; texto: string; quitar: Partial<FiltrosCalendario> }> = [];
  if (filtros.texto) chips.push({ clave: "texto", texto: `“${filtros.texto}”`, quitar: { texto: "" } });
  if (filtros.tipo) chips.push({ clave: "tipo", texto: ETIQUETA_TIPO[filtros.tipo], quitar: { tipo: "" } });
  if (filtros.ejecutivo) chips.push({ clave: "ejecutivo", texto: filtros.ejecutivo, quitar: { ejecutivo: "" } });
  if (filtros.empresa) chips.push({ clave: "empresa", texto: filtros.sede ? `${filtros.empresa} · ${filtros.sede}` : filtros.empresa, quitar: { empresa: "", sede: "" } });
  if (filtros.ciudad) chips.push({ clave: "ciudad", texto: filtros.ciudad, quitar: { ciudad: "" } });
  if (filtros.oc) chips.push({ clave: "oc", texto: `OC ${filtros.oc}`, quitar: { oc: "" } });
  if (!chips.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((c) => (
        <button
          key={c.clave}
          type="button"
          onClick={() => onFiltros({ ...filtros, ...c.quitar })}
          title="Quitar filtro"
          className="inline-flex max-w-[22rem] items-center gap-1 rounded-full bg-slate-900 py-1 pl-3 pr-2 text-xs font-medium text-white hover:bg-slate-700"
        >
          <span className="truncate">{c.texto}</span>
          <X className="h-3.5 w-3.5 shrink-0 opacity-70" />
        </button>
      ))}
      {chips.length > 1 && !sinQuitarTodos ? (
        <button
          type="button"
          onClick={() => onFiltros({ ...FILTROS_VACIOS, estado: filtros.estado, en_sha: filtros.en_sha })}
          className="rounded-full px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
        >
          Quitar todos
        </button>
      ) : null}
    </div>
  );
}
