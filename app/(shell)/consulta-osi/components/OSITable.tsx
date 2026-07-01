"use client";

import Link from "next/link";
import type { OSIListItem } from "@/types/osi";
import { Eye, FileText } from "lucide-react";

interface OSITableProps {
  osis: OSIListItem[];
  loading: boolean;
  onRowClick: (osi: OSIListItem) => void;
  selectedOSI: OSIListItem | null;
}

export default function OSITable({ osis, loading, onRowClick, selectedOSI }: OSITableProps) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-500">Cargando OSIs...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!osis || osis.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No se encontraron OSIs
          </h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Intenta ajustar los filtros de búsqueda para ver resultados.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <table className="w-full table-fixed">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="w-28 px-3 py-2 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
              OSI
            </th>
            <th className="w-36 px-3 py-2 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
              Empresa
            </th>
            <th className="w-40 px-3 py-2 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
              Servicio
            </th>
            <th className="w-28 px-3 py-2 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
              Ciudad
            </th>
            <th className="w-32 px-3 py-2 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
              Ejecutivo
            </th>
            <th className="w-24 px-3 py-2 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
              F. Inicio
            </th>
            <th className="w-24 px-3 py-2 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
              F. Fin
            </th>
            <th className="w-16 px-3 py-2 text-center text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
              Part.
            </th>
            <th className="w-28 px-3 py-2 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
              Estado
            </th>
            <th className="w-24 px-3 py-2 text-center text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {osis.map((osi, index) => {
            const isSelected = selectedOSI?.id_osi === osi.id_osi && selectedOSI?.nro_osi === osi.nro_osi;
            return (
            <tr
              key={`${osi.id_osi}-${osi.nro_osi}-${index}`}
              onClick={() => onRowClick(osi)}
              className={`transition-colors cursor-pointer border-l-2 ${
                isSelected
                  ? "bg-blue-50 border-l-blue-500"
                  : "hover:bg-blue-50 border-l-transparent"
              }`
            }>
              <td className="px-3 py-2">
                <span className="text-sm font-semibold text-gray-900">
                  {osi.nro_osi || "-"}
                </span>
              </td>
              <td className="px-3 py-2">
                <span className="text-sm text-gray-700 truncate block">
                  {osi.nombre_empresa || "-"}
                </span>
              </td>
              <td className="px-3 py-2">
                <div className="flex flex-col">
                  <span className="text-sm text-gray-900 truncate">
                    {osi.servicio || "-"}
                  </span>
                  {osi.tipo_servicio && (
                    <span className="text-[10px] text-gray-500 truncate">
                      {osi.tipo_servicio}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-3 py-2">
                <span className="text-sm text-gray-700 truncate block">
                  {osi.ciudad_ejecucion || "-"}
                </span>
              </td>
              <td className="px-3 py-2">
                <span className="text-sm text-gray-700 truncate block">
                  {osi.ejecutivo_negocios || "-"}
                </span>
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                <span className="text-xs text-gray-700">
                  {formatDate(osi.fecha_inicio_real)}
                </span>
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                <span className="text-xs text-gray-700">
                  {formatDate(osi.fecha_fin_real)}
                </span>
              </td>
              <td className="px-3 py-2 text-center">
                <span className="text-sm text-gray-700">
                  {osi.participantes ?? "-"}
                </span>
              </td>
              <td className="px-3 py-2">
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase whitespace-nowrap"
                  style={{
                    backgroundColor: `${osi.status_color}20`,
                    color: osi.status_color,
                  }}
                >
                  {osi.status_name}
                </span>
              </td>
              <td className="px-3 py-2 text-center">
                <Link
                  href={`/consulta-osi/preview/${osi.id_osi}`}
                  onClick={(event) => event.stopPropagation()}
                  className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-50"
                  title="Ver formato OSI"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Ver OSI
                </Link>
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
