"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CheckCircle2, X } from "lucide-react";

import OSICommentsSheet from "@/app/(shell)/consulta-osi/components/OSICommentsSheet";
import type { OSIListItem } from "@/types/osi";
import { coincide_estado, empresa_y_sede } from "../lib/estado-sesion";
import { etiqueta_mes, fecha_larga, mover_mes } from "../lib/mes-grid";
import type { AccionSesion, CalendarioMesData, EstadoSesion, EventoCalendario } from "../lib/types";
import AgendaItem from "./AgendaItem";
import CalendarioMes from "./CalendarioMes";
import Encabezado, { FILTROS_VACIOS, type FiltrosCalendario } from "./Encabezado";
import EventoDetalle from "./EventoDetalle";
import MiniMes from "./MiniMes";
import SesionAccionModal from "./SesionAccionModal";
import TablaServicios from "./TablaServicios";

const ES_ST = /servicios? tecnicos?/i;

function a_osi_item(e: EventoCalendario): OSIListItem {
  return {
    id_osi: e.id_osi,
    nro_osi: e.nro_osi,
    nombre_empresa: e.nombre_empresa,
    servicio: e.servicio,
    tipo_servicio: e.tipo_servicio,
    ciudad_ejecucion: e.ciudad,
    ejecutivo_negocios: e.ejecutivo_negocios,
    fecha_inicio_real: null,
    fecha_fin_real: null,
    participantes: null,
    id_estatus: e.id_estatus_osi,
    status_name: "",
    status_color: "",
    oculto_para_cliente: false,
    sesiones_ejecucion: null,
    total_sesiones: e.total_sesiones,
  };
}

