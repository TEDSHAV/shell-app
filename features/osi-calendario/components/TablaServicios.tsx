"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";

import { comparar_eventos, empresa_y_sede, ESTADO_UI, hora_efectiva } from "../lib/estado-sesion";
import { fecha_corta, hora_corta } from "../lib/mes-grid";
import type { EventoCalendario } from "../lib/types";
import { BurbujaComentarios } from "./EventoChip";

type TablaServiciosProps = {
  titulo: string;
  eventos: EventoCalendario[];
  onSelect: (evento: EventoCalendario) => void;
  onComments: (evento: EventoCalendario) => void;
};

type FilaOsi = { id_osi: number; sesiones: EventoCalendario[] };

function agrupar(eventos: EventoCalendario[]): FilaOsi[] {
  const por_osi = new Map<number, EventoCalendario[]>();
  for (const e of eventos) {
    const list = por_osi.get(e.id_osi) ?? [];
    list.push(e);
    por_osi.set(e.id_osi, list);
  }
  return [...por_osi.entries()]
    .map(([id_osi, sesiones]) => ({ id_osi, sesiones: sesiones.sort((a, b) => a.nro_sesion - b.nro_sesion) }))
    .sort((a, b) => a.sesiones[0].fecha_efectiva.localeCompare(b.sesiones[0].fecha_efectiva) || comparar_eventos(a.sesiones[0], b.sesiones[0]));
}

