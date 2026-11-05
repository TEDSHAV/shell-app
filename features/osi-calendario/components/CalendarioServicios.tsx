"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import OSICommentsSheet from "@/app/(shell)/consulta-osi/components/OSICommentsSheet";
import type { OSIListItem } from "@/types/osi";
import { coincide_estado, empresa_y_sede, se_puede_reagendar } from "../lib/estado-sesion";
import { FILTROS_VACIOS, opciones_filtros, pasa_filtros, type FiltrosCalendario } from "../lib/filtros";
import { etiqueta_mes, fecha_larga, inicio_semana, mover_mes, rango_grilla, sumar_dias } from "../lib/mes-grid";
import type { AccionSesion, CalendarioMesData, EstadoSesion, EventoCalendario } from "../lib/types";
import AgendaItem from "./AgendaItem";
import Aviso from "./Aviso";
import CalendarioMes from "./CalendarioMes";
import CalendarioSemana from "./CalendarioSemana";
import CalendarioDia from "./CalendarioDia";
import Encabezado, { type Vista } from "./Encabezado";
import EventoDetalle, { type PasoAccion } from "./EventoDetalle";
import { PuedeFacturarContext } from "./IndicadoresOSI";
import BotonExportar from "./exportar/BotonExportar";
import { armar_datos, nombre_archivo } from "../lib/exportar";
import MiniMes from "./MiniMes";
import TablaServicios from "./TablaServicios";
import BarraLote from "./lote/BarraLote";
import DialogoLote from "./lote/DialogoLote";
import { SeleccionContext } from "./lote/seleccion-context";
import { useSeleccion } from "../hooks/use-seleccion";
import { tiene_algun_permiso } from "../lib/acciones";

const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** "2 – 8 nov" o, si la semana cruza de mes, "28 sep – 4 oct". */
function titulo_semana(lunes: string): { titulo: string; anio: string } {
  const domingo = sumar_dias(lunes, 6);
  const d = (f: string) => Number(f.slice(8));
  const m = (f: string) => MESES_CORTOS[Number(f.slice(5, 7)) - 1];
  const titulo = m(lunes) === m(domingo) ? `${d(lunes)} – ${d(domingo)} ${m(domingo)}` : `${d(lunes)} ${m(lunes)} – ${d(domingo)} ${m(domingo)}`;
  return { titulo, anio: domingo.slice(0, 4) };
}

const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

