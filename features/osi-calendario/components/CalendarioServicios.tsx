"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CalendarClock, CheckCircle2 } from "lucide-react";

import OSICommentsSheet from "@/app/(shell)/consulta-osi/components/OSICommentsSheet";
import type { OSIListItem } from "@/types/osi";
import { etiqueta_mes, fecha_larga, inicio_semana, mover_mes, rango_grilla, sumar_dias } from "../lib/mes-grid";
import type { AccionSesion, CalendarioMesData, EventoCalendario } from "../lib/types";
import CalendarioMes from "./CalendarioMes";
import CalendarioSemana from "./CalendarioSemana";
import CalendarioToolbar, { FILTROS_VACIOS, type FiltrosCalendario, type Vista } from "./CalendarioToolbar";
import EventoChip from "./EventoChip";
import EventoDetalle from "./EventoDetalle";
import ResumenEstados from "./ResumenEstados";
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
  const [vista, set_vista] = useState<Vista>("mes");
  const [lunes, set_lunes] = useState(() => inicio_semana(data.mes === data.hoy.slice(0, 7) ? data.hoy : `${data.mes}-01`));
  const [filtros, set_filtros] = useState<FiltrosCalendario>(FILTROS_VACIOS);
  const [detalle, set_detalle] = useState<EventoCalendario | null>(null);
  const [accion, set_accion] = useState<{ evento: EventoCalendario; accion: AccionSesion } | null>(null);
  const [chat, set_chat] = useState<EventoCalendario | null>(null);
  const [aviso, set_aviso] = useState<string | null>(null);

  const ir_a_mes = (mes: string) => router.push(`${pathname}?mes=${mes}`, { scroll: false });

  /** Filtros de búsqueda, tipo y ejecutivo; el de estado se aplica aparte para que las tarjetas mantengan su conteo. */
  const pasa_base = (e: EventoCalendario) => {
    const t = filtros.texto.trim().toLowerCase();
    if (t && !`${e.nro_osi ?? ""} ${e.nombre_empresa ?? ""}`.toLowerCase().includes(t)) return false;
    if (filtros.tipo === "capacitacion" && !/capacitacion/i.test(e.tipo_servicio ?? "")) return false;
    if (filtros.tipo === "servicios_tecnicos" && !ES_ST.test(e.tipo_servicio ?? "")) return false;
    if (filtros.ejecutivo && e.ejecutivo_negocios !== filtros.ejecutivo) return false;
    return true;
  };
  const pasa = (e: EventoCalendario) => pasa_base(e) && (!filtros.estado || e.estado === filtros.estado);

  const base = useMemo(() => data.eventos.filter(pasa_base), [data.eventos, filtros]); // eslint-disable-line react-hooks/exhaustive-deps
  const eventos = useMemo(() => base.filter(pasa), [base, filtros]); // eslint-disable-line react-hooks/exhaustive-deps
  const por_confirmar = useMemo(() => data.por_confirmar.filter(pasa), [data.por_confirmar, filtros]); // eslint-disable-line react-hooks/exhaustive-deps
  const del_periodo = useMemo(
    () => (vista === "mes" ? eventos.filter((e) => e.fecha_efectiva.startsWith(data.mes)) : eventos.filter((e) => e.fecha_efectiva >= lunes && e.fecha_efectiva <= sumar_dias(lunes, 6))),
    [eventos, vista, data.mes, lunes],
  );
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

  const mover_semana = (dias: number) => {
    const nuevo = sumar_dias(lunes, dias);
    set_lunes(nuevo);
    const { desde, hasta } = rango_grilla(data.mes);
    if (nuevo < desde || sumar_dias(nuevo, 6) > hasta) ir_a_mes(sumar_dias(nuevo, 3).slice(0, 7));
  };

  const titulo =
    vista === "mes"
      ? etiqueta_mes(data.mes)
      : `${fecha_larga(lunes).slice(4)} – ${fecha_larga(sumar_dias(lunes, 6)).slice(4)}`;

  const abrir_accion = (evento: EventoCalendario, a: AccionSesion) => {
    set_detalle(null);
    set_accion({ evento, accion: a });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <CalendarioToolbar
        titulo={titulo}
        subtitulo={vista === "mes" ? "Clic en un día para verlo por horas" : "Semana por horas"}
        vista={vista}
        filtros={filtros}
        ejecutivos={ejecutivos}
        mostrarTipo={mostrarTipo}
        onPrev={() => (vista === "mes" ? ir_a_mes(mover_mes(data.mes, -1)) : mover_semana(-7))}
        onNext={() => (vista === "mes" ? ir_a_mes(mover_mes(data.mes, 1)) : mover_semana(7))}
        onHoy={() => {
          set_lunes(inicio_semana(data.hoy));
          if (data.mes !== data.hoy.slice(0, 7)) ir_a_mes(data.hoy.slice(0, 7));
        }}
        onVista={set_vista}
        onFiltros={set_filtros}
      />

      <ResumenEstados
        eventos={base.filter((e) => e.fecha_efectiva.startsWith(data.mes))}
        activo={filtros.estado}
        onSelect={(estado) => set_filtros((f) => ({ ...f, estado }))}
      />

      {aviso ? (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">
          <CheckCircle2 className="h-4 w-4" /> {aviso}
          <button type="button" onClick={() => set_aviso(null)} className="ml-auto text-xs underline">Cerrar</button>
        </div>
      ) : null}

      {vista === "mes" ? (
        <CalendarioMes
          mes={data.mes}
          hoy={data.hoy}
          eventosPorFecha={por_fecha}
          onSelect={set_detalle}
          onComments={set_chat}
          onVerSemana={(fecha) => {
            set_lunes(inicio_semana(fecha));
            set_vista("semana");
          }}
        />
      ) : (
        <CalendarioSemana lunes={lunes} hoy={data.hoy} eventosPorFecha={por_fecha} onSelect={set_detalle} onComments={set_chat} />
      )}

      </div>

      {por_confirmar.length > 0 ? (
        <section className="rounded-xl border border-dashed border-orange-300 bg-orange-50/40 p-4">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-orange-900">
            <CalendarClock className="h-4 w-4" /> Reagendadas sin fecha nueva ({por_confirmar.length})
          </h3>
          <p className="mb-3 text-xs text-orange-800/80">No aparecen en el calendario hasta que se les asigne fecha.</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {por_confirmar.map((e) => (
              <EventoChip key={e.id_sesion} evento={e} onSelect={set_detalle} onComments={set_chat} />
            ))}
          </div>
        </section>
      ) : null}

      <TablaServicios eventos={[...del_periodo, ...por_confirmar]} onSelect={set_detalle} onComments={set_chat} />

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
        osi={chat ? a_osi_item(chat) : null}
        open={!!chat}
        onClose={() => {
          set_chat(null);
          router.refresh();
        }}
      />
    </div>
  );
}