function Sesiones({ sesiones, onSelect }: { sesiones: EventoCalendario[]; onSelect: (e: EventoCalendario) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {sesiones.map((s) => {
        const ui = ESTADO_UI[s.estado];
        const hora = hora_corta(hora_efectiva(s));
        return (
          <button
            key={s.id_sesion}
            type="button"
            onClick={() => onSelect(s)}
            title={`${ui.etiqueta}: ${ui.descripcion}`}
            className={`inline-flex items-center gap-1.5 rounded-md border-l-[3px] px-2.5 py-1 text-[13px] transition ${ui.suave} ${ui.barra}`}
          >
            {sesiones.length > 1 || s.total_sesiones > 1 ? <span className="font-semibold text-slate-700">S{s.nro_sesion}</span> : null}
            <span className="text-slate-600">
              {s.estado === "sin_fecha" ? "Sin fecha" : `${fecha_corta(s.fecha_efectiva)}${hora ? ` · ${hora}` : ""}`}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Avance({ sesiones }: { sesiones: EventoCalendario[] }) {
  const total = Math.max(1, sesiones[0].total_sesiones);
  const ejecutadas = sesiones.filter((s) => s.estado === "ejecutada").length;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-full max-w-[6rem] overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.round((ejecutadas / total) * 100)}%` }} />
      </div>
      <span className="whitespace-nowrap text-[13px] tabular-nums text-slate-500">{ejecutadas}/{total} ejecutadas</span>
    </div>
  );
}

/** Texto en el que busca el buscador de la tabla: OSI, servicio, empresa y sede, ejecutivo y ciudad. */
function texto_busqueda(e: EventoCalendario): string {
  return [e.nro_osi, e.servicio, e.nombre_empresa, e.ejecutivo_negocios, e.ciudad]
    .filter(Boolean)
    .join(" ")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Servicios del periodo agrupados por OSI, con buscador y scroll interno. Tabla en escritorio, tarjetas en teléfono. */
export default function TablaServicios({ titulo, eventos, onSelect, onComments }: TablaServiciosProps) {
  const [busqueda, set_busqueda] = useState("");
  const todas = agrupar(eventos);
  const termino = busqueda.trim().normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const filas = termino ? todas.filter(({ sesiones }) => texto_busqueda(sesiones[0]).includes(termino)) : todas;
  const n_sesiones = filas.reduce((acc, f) => acc + f.sesiones.length, 0);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 pb-3 pt-4 sm:px-5">
        <div className="mr-auto">
          <h3 className="text-lg font-semibold text-slate-900">{titulo}</h3>
          <span className="text-sm text-slate-500">
            {termino && filas.length !== todas.length ? `${filas.length} de ${todas.length} OSIs` : `${filas.length} ${filas.length === 1 ? "OSI" : "OSIs"}`}
            {" · "}
            {n_sesiones} {n_sesiones === 1 ? "sesión" : "sesiones"}
          </span>
        </div>
        <label className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={busqueda}
            onChange={(e) => set_busqueda(e.target.value)}
            placeholder="Buscar OSI, servicio, empresa…"
            aria-label={`Buscar en ${titulo.toLowerCase()}`}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-9 text-sm text-slate-700 outline-none focus:border-slate-400"
          />
          {busqueda ? (
            <button
              type="button"
              onClick={() => set_busqueda("")}
              aria-label="Limpiar búsqueda"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </label>
      </header>

      {filas.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-slate-500">
          {termino ? `Ningún servicio coincide con «${busqueda.trim()}».` : "No hay servicios con los filtros actuales."}
        </p>
      ) : (
        <div className="max-h-[32rem] overflow-y-auto border-t border-slate-100 md:border-t-0">
          <ul className="divide-y divide-slate-100 md:hidden">
            {filas.map(({ id_osi, sesiones }) => {
              const p = sesiones[0];
              const { empresa, sede } = empresa_y_sede(p.nombre_empresa);
              return (
                <li key={id_osi} className="flex flex-col gap-2 px-4 py-3">
                  <div className="flex items-start gap-2">
                    <button type="button" onClick={() => onSelect(p)} className="min-w-0 flex-1 text-left">
                      <p className="text-[15px] font-semibold leading-snug text-slate-900">{p.servicio}</p>
                      <p className="truncate text-sm text-slate-600">{empresa}{sede ? ` · ${sede}` : ""}</p>
                      <p className="text-[13px] text-slate-400">OSI {p.nro_osi ?? id_osi}{p.ciudad ? ` · ${p.ciudad}` : ""}</p>
                    </button>
                    <BurbujaComentarios evento={p} onComments={onComments} />
                  </div>
                  <Sesiones sesiones={sesiones} onSelect={onSelect} />
                  <Avance sesiones={sesiones} />
                </li>
              );
            })}
          </ul>

          <div className="hidden md:block">
            <table className="w-full text-[15px]">
              <thead className="sticky top-0 z-10 bg-white text-left text-[13px] font-medium text-slate-500 shadow-[inset_0_-1px_0_theme(colors.slate.100),inset_0_1px_0_theme(colors.slate.100)]">
                <tr>
                  <th className="px-5 py-2 font-medium">Servicio</th>
                  <th className="px-3 py-2 font-medium">Empresa · Sede</th>
                  <th className="px-3 py-2 font-medium">Sesiones</th>
                  <th className="px-3 py-2 font-medium">Avance</th>
                  <th className="px-5 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filas.map(({ id_osi, sesiones }) => {
                  const p = sesiones[0];
                  const { empresa, sede } = empresa_y_sede(p.nombre_empresa);
                  return (
                    <tr key={id_osi} className="align-top hover:bg-slate-50/60">
                      <td className="max-w-[20rem] px-5 py-3">
                        <button type="button" onClick={() => onSelect(p)} className="text-left font-semibold text-slate-900 hover:underline">
                          {p.servicio}
                        </button>
                        <span className="block text-[13px] text-slate-400">OSI {p.nro_osi ?? id_osi} · {p.ejecutivo_negocios ?? "Sin ejecutivo"}</span>
                      </td>
                      <td className="max-w-[18rem] px-3 py-3">
                        <span className="block truncate text-slate-800">{empresa}</span>
                        <span className="block truncate text-[13px] text-slate-500">{[sede, p.ciudad].filter(Boolean).join(" · ") || "—"}</span>
                      </td>
                      <td className="px-3 py-3"><Sesiones sesiones={sesiones} onSelect={onSelect} /></td>
                      <td className="w-44 px-3 py-3"><Avance sesiones={sesiones} /></td>
                      <td className="px-5 py-3 text-right"><BurbujaComentarios evento={p} onComments={onComments} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
