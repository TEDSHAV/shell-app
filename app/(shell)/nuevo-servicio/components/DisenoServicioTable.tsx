"use client";

import { useRouter } from "next/navigation";
import type { DisenoServicioListItem } from "@/types/diseno-servicio";
import { Badge } from "@/components/ui/badge";

const STATUS_COLORS: Record<number, string> = {
  35: "bg-amber-100 text-amber-800 border-amber-300",
  36: "bg-blue-100 text-blue-800 border-blue-300",
  37: "bg-green-100 text-green-800 border-green-300",
};

export default function DisenoServicioTable({
  records,
}: {
  records: DisenoServicioListItem[];
}) {
  const router = useRouter();

  if (records.length === 0) {
    return (
      <div className="text-center py-16 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-gray-500 text-sm">
          No hay solicitudes de nuevos servicios disponibles.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-gray-700">Nombre Sugerido</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-700">Tipo Servicio</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-700">Solicitante</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-700">Estatus</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-700">Fecha Solicitud</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {records.map((record) => (
            <tr
              key={record.id}
              onClick={() => router.push(`/nuevo-servicio/${record.id}`)}
              className="hover:bg-indigo-50 cursor-pointer transition-colors"
            >
              <td className="px-4 py-3 text-gray-900 font-medium">
                {record.nombre_sugerido}
              </td>
              <td className="px-4 py-3 text-gray-600">
                {record.tipo_servicio || "—"}
              </td>
              <td className="px-4 py-3 text-gray-600">
                {record.solicitante_nombre || "—"}
              </td>
              <td className="px-4 py-3">
                <Badge
                  className={`${STATUS_COLORS[record.id_estatus] || "bg-gray-100 text-gray-700 border-gray-300"} border`}
                >
                  {record.estatus_nombre || "Desconocido"}
                </Badge>
              </td>
              <td className="px-4 py-3 text-gray-600">
                {record.fecha_solicitud
                  ? new Date(record.fecha_solicitud).toLocaleDateString("es-VE", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
