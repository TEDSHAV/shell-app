"use client";

import { useRouter } from "next/navigation";
import type { DisenoServicioListItem } from "@/types/diseno-servicio";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, GraduationCap, Wrench, ChevronRight, FileCheck2 } from "lucide-react";

interface DisenoServicioTableProps {
  records: DisenoServicioListItem[];
  onOpenNotas: (record: DisenoServicioListItem) => void;
}

const STATUS_COLORS: Record<number, string> = {
  35: "bg-amber-50 text-amber-800 border-amber-300 group-hover:bg-white group-hover:border-amber-400 group-hover:text-amber-900",
  36: "bg-sky-50 text-sky-800 border-sky-300 group-hover:bg-white group-hover:border-sky-400 group-hover:text-sky-900",
  37: "bg-emerald-50 text-emerald-800 border-emerald-300 group-hover:bg-white group-hover:border-emerald-400 group-hover:text-emerald-900",
  38: "bg-emerald-50 text-emerald-800 border-emerald-300 group-hover:bg-white group-hover:border-emerald-400 group-hover:text-emerald-900",
};

const TIPO_SOLICITUD_BADGE: Record<string, { label: string; className: string }> = {
  creacion: {
    label: "Creación",
    className:
      "bg-violet-50 text-violet-800 border-violet-300 group-hover:bg-white group-hover:border-violet-400 group-hover:text-violet-900",
  },
  modificacion: {
    label: "Modificación",
    className:
      "bg-cyan-50 text-cyan-800 border-cyan-300 group-hover:bg-white group-hover:border-cyan-400 group-hover:text-cyan-900",
  },
};

export default function DisenoServicioTable({
  records,
  onOpenNotas,
}: DisenoServicioTableProps) {
  const router = useRouter();

  if (records.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-lg border border-gray-200 shadow-sm">
        <p className="text-gray-500 text-sm">
          No hay solicitudes de nuevos servicios que coincidan con los filtros seleccionados.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm bg-white">
      <table className="w-full text-sm">
        <thead className="bg-gray-50/80 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-600">
          <tr>
            <th className="px-4 py-3 text-left font-semibold">Servicio Sugerido</th>
            <th className="px-3 py-3 text-left font-semibold">Tipo Solicitud</th>
            <th className="px-3 py-3 text-left font-semibold">Área Ejecutora</th>
            <th className="px-3 py-3 text-left font-semibold">Solicitante</th>
            <th className="px-3 py-3 text-left font-semibold">Estatus</th>
            <th className="px-3 py-3 text-center font-semibold">Notas</th>
            <th className="px-3 py-3 text-left font-semibold">Fecha Solicitud</th>
            <th className="px-3 py-3 text-right font-semibold"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {records.map((record) => {
            const isCap =
              record.tipo_naturaleza === "cap" ||
              record.id_departamento_ejecutante === 3;

            return (
              <tr
                key={record.id}
                onClick={() => router.push(`/nuevo-servicio/${record.id}`)}
                className="hover:bg-slate-50/90 cursor-pointer transition-colors group"
              >
                <td className="px-4 py-3 text-gray-900 font-medium max-w-xs sm:max-w-md">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                      {record.nombre_sugerido}
                    </span>
                    <span className="text-[11px] text-gray-400 font-mono">
                      #{record.id}
                    </span>
                    {(record.osi_count || 0) > 0 && (
                      <Badge
                        variant="outline"
                        title={`OSI(s) vinculada(s): ${(record.osi_numeros || []).join(", ")}`}
                        className="bg-teal-50/80 text-teal-700 border-teal-200 group-hover:bg-white group-hover:border-teal-300 group-hover:text-teal-800 inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0 transition-colors"
                      >
                        <FileCheck2 className="w-2.5 h-2.5 text-teal-600 shrink-0" />
                        <span>
                          {record.osi_count === 1 && record.osi_numeros?.[0]
                            ? `OSI ${record.osi_numeros[0]}`
                            : `${record.osi_count} OSIs`}
                        </span>
                      </Badge>
                    )}
                  </div>
                </td>

                <td className="px-3 py-3">
                  {(() => {
                    const tipo = (record.tipo_solicitud || "").toLowerCase();
                    const cfg = TIPO_SOLICITUD_BADGE[tipo];
                    if (!cfg) return <span className="text-gray-400 text-xs">—</span>;
                    return (
                      <Badge
                        variant="outline"
                        className={`${cfg.className} text-[11px] font-medium transition-colors shadow-2xs`}
                      >
                        {cfg.label}
                      </Badge>
                    );
                  })()}
                </td>

                <td className="px-3 py-3">
                  {isCap ? (
                    <Badge
                      variant="outline"
                      className="bg-purple-50 text-purple-800 border-purple-300 group-hover:bg-white group-hover:border-purple-400 group-hover:text-purple-900 inline-flex items-center gap-1 text-[11px] font-medium transition-colors shadow-2xs"
                    >
                      <GraduationCap className="w-3 h-3 text-purple-600" />
                      Capacitación
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-orange-50 text-orange-800 border-orange-300 group-hover:bg-white group-hover:border-orange-400 group-hover:text-orange-900 inline-flex items-center gap-1 text-[11px] font-medium transition-colors shadow-2xs"
                    >
                      <Wrench className="w-3 h-3 text-orange-600" />
                      Servicios Técnicos
                    </Badge>
                  )}
                </td>

                <td className="px-3 py-3 text-gray-600">
                  <div className="text-xs font-medium text-gray-900">
                    {record.solicitante_nombre || "—"}
                  </div>
                  <div className="text-[11px] text-gray-500">
                    {record.solicitante_departamento || "—"}
                  </div>
                </td>

                <td className="px-3 py-3">
                  <Badge
                    variant="outline"
                    className={`${
                      STATUS_COLORS[record.id_estatus] ||
                      "bg-gray-50 text-gray-700 border-gray-300 group-hover:bg-white"
                    } text-[11px] font-medium transition-colors shadow-2xs`}
                  >
                    {record.estatus_nombre || "Desconocido"}
                  </Badge>
                </td>

                <td className="px-3 py-3 text-center">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenNotas(record);
                    }}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors shadow-2xs ${
                      (record.notas_count || 0) > 0
                        ? "bg-amber-50 text-amber-900 border-amber-300 group-hover:bg-white group-hover:border-amber-400"
                        : "bg-gray-50 text-gray-500 border-gray-200 group-hover:bg-white group-hover:text-gray-800 group-hover:border-gray-300"
                    }`}
                    title="Ver u observar notas"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{record.notas_count || 0}</span>
                  </button>
                </td>

                <td className="px-3 py-3 text-gray-600 text-xs">
                  {record.fecha_solicitud
                    ? new Date(record.fecha_solicitud).toLocaleDateString("es-VE", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })
                    : "—"}
                </td>

                <td className="px-3 py-3 text-right">
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all inline" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
