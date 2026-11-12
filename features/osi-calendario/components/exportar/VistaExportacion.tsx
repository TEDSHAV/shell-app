import { forwardRef } from "react";

import { empresa_y_sede, ESTADO_UI, ESTADOS_LEYENDA, hora_efectiva } from "../../lib/estado-sesion";
import { COLOR_ESTADO, type DatosExportacion } from "../../lib/exportar";
import { DIAS_SEMANA, fecha_larga, hora_corta } from "../../lib/mes-grid";
import type { EventoCalendario } from "../../lib/types";

/**
 * Calendario para exportar a PNG: ancho fijo y cada día con TODAS sus sesiones (sin «+N más»).
 * Se dibuja fuera de pantalla solo mientras se genera la imagen. Colores en hex para que la captura sea fiel.
 */
const VistaExportacion = forwardRef<HTMLDivElement, { datos: DatosExportacion }>(function VistaExportacion({ datos }, ref) {
  const por_fecha = new Map<string, EventoCalendario[]>();
  for (const e of datos.eventos) por_fecha.set(e.fecha_efectiva, [...(por_fecha.get(e.fecha_efectiva) ?? []), e]);
  const conteo = new Map<string, number>();
  for (const e of [...datos.eventos, ...datos.sin_fecha]) {
    const k = e.estado === "sin_fecha" ? "reagendada" : e.estado;
    conteo.set(k, (conteo.get(k) ?? 0) + 1);
  }
  const dia = datos.vista === "dia";
  const columnas = dia ? 1 : 7;

  return (
    <div ref={ref} style={{ width: dia ? 900 : 1680, fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }} className="bg-white p-8 text-slate-900">
      <div className="flex items-end justify-between gap-6 border-b-2 border-[#0c3f69] pb-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-[#0c3f69]">SHA de Venezuela · Calendario de servicios</p>
          <h1 className="mt-1 text-3xl font-bold capitalize">{datos.titulo}</h1>
          {datos.filtros.length ? <p className="mt-1 text-sm text-slate-600">Filtros: {datos.filtros.join(" · ")}</p> : null}
        </div>
        <div className="text-right text-xs text-slate-500">
          <p>
            {datos.eventos.length + datos.sin_fecha.length} sesiones
          </p>
          <p>Generado el {datos.generado}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        {ESTADOS_LEYENDA.map((estado) => (
          <span key={estado} className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: COLOR_ESTADO[estado].barra }} />
            {ESTADO_UI[estado].etiqueta} · {conteo.get(estado) ?? 0}
          </span>
        ))}
        <span className="text-slate-400">◆ Certificado listo · $ Facturada</span>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-slate-300">
        {!dia ? (
          <div className="grid border-b border-slate-300 bg-slate-50" style={{ gridTemplateColumns: `repeat(${columnas}, minmax(0, 1fr))` }}>
            {DIAS_SEMANA.map((d) => (
              <div key={d} className="px-2 py-1.5 text-xs font-semibold text-slate-600">{d}</div>
            ))}
          </div>
        ) : null}
        {datos.semanas.map((semana, i) => (
          <div key={i} className={`grid ${i < datos.semanas.length - 1 ? "border-b border-slate-300" : ""}`} style={{ gridTemplateColumns: `repeat(${columnas}, minmax(0, 1fr))` }}>
            {semana.map((d, j) => {
              const eventos = d.en_periodo ? por_fecha.get(d.fecha) ?? [] : [];
              return (
                <div key={d.fecha} className={`min-h-24 p-1.5 ${j < semana.length - 1 ? "border-r border-slate-200" : ""} ${d.en_periodo ? "" : "bg-slate-50"}`}>
                  <p className={`mb-1 text-xs font-semibold ${d.en_periodo ? "text-slate-700" : "text-slate-300"}`}>
                    {dia ? <span className="capitalize">{fecha_larga(d.fecha)}</span> : Number(d.fecha.slice(8))}
                  </p>
                  <div className="flex flex-col gap-1">
                    {eventos.map((e) => (
                      <Tarjeta key={e.id_sesion} evento={e} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {datos.sin_fecha.length ? (
        <div className="mt-4">
          <p className="mb-1.5 text-sm font-semibold">Reagendadas sin fecha</p>
          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${dia ? 2 : 6}, minmax(0, 1fr))` }}>
            {datos.sin_fecha.map((e) => (
              <Tarjeta key={e.id_sesion} evento={e} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
});

export default VistaExportacion;

function Tarjeta({ evento: e }: { evento: EventoCalendario }) {
  const c = COLOR_ESTADO[e.estado];
  const { empresa, sede } = empresa_y_sede(e.nombre_empresa);
  const hora = e.estado === "sin_fecha" ? null : hora_corta(hora_efectiva(e));
  return (
    <div className="rounded px-1.5 py-1 text-[10px] leading-tight" style={{ background: c.fondo, borderLeft: `3px solid ${c.barra}` }}>
      <p className="font-semibold" style={{ color: c.texto, textDecoration: e.estado === "cancelada" ? "line-through" : undefined }}>
        {e.servicio ?? "Servicio"}
      </p>
      <p className="text-slate-700">
        {empresa}
        {sede ? <span className="text-slate-500"> · {sede}</span> : null}
      </p>
      <p className="text-slate-500">
        OSI {e.nro_osi ?? e.id_osi}
        {hora ? ` · ${hora}` : ""}
        {e.total_sesiones > 1 ? ` · S${e.nro_sesion}/${e.total_sesiones}` : ""}
        {e.en_sha ? " · En SHA" : e.ciudad ? ` · ${e.ciudad}` : ""}
        {e.certificados > 0 ? <span className="font-semibold text-emerald-700"> ◆</span> : null}
        {e.factura ? <span className="font-semibold text-emerald-700"> $</span> : null}
      </p>
    </div>
  );
}