export default function CalendarioServicios({ data, mostrarTipo }: { data: CalendarioMesData; mostrarTipo: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  // En el mes actual la agenda del teléfono arranca hoy; en otro mes, en el primer día con sesiones.
  const dia_inicial =
    data.mes === data.hoy.slice(0, 7)
      ? data.hoy
      : data.eventos.find((e) => e.fecha_efectiva.startsWith(data.mes))?.fecha_efectiva ?? `${data.mes}-01`;
  const [dia, set_dia] = useState(dia_inicial);
  const [filtros, set_filtros] = useState<FiltrosCalendario>(FILTROS_VACIOS);
  const [detalle, set_detalle] = useState<EventoCalendario | null>(null);
  const [accion, set_accion] = useState<{ evento: EventoCalendario; accion: AccionSesion } | null>(null);
  const [chat, set_chat] = useState<EventoCalendario | null>(null);
  const [aviso, set_aviso] = useState<string | null>(null);

  useEffect(() => set_dia(dia_inicial), [dia_inicial]);

  const ir_a_mes = (mes: string) => router.push(`${pathname}?mes=${mes}`, { scroll: false });

  const pasa_base = (e: EventoCalendario) => {
    const t = filtros.texto.trim().toLowerCase();
    if (t && !`${e.nro_osi ?? ""} ${e.nombre_empresa ?? ""} ${e.servicio ?? ""}`.toLowerCase().includes(t)) return false;
    if (filtros.tipo === "capacitacion" && !/capacitacion/i.test(e.tipo_servicio ?? "")) return false;
    if (filtros.tipo === "servicios_tecnicos" && !ES_ST.test(e.tipo_servicio ?? "")) return false;
    if (filtros.ejecutivo && e.ejecutivo_negocios !== filtros.ejecutivo) return false;
    return true;
  };

  const base = useMemo(() => data.eventos.filter(pasa_base), [data.eventos, filtros]); // eslint-disable-line react-hooks/exhaustive-deps
  const sin_fecha_base = useMemo(() => data.por_confirmar.filter(pasa_base), [data.por_confirmar, filtros]); // eslint-disable-line react-hooks/exhaustive-deps
  const eventos = useMemo(() => base.filter((e) => coincide_estado(e.estado, filtros.estado)), [base, filtros.estado]);
  const sin_fecha = useMemo(() => sin_fecha_base.filter((e) => coincide_estado(e.estado, filtros.estado)), [sin_fecha_base, filtros.estado]);

  const conteo = useMemo(() => {
    const c: Partial<Record<EstadoSesion, number>> = {};
    for (const e of [...base.filter((x) => x.fecha_efectiva.startsWith(data.mes)), ...sin_fecha_base]) {
      const k = e.estado === "sin_fecha" ? "reagendada" : e.estado;
      c[k] = (c[k] ?? 0) + 1;
    }
    return c;
  }, [base, sin_fecha_base, data.mes]);

  const ejecutivos = useMemo(
    () => [...new Set([...data.eventos, ...data.por_confirmar].map((e) => e.ejecutivo_negocios).filter((x): x is string => !!x))].sort(),
    [data.eventos, data.por_confirmar],
  );
  const por_fecha = useMemo(() => {
    const m = new Map<string, EventoCalendario[]>();
    for (const e of eventos) {
      const list = m.get(e.fecha_efectiva) ?? [];
      list.push(e);
      m.set(e.fecha_efectiva, list);
    }
    return m;
  }, [eventos]);

  const del_dia = por_fecha.get(dia) ?? [];
  const del_mes = eventos.filter((e) => e.fecha_efectiva.startsWith(data.mes));
  const [mes_nombre, anio] = etiqueta_mes(data.mes).split(" ");

  const abrir_accion = (evento: EventoCalendario, a: AccionSesion) => {
    set_detalle(null);
    set_accion({ evento, accion: a });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <Encabezado
          mesTitulo={mes_nombre}
          anio={anio}
          filtros={filtros}
          conteo={conteo}
          ejecutivos={ejecutivos}
          mostrarTipo={mostrarTipo}
          onPrev={() => ir_a_mes(mover_mes(data.mes, -1))}
          onNext={() => ir_a_mes(mover_mes(data.mes, 1))}
          onHoy={() => {
            set_dia(data.hoy);
            if (data.mes !== data.hoy.slice(0, 7)) ir_a_mes(data.hoy.slice(0, 7));
          }}
          onFiltros={set_filtros}
        />

        {aviso ? (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1">{aviso}</span>
            <button type="button" onClick={() => set_aviso(null)} aria-label="Cerrar aviso" className="rounded p-0.5 hover:bg-emerald-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        <div className="hidden md:block">
          <CalendarioMes mes={data.mes} hoy={data.hoy} eventosPorFecha={por_fecha} onSelect={set_detalle} onComments={set_chat} />
        </div>

        <div className="flex flex-col gap-4 md:hidden">
          <MiniMes mes={data.mes} hoy={data.hoy} seleccion={dia} eventosPorFecha={por_fecha} onSeleccion={set_dia} />
          <div className="border-t border-slate-100 pt-4">
            <p className="mb-3 text-sm font-semibold capitalize text-slate-900">
              {fecha_larga(dia)}
              <span className="ml-2 font-normal normal-case text-slate-400">
                {del_dia.length ? `${del_dia.length} ${del_dia.length === 1 ? "sesión" : "sesiones"}` : "Sin sesiones"}
              </span>
            </p>
            <div className="flex flex-col gap-2">
              {del_dia.map((e) => (
                <AgendaItem key={e.id_sesion} evento={e} onSelect={set_detalle} onComments={set_chat} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {sin_fecha.length > 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <h3 className="text-base font-semibold text-slate-900">Reagendadas sin fecha</h3>
          <p className="mb-3 text-xs text-slate-500">No se dieron y todavía no tienen fecha nueva, por eso no aparecen en el calendario.</p>
          <div className="grid gap-2 lg:grid-cols-2">
            {sin_fecha.map((e) => (
              <AgendaItem key={e.id_sesion} evento={e} onSelect={set_detalle} onComments={set_chat} lateral={`OSI ${e.nro_osi ?? e.id_osi}`} />
            ))}
          </div>
        </section>
      ) : null}

      <TablaServicios eventos={[...del_mes, ...sin_fecha]} onSelect={set_detalle} onComments={set_chat} />

      <EventoDetalle
        evento={detalle}
        mes={data.mes}
        puedeGestionar={data.puede_gestionar}
        onClose={() => set_detalle(null)}
        onAccion={abrir_accion}
        onComments={(e) => {
          set_detalle(null);
          set_chat(e);
        }}
      />
      <SesionAccionModal
        evento={accion?.evento ?? null}
        accionInicial={accion?.accion ?? null}
        hoy={data.hoy}
        onClose={() => set_accion(null)}
        onDone={(mensaje) => {
          set_accion(null);
          set_aviso(mensaje);
          router.refresh();
        }}
      />
      <OSICommentsSheet
        osi={chat ? { ...a_osi_item(chat), nombre_empresa: empresa_y_sede(chat.nombre_empresa).empresa } : null}
        open={!!chat}
        onClose={() => {
          set_chat(null);
          router.refresh();
        }}
      />
    </div>
  );
}
