"use client";

import { MessageSquare, Repeat } from "lucide-react";

import { comparar_eventos, ESTADO_UI, hora_efectiva } from "../lib/estado-sesion";
import { fecha_corta, hora_corta } from "../lib/mes-grid";
import type { EventoCalendario } from "../lib/types";

type TablaServiciosProps = {
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
    .sort((a, b) => {
      const fa = a.sesiones[0].fecha_efectiva;
      const fb = b.sesiones[0].fecha_efectiva;
      return fa.localeCompare(fb) || comparar_eventos(a.sesiones[0], b.sesiones[0]);
    });
}

/** Lista de servicios del mes agrupada por OSI, con cada sesión y su estado. */
export default function TablaServicios({ eventos, onSelect, onComments }: TablaServiciosProps) {
  const filas = agrupar(eventos);

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <header className="flex items-baseline justify-between gap-2 border-b border-slate-200 px-4 py-3">
        <h3 className="text-base font-semibold text-slate-900">Servicios del periodo</h3>
        <span className="text-xs text-slate-500">
          {filas.length} {filas.length === 1 ? "OSI" : "OSIs"} · {eventos.length} sesiones
        </span>
      </header>
      {filas.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-slate-500">No hay servicios con los filtros actuales.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-2.5">OSI</th>
                <th className="px-3 py-2.5">Empresa y servicio</th>
                <th className="px-3 py-2.5">Ejecutivo · Ciudad</th>
                <th className="px-3 py-2.5">Sesiones</th>
                <th className="px-3 py-2.5">Avance</th>
                <th className="px-3 py-2.5 text-center">Chat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filas.map(({ id_osi, sesiones }) => {
                const p = sesiones[0];
                const ejecutadas = sesiones.filter((s) => s.estado === "ejecutada").length;
                const reagendas = sesiones.reduce((acc, s) => acc + s.reagenda_count, 0);
                const pct = Math.round((ejecutadas / Math.max(1, p.total_sesiones)) * 100);
                return (
                  <tr key={id_osi} className="align-top transition hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => onSelect(p)} className="font-semibold text-sky-700 hover:underline">
                        {p.nro_osi ?? id_osi}
                      </button>
                      <span className="mt-0.5 block text-[11px] capitalize text-slate-500">{(p.tipo_servicio ?? "").toLowerCase()}</span>
                    </td>
                    <td className="max-w-[18rem] px-3 py-3">
                      <span className="block truncate font-medium text-slate-900">{p.nombre_empresa ?? "Sin empresa"}</span>
                      <span className="block truncate text-xs text-slate-500" title={p.servicio ?? ""}>{p.servicio}</span>
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-600">
                      <span className="block">{p.ejecutivo_negocios ?? "—"}</span>
                      <span className="block text-slate-400">{p.ciudad ?? "Sin ciudad"}</span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {sesiones.map((s) => {
                          const ui = ESTADO_UI[s.estado];
                          const hora = hora_corta(hora_efectiva(s));
                          return (
                            <button
                              key={s.id_sesion}
                              type="button"
                              onClick={() => onSelect(s)}
                              title={ui.etiqueta}
                              className={`inline-flex items-center gap-1.5 rounded-md border-l-[3px] px-2 py-1 text-[11px] ring-1 ring-black/5 transition ${ui.chip} ${ui.barra}`}
                            >
                              <span className="font-semibold text-slate-700">S{s.nro_sesion}</span>
                              <span className="text-slate-600">
                                {s.estado === "por_confirmar" ? "Sin fecha" : fecha_corta(s.fecha_efectiva)}
                                {hora && s.estado !== "por_confirmar" ? ` · ${hora}` : ""}
                              </span>
                              {s.reagenda_count > 0 ? <Repeat className="h-3 w-3 text-orange-600" /> : null}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                    <td className="w-36 px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs tabular-nums text-slate-600">
                          {ejecutadas}/{p.total_sesiones}
                        </span>
                      </div>
                      {reagendas > 0 ? (
                        <span className="mt-1 block text-[11px] text-orange-700">
                          {reagendas} {reagendas === 1 ? "reagenda" : "reagendas"}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => onComments(p)}
                        className="relative inline-flex items-center justify-center rounded-md border border-slate-200 p-1.5 text-green-700 transition hover:bg-green-50"
                        title="Comentarios"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        {p.comentarios_count > 0 ? (
                          <span className="absolute -right-1.5 -top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-sky-600 px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-white">
                            {p.comentarios_count > 9 ? "9+" : p.comentarios_count}
                          </span>
                        ) : null}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
