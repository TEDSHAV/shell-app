"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import type { OSIFullData, OSISesion } from "@/types/requisiciones";
import {
  osi_matches_tipo_filter,
  osi_tipo_filter_for_departamento,
} from "@/lib/requisiciones-gerencia";

export function ReqAltaOsiPicker({
  osis,
  osi_sessions,
  departamento,
  selected,
  id_sesion,
  on_pick,
  on_sesion,
}: {
  osis: OSIFullData[];
  osi_sessions: Array<{
    id: number;
    id_osi: number;
    nro_sesion: number;
    fecha: string | null;
    hora_inicio: string | null;
    hora_fin: string | null;
  }>;
  departamento: string;
  selected: OSIFullData | null;
  id_sesion: number | null;
  on_pick: (osi: OSIFullData) => void;
  on_sesion: (id: number) => void;
}) {
  const [q, setQ] = useState("");
  const filter = osi_tipo_filter_for_departamento(departamento);
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return osis.filter((osi) => {
      if (!osi_matches_tipo_filter(osi.tipo_servicio, filter)) return false;
      if (osi.nro_osi?.toUpperCase().startsWith("PEN")) return false;
      if (!term) return true;
      return (
        (osi.nro_osi || "").toLowerCase().includes(term) ||
        (osi.servicio || "").toLowerCase().includes(term)
      );
    }).slice(0, 12);
  }, [osis, filter, q]);

  const sesiones: OSISesion[] = selected
    ? ((selected.desglose_recursos_sesiones as OSISesion[] | null) || []).length >
      0
      ? (selected.desglose_recursos_sesiones as OSISesion[])
      : osi_sessions
          .filter((row) => row.id_osi === selected.id_osi)
          .map((row) => ({
            id: row.id,
            id_sesion: row.id,
            nro_sesion: row.nro_sesion,
            fecha: row.fecha,
            hora_inicio: row.hora_inicio,
            hora_fin: row.hora_fin,
            costo_traslado: null,
            costo_impresion_material: null,
            horas_honorarios_instructor: null,
            tarifa_hora_honorarios: null,
            costo_honorarios_instructor: null,
          }))
    : [];

  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-semibold text-gray-900">Elija la OSI</p>
        <p className="mb-2 text-xs text-gray-600">
          Al seleccionarla se cargan honorarios, traslado, impresión e
          informe de esa ejecución. Luego puede añadir más ítems.
        </p>
      </div>
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar OSI o curso…"
        className="h-8 text-xs"
      />
      <div className="max-h-40 overflow-y-auto rounded border">
        {filtered.map((osi) => (
          <button
            key={osi.id_osi}
            type="button"
            className={`block w-full px-2 py-1.5 text-left text-xs ${
              selected?.id_osi === osi.id_osi ? "bg-blue-50 font-medium" : ""
            }`}
            onClick={() => on_pick(osi)}
          >
            {osi.nro_osi} · {osi.servicio}
          </button>
        ))}
      </div>
      {sesiones.length > 1 ? (
        <select
          className="h-8 w-full rounded border px-2 text-xs"
          value={id_sesion || ""}
          onChange={(e) => on_sesion(Number(e.target.value))}
        >
          <option value="">Elija sesión</option>
          {sesiones.map((s) => (
            <option key={s.id_sesion} value={s.id_sesion}>
              Sesión #{s.nro_sesion ?? s.id_sesion}
              {s.fecha ? ` — ${s.fecha}` : ""}
            </option>
          ))}
        </select>
      ) : null}
    </div>
  );
}
