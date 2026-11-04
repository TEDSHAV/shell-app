"use client";

import { hora_efectiva } from "../lib/estado-sesion";
import { DIAS_SEMANA, es_fin_de_semana, fechas_entre, minutos, sumar_dias } from "../lib/mes-grid";
import type { EventoCalendario } from "../lib/types";
import EventoChip from "./EventoChip";

const HORA_INICIO = 6;
const HORA_FIN = 21;
const PX_HORA = 64;
const DURACION_DEFECTO = 60;

type CalendarioSemanaProps = {
  lunes: string;
  hoy: string;
  eventosPorFecha: Map<string, EventoCalendario[]>;
  onSelect: (evento: EventoCalendario) => void;
  onComments: (evento: EventoCalendario) => void;
};

type Bloque = { evento: EventoCalendario; top: number; alto: number; carril: number; carriles: number };

/** Posiciona los eventos con hora de un día; los que se solapan se reparten en carriles. */
function bloques_del_dia(eventos: EventoCalendario[]): { con_hora: Bloque[]; sin_hora: EventoCalendario[] } {
  const sin_hora: EventoCalendario[] = [];
  const items: Array<{ evento: EventoCalendario; ini: number; fin: number }> = [];
  for (const evento of eventos) {
    const ini = minutos(hora_efectiva(evento));
    if (ini == null) {
      sin_hora.push(evento);
      continue;
    }
    // La hora fin planificada solo vale si la sesión no se movió de hora.
    const fin_plan = !evento.fecha_ejecutada && !evento.fecha_reagendada ? minutos(evento.hora_fin) : null;
    const fin = fin_plan != null && fin_plan > ini ? fin_plan : ini + DURACION_DEFECTO;
    items.push({ evento, ini, fin });
  }
  items.sort((a, b) => a.ini - b.ini || b.fin - a.fin);

  const con_hora: Bloque[] = [];
  let grupo: Array<{ item: (typeof items)[number]; carril: number }> = [];
  let fin_grupo = -1;
  const cerrar = () => {
    const carriles = Math.max(1, ...grupo.map((g) => g.carril + 1));
    for (const { item, carril } of grupo) {
      const ini_vis = Math.max(item.ini, HORA_INICIO * 60);
      con_hora.push({
        evento: item.evento,
        top: ((ini_vis - HORA_INICIO * 60) / 60) * PX_HORA,
        alto: Math.max(PX_HORA - 4, ((Math.min(item.fin, HORA_FIN * 60) - ini_vis) / 60) * PX_HORA - 2),
        carril,
        carriles,
      });
    }
    grupo = [];
  };
  for (const item of items) {
    if (grupo.length && item.ini >= fin_grupo) cerrar();
    const ocupados = new Set(grupo.filter((g) => g.item.fin > item.ini).map((g) => g.carril));
    let carril = 0;
    while (ocupados.has(carril)) carril += 1;
    grupo.push({ item, carril });
    fin_grupo = Math.max(fin_grupo, item.fin);
  }
  if (grupo.length) cerrar();
  return { con_hora, sin_hora };
}

export default function CalendarioSemana({ lunes, hoy, eventosPorFecha, onSelect, onComments }: CalendarioSemanaProps) {
  const dias = fechas_entre(lunes, sumar_dias(lunes, 6));
  const horas = Array.from({ length: HORA_FIN - HORA_INICIO }, (_, i) => HORA_INICIO + i);
  const por_dia = dias.map((fecha) => ({ fecha, ...bloques_del_dia(eventosPorFecha.get(fecha) ?? []) }));
  const hay_sin_hora = por_dia.some((d) => d.sin_hora.length > 0);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[860px]">
        <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] gap-x-1.5">
          <div />
          {por_dia.map(({ fecha }, i) => (
            <div key={fecha} className="pb-2 text-center">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{DIAS_SEMANA[i]}</div>
              <div
                className={`mx-auto mt-0.5 inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-sm font-semibold ${
                  fecha === hoy ? "bg-sky-600 text-white" : "text-slate-800"
                }`}
              >
                {Number(fecha.slice(8))}
              </div>
            </div>
          ))}

          {hay_sin_hora ? (
            <>
              <div className="pr-1 pt-1 text-right text-[10px] text-slate-400">Sin hora</div>
              {por_dia.map(({ fecha, sin_hora }) => (
                <div key={fecha} className="flex min-h-[1.75rem] flex-col gap-1 border-b border-slate-200 pb-1.5">
                  {sin_hora.map((e) => (
                    <EventoChip key={e.id_sesion} evento={e} onSelect={onSelect} onComments={onComments} />
                  ))}
                </div>
              ))}
            </>
          ) : null}

          <div className="relative" style={{ height: horas.length * PX_HORA }}>
            {horas.map((h, i) => (
              <div key={h} className="absolute right-1 -translate-y-1/2 text-[10px] tabular-nums text-slate-400" style={{ top: i * PX_HORA }}>
                {i === 0 ? "" : `${h % 12 === 0 ? 12 : h % 12} ${h >= 12 ? "p. m." : "a. m."}`}
              </div>
            ))}
          </div>
          {por_dia.map(({ fecha, con_hora }) => (
            <div
              key={fecha}
              className={`relative rounded-lg border border-slate-200 ${es_fin_de_semana(fecha) ? "bg-slate-50" : "bg-white"} ${fecha === hoy ? "ring-2 ring-sky-200" : ""}`}
              style={{ height: horas.length * PX_HORA }}
            >
              {horas.map((h, i) => (
                <div key={h} className="absolute inset-x-0 border-t border-slate-100" style={{ top: i * PX_HORA }} />
              ))}
              {con_hora.map((b) => (
                <div
                  key={b.evento.id_sesion}
                  className="absolute px-0.5"
                  style={{
                    top: b.top,
                    height: b.alto,
                    left: `${(b.carril / b.carriles) * 100}%`,
                    width: `${100 / b.carriles}%`,
                  }}
                >
                  <EventoChip evento={b.evento} onSelect={onSelect} onComments={onComments} bloque />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
