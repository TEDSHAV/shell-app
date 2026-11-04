"use client";

import { comparar_eventos, empresa_y_sede, ESTADO_UI, hora_efectiva } from "../lib/estado-sesion";
import { fecha_corta, hora_corta } from "../lib/mes-grid";
import type { EventoCalendario } from "../lib/types";
import { BurbujaComentarios } from "./EventoChip";

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

/** Servicios del mes agrupados por OSI. Tabla en escritorio, tarjetas en teléfono. */
export default function TablaServicios({ eventos, onSelect, onComments }: TablaServiciosProps) {
  const filas = agrupar(eventos);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white">
      <header className="flex items-baseline justify-between gap-2 px-4 pb-2 pt-4 sm:px-5">
        <h3 className="text-lg font-semibold text-slate-900">Servicios del mes</h3>
        <span className="text-sm text-slate-500">
          {filas.length} {filas.length === 1 ? "OSI" : "OSIs"} · {eventos.length} {eventos.length === 1 ? "sesión" : "sesiones"}
        </span>
      </header>

      {filas.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-slate-500">No hay servicios con los filtros actuales.</p>
      ) : (
        <>
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

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-[15px]">
              <thead className="border-y border-slate-100 text-left text-[13px] font-medium text-slate-500">
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
        </>
      )}
    </section>
  );
}