/** "Jue 5 nov" (corto para que quepa con las flechas en el teléfono). */
function titulo_dia(fecha: string): string {
  const d = new Date(`${fecha}T12:00:00`);
  return `${DIAS_CORTOS[d.getDay()]} ${Number(fecha.slice(8))} ${MESES_CORTOS[Number(fecha.slice(5, 7)) - 1]}`;
}

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
  const [vista, set_vista] = useState<Vista>("mes");
  const [lunes, set_lunes] = useState(() => inicio_semana(dia_inicial));
  const [filtros, set_filtros] = useState<FiltrosCalendario>(FILTROS_VACIOS);
  const [detalle, set_detalle] = useState<EventoCalendario | null>(null);
  // El detalle abre en el paso 1; al soltar una sesión en otro día abre directo en «Reagendar» con esa fecha.
  const [paso_inicial, set_paso_inicial] = useState<PasoAccion | null>(null);
  const [arrastrando, set_arrastrando] = useState<EventoCalendario | null>(null);
  const [chat, set_chat] = useState<EventoCalendario | null>(null);
  const [aviso, set_aviso] = useState<string | null>(null);
  const [error, set_error] = useState<string | null>(null);

  // Al cargar otro mes: en vista día se conserva el día elegido (si cae en la grilla); si no, se vuelve al día inicial.
  useEffect(() => {
    const { desde, hasta } = rango_grilla(data.mes);
    set_dia((d) => (vista === "dia" && d >= desde && d <= hasta ? d : dia_inicial));
  }, [dia_inicial]); // eslint-disable-line react-hooks/exhaustive-deps

  // Selección múltiple: con la selección activa, tocar una sesión la marca en lugar de abrir el detalle.
  const seleccion = useSeleccion();
  const [accion_lote, set_accion_lote] = useState<AccionSesion | null>(null);
  const puede_seleccionar = tiene_algun_permiso(data.permisos);
  const osis_de_seleccion = useMemo(() => {
    const por_id = new Map([...data.eventos, ...data.por_confirmar].map((e) => [e.id_sesion, e.id_osi]));
    return [...new Set([...seleccion.ids].map((id) => por_id.get(id)).filter((id): id is number => id != null))];
  }, [seleccion.ids, data.eventos, data.por_confirmar]);
  const al_tocar = (e: EventoCalendario) => (seleccion.activa ? seleccion.alternar(e.id_sesion) : abrir_detalle(e));

  const ir_a_mes = (mes: string) => router.push(`${pathname}?mes=${mes}`, { scroll: false });

  const pasa_base = (e: EventoCalendario) => pasa_filtros(e, filtros);

  const base = useMemo(() => data.eventos.filter(pasa_base), [data.eventos, filtros]); // eslint-disable-line react-hooks/exhaustive-deps
  const sin_fecha_base = useMemo(() => data.por_confirmar.filter(pasa_base), [data.por_confirmar, filtros]); // eslint-disable-line react-hooks/exhaustive-deps
  const eventos = useMemo(() => base.filter((e) => coincide_estado(e.estado, filtros.estado)), [base, filtros.estado]);
  const sin_fecha = useMemo(() => sin_fecha_base.filter((e) => coincide_estado(e.estado, filtros.estado)), [sin_fecha_base, filtros.estado]);

  /** Periodo visible: el mes, la semana o el día. Leyenda, contadores y tabla se calculan sobre él. */
  const domingo = sumar_dias(lunes, 6);
  const en_periodo = (e: EventoCalendario) =>
    vista === "mes"
      ? e.fecha_efectiva.startsWith(data.mes)
      : vista === "dia"
        ? e.fecha_efectiva === dia
        : e.fecha_efectiva >= lunes && e.fecha_efectiva <= domingo;

  const conteo = useMemo(() => {
    const c: Partial<Record<EstadoSesion, number>> = {};
    for (const e of [...base.filter(en_periodo), ...sin_fecha_base]) {
      const k = e.estado === "sin_fecha" ? "reagendada" : e.estado;
      c[k] = (c[k] ?? 0) + 1;
    }
    return c;
  }, [base, sin_fecha_base, data.mes, vista, lunes, dia]); // eslint-disable-line react-hooks/exhaustive-deps

  const conteo_en_sha = useMemo(
    () => [...data.eventos.filter(en_periodo), ...data.por_confirmar].filter((e) => e.en_sha).length,
    [data.eventos, data.por_confirmar, data.mes, vista, lunes, dia], // eslint-disable-line react-hooks/exhaustive-deps
  );

  /** Sesiones por N° de OC en el periodo (sin filtros), para el selector de orden de compra. */
  const oc_en_periodo = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of [...data.eventos.filter(en_periodo), ...data.por_confirmar]) {
      for (const oc of e.ordenes_compra) m.set(oc, (m.get(oc) ?? 0) + 1);
    }
    return m;
  }, [data.eventos, data.por_confirmar, data.mes, vista, lunes, dia]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Mueve el día; si sale de la grilla cargada, pide su mes. */
  const ir_a_dia = (fecha: string) => {
    set_dia(fecha);
    const { desde, hasta } = rango_grilla(data.mes);
    if (fecha < desde || fecha > hasta) ir_a_mes(fecha.slice(0, 7));
  };

  /** Mueve la semana; si sale de la grilla cargada, pide el mes de esa semana (el del jueves). */
  const ir_a_semana = (nuevo_lunes: string) => {
    set_lunes(nuevo_lunes);
    const { desde, hasta } = rango_grilla(data.mes);
    if (nuevo_lunes < desde || sumar_dias(nuevo_lunes, 6) > hasta) ir_a_mes(sumar_dias(nuevo_lunes, 3).slice(0, 7));
  };

  const puede_arrastrar = (e: EventoCalendario) => data.permisos.reagendar && se_puede_reagendar(e.estado);
  const soltar = (evento: EventoCalendario, fecha: string) => {
    set_arrastrando(null);
    if (evento.estado !== "sin_fecha" && fecha === evento.fecha_efectiva) return;
    set_paso_inicial({ accion: "reagendar", fecha });
    set_detalle(evento);
  };

  const abrir_detalle = (evento: EventoCalendario) => {
    set_paso_inicial(null);
    set_detalle(evento);
  };

  const opciones = useMemo(
    () => opciones_filtros([...data.eventos, ...data.por_confirmar]),
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
  const del_periodo = eventos.filter(en_periodo);
  const [mes_nombre, anio_mes] = etiqueta_mes(data.mes).split(" ");
  const semana = titulo_semana(lunes);

  const cambiar_vista = (v: Vista) => {
    // La vista día arranca hoy si hoy está en el mes cargado; si no, en el día ya elegido de ese mes.
    if (v === "dia" && vista !== "dia" && data.hoy.startsWith(data.mes)) set_dia(data.hoy);
    // Al pasar a semana desde el mes, arranca en la semana del día elegido (hoy o el primero con sesiones).
    if (v === "semana" && vista === "mes") {
      const { desde, hasta } = rango_grilla(data.mes);
      if (lunes < desde || lunes > hasta) set_lunes(inicio_semana(dia));
    }
    set_vista(v);
  };

  return (
    <PuedeFacturarContext.Provider value={data.puede_facturar}>
    <SeleccionContext.Provider value={{ activa: seleccion.activa, tiene: seleccion.tiene }}>
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <Encabezado
          mesTitulo={vista === "mes" ? mes_nombre : vista === "dia" ? titulo_dia(dia) : semana.titulo}
          anio={vista === "mes" ? anio_mes : vista === "dia" ? dia.slice(0, 4) : semana.anio}
          dia={dia}
          onDia={ir_a_dia}
          vista={vista}
          onVista={cambiar_vista}
          lunes={lunes}
          hoy={data.hoy}
          onSemana={ir_a_semana}
          mes={data.mes}
          onMes={ir_a_mes}
          puedeSeleccionar={puede_seleccionar}
          exportar={
            <BotonExportar
              archivo={nombre_archivo(vista, data.mes, lunes, dia)}
              onError={set_error}
              obtenerDatos={() =>
                armar_datos({
                  vista,
                  titulo: vista === "mes" ? `${mes_nombre} ${anio_mes}` : vista === "dia" ? `${titulo_dia(dia)} ${dia.slice(0, 4)}` : `${semana.titulo} ${semana.anio}`,
                  mes: data.mes,
                  lunes,
                  dia,
                  eventos,
                  sin_fecha,
                  filtros,
                })
              }
            />
          }
          seleccionando={seleccion.activa}
          onSeleccionar={() => (seleccion.activa ? seleccion.salir() : seleccion.set_activa(true))}
          filtros={filtros}
          conteo={conteo}
          conteoEnSha={conteo_en_sha}
          opciones={opciones}
          ocEnPeriodo={oc_en_periodo}
          mostrarTipo={mostrarTipo}
          onPrev={() => (vista === "mes" ? ir_a_mes(mover_mes(data.mes, -1)) : vista === "dia" ? ir_a_dia(sumar_dias(dia, -1)) : ir_a_semana(sumar_dias(lunes, -7)))}
          onNext={() => (vista === "mes" ? ir_a_mes(mover_mes(data.mes, 1)) : vista === "dia" ? ir_a_dia(sumar_dias(dia, 1)) : ir_a_semana(sumar_dias(lunes, 7)))}
          onFiltros={set_filtros}
        />

        {aviso ? <Aviso tipo="ok" texto={aviso} onCerrar={() => set_aviso(null)} /> : null}

        {error ? <Aviso tipo="error" texto={error} onCerrar={() => set_error(null)} /> : null}

        {vista === "dia" ? (
          <CalendarioDia dia={dia} hoy={data.hoy} eventosPorFecha={por_fecha} onDia={ir_a_dia} onSelect={al_tocar} onComments={set_chat} />
        ) : null}

        {vista === "semana" ? (
          <>
            <CalendarioSemana
              lunes={lunes}
              hoy={data.hoy}
              eventosPorFecha={por_fecha}
              onSelect={al_tocar}
              onComments={set_chat}
              arrastrando={arrastrando}
              puedeArrastrar={puede_arrastrar}
              onArrastre={set_arrastrando}
              onSoltar={soltar}
            />
            {data.permisos.reagendar ? (
              <p className="-mt-2 hidden text-xs text-slate-400 md:block">Arrastra una sesión a otro día para reagendarla.</p>
            ) : null}
          </>
        ) : null}

        <div className={vista === "mes" ? "hidden md:block" : "hidden"}>
          <CalendarioMes
            mes={data.mes}
            hoy={data.hoy}
            eventosPorFecha={por_fecha}
            onSelect={al_tocar}
            onComments={set_chat}
            arrastrando={arrastrando}
            puedeArrastrar={puede_arrastrar}
            onArrastre={set_arrastrando}
            onSoltar={soltar}
          />
          {data.permisos.reagendar ? (
            <p className="mt-2 text-xs text-slate-400">Arrastra una sesión a otro día para reagendarla.</p>
          ) : null}
        </div>

        <div className={vista === "mes" ? "flex flex-col gap-4 md:hidden" : "hidden"}>
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
                <AgendaItem key={e.id_sesion} evento={e} onSelect={al_tocar} onComments={set_chat} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {sin_fecha.length > 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <h3 className="text-base font-semibold text-slate-900">Reagendadas sin fecha</h3>
          <p className="mb-3 text-xs text-slate-500">
            No se dieron y todavía no tienen fecha nueva, por eso no aparecen en el calendario.
            {data.permisos.reagendar ? <span className="hidden md:inline"> Arrastra una al calendario para darle fecha.</span> : null}
          </p>
          <div className="grid gap-2 lg:grid-cols-2">
            {sin_fecha.map((e) => (
              <AgendaItem key={e.id_sesion} evento={e} onSelect={al_tocar} onComments={set_chat} lateral={`OSI ${e.nro_osi ?? e.id_osi}`} arrastrable={puede_arrastrar(e)} onArrastre={set_arrastrando} />
            ))}
          </div>
        </section>
      ) : null}

      {/* En la vista día la lista ya es la tabla; la tabla queda para semana y mes. */}
      {vista !== "dia" ? (
        <TablaServicios
          titulo={vista === "mes" ? "Servicios del mes" : "Servicios de la semana"}
          eventos={[...del_periodo, ...sin_fecha]}
          onSelect={al_tocar}
          onComments={set_chat}
        />
      ) : null}

      <EventoDetalle
        evento={detalle}
        mes={data.mes}
        permisos={data.permisos}
        hoy={data.hoy}
        pasoInicial={paso_inicial}
        onClose={() => set_detalle(null)}
        onDone={(mensaje) => {
          set_detalle(null);
          set_aviso(mensaje);
          router.refresh();
        }}
        onComments={(e) => {
          set_detalle(null);
          set_chat(e);
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
      {seleccion.activa ? (
        <BarraLote
          cantidad={seleccion.cantidad}
          unidad={["sesión", "sesiones"]}
          permisos={data.permisos}
          onAccion={set_accion_lote}
          onLimpiar={seleccion.limpiar}
        />
      ) : null}
      <DialogoLote
        accion={accion_lote}
        objetivo={{ tipo: "sesiones", ids: [...seleccion.ids], ids_osi: osis_de_seleccion }}
        hoy={data.hoy}
        onClose={() => set_accion_lote(null)}
        onDone={(mensaje) => {
          set_accion_lote(null);
          seleccion.salir();
          set_aviso(mensaje);
          router.refresh();
        }}
      />
    </div>
    </SeleccionContext.Provider>
    </PuedeFacturarContext.Provider>
  );
}
