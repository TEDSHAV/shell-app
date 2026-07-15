"use client";

import { useState, Fragment } from "react";
import Link from "next/link";
import type { OSIListItem, OSIStatusOption, OSISession } from "@/types/osi";
import { getOSISessions, checkAllSessionsFinal } from "@/actions/osi";
import { Eye, FileText, Loader2, ChevronDown, ChevronRight, MessageSquare, CheckCircle2 } from "lucide-react";

interface OSITableProps {
  osis: OSIListItem[];
  loading: boolean;
  onRowClick: (osi: OSIListItem) => void;
  onCommentsClick: (osi: OSIListItem) => void;
  selectedOSI: OSIListItem | null;
  canChangeStatus: boolean;
  statuses: OSIStatusOption[];
  onStatusChange: (osi: OSIListItem, newStatusId: number) => Promise<{ success: boolean; error?: string }>;
  onSessionStatusChange?: (sessionId: number, newStatusId: number) => Promise<{ success: boolean; error?: string }>;
}

export default function OSITable({
  osis,
  loading,
  onRowClick,
  onCommentsClick,
  selectedOSI,
  canChangeStatus,
  statuses,
  onStatusChange,
  onSessionStatusChange,
}: OSITableProps) {
  const [statusLoadingId, setStatusLoadingId] = useState<number | null>(null);
  const [expandedOSIId, setExpandedOSIId] = useState<number | null>(null);
  const [sessionsByOSI, setSessionsByOSI] = useState<Record<number, OSISession[]>>({});
  const [sessionsLoading, setSessionsLoading] = useState<number | null>(null);
  const [sessionStatusLoading, setSessionStatusLoading] = useState<number | null>(null);
  const [allFinalBanner, setAllFinalBanner] = useState<Record<number, boolean>>({});
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString + "T00:00:00").toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const handleToggleExpand = async (osiId: number) => {
    if (expandedOSIId === osiId) {
      setExpandedOSIId(null);
      return;
    }
    setExpandedOSIId(osiId);
    if (!sessionsByOSI[osiId]) {
      setSessionsLoading(osiId);
      try {
        const sessions = await getOSISessions(osiId);
        setSessionsByOSI((prev) => ({ ...prev, [osiId]: sessions }));
      } catch (err) {
        console.error("Error loading sessions:", err);
        setSessionsByOSI((prev) => ({ ...prev, [osiId]: [] }));
      } finally {
        setSessionsLoading(null);
      }
    }
  };

  const handleSessionStatusSelect = async (session: OSISession, newStatusId: number) => {
    if (session.id_estatus === newStatusId) return;
    setSessionStatusLoading(session.id);
    const status = statuses.find((s) => s.id === newStatusId);
    setSessionsByOSI((prev) => ({
      ...prev,
      [session.id_osi]: (prev[session.id_osi] || []).map((s) =>
        s.id === session.id
          ? { ...s, id_estatus: newStatusId, status_name: status?.nombre_estado || "Desconocido", status_color: status?.color_hex || "#9CA3AF" }
          : s
      ),
    }));
    try {
      if (onSessionStatusChange) {
        const result = await onSessionStatusChange(session.id, newStatusId);
        if (result.success) {
          const check = await checkAllSessionsFinal(session.id_osi);
          setAllFinalBanner((prev) => ({ ...prev, [session.id_osi]: check.allFinal }));
        } else {
          setSessionsByOSI((prev) => ({
            ...prev,
            [session.id_osi]: (prev[session.id_osi] || []).map((s) =>
              s.id === session.id ? session : s
            ),
          }));
          console.error("Error changing session status:", result.error);
        }
      }
    } catch (err) {
      setSessionsByOSI((prev) => ({
        ...prev,
        [session.id_osi]: (prev[session.id_osi] || []).map((s) =>
          s.id === session.id ? session : s
        ),
      }));
      console.error("Error changing session status:", err);
    } finally {
      setSessionStatusLoading(null);
    }
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

  const handleStatusSelect = async (osi: OSIListItem, newStatusId: number) => {
    if (!osi.id_osi || osi.id_estatus === newStatusId) return;
    setStatusLoadingId(osi.id_osi);
    try {
      await onStatusChange(osi, newStatusId);
    } finally {
      setStatusLoadingId(null);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-2 py-2 w-8"></th>
            <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
              OSI
            </th>
            <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider min-w-0">
              Empresa
            </th>
            <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider min-w-0">
              Servicio
            </th>
            <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
              Ciudad
            </th>
            <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider min-w-0">
              Ejecutivo
            </th>
            <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
              F. Inicio
            </th>
            <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
              F. Fin
            </th>
            <th className="px-3 py-2 text-center text-[11px] font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
              Part.
            </th>
            <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
              Estado
            </th>
            <th className="px-3 py-2 text-center text-[11px] font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
              Acción
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {osis.map((osi, index) => {
            const isSelected = selectedOSI?.id_osi === osi.id_osi && selectedOSI?.nro_osi === osi.nro_osi;
            const isExpanded = expandedOSIId === osi.id_osi;
            return (
            <Fragment key={`${osi.id_osi}-${osi.nro_osi}-${index}`}>
            <tr
              onClick={() => onRowClick(osi)}
              className={`transition-colors cursor-pointer border-l-2 ${
                isSelected
                  ? "bg-blue-50 border-l-blue-500"
                  : "hover:bg-blue-50 border-l-transparent"
              }`}
            >
              <td className="px-2 py-2 w-8">
                {osi.id_osi && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleExpand(osi.id_osi!);
                    }}
                    className="p-0.5 rounded hover:bg-gray-200 transition-colors"
                    title={isExpanded ? "Contraer sesiones" : "Expandir sesiones"}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                    )}
                  </button>
                )}
              </td>
              <td className="px-3 py-2">
                <span className="text-sm font-semibold text-gray-900">
                  {osi.nro_osi || "-"}
                </span>
              </td>
              <td className="px-3 py-2 min-w-0">
                <span className="text-sm text-gray-700 truncate block max-w-[120px]">
                  {osi.nombre_empresa || "-"}
                </span>
              </td>
              <td className="px-3 py-2 min-w-0">
                <div className="flex flex-col min-w-0">
                  <span className="text-sm text-gray-900 truncate max-w-[140px]">
                    {osi.servicio || "-"}
                  </span>
                  {osi.tipo_servicio && (
                    <span className="text-[10px] text-gray-500 truncate max-w-[140px]">
                      {osi.tipo_servicio}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-3 py-2">
                <span className="text-sm text-gray-700 truncate block max-w-[100px]">
                  {osi.ciudad_ejecucion || "-"}
                </span>
              </td>
              <td className="px-3 py-2 min-w-0">
                <span className="text-sm text-gray-700 truncate block max-w-[100px]">
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
                {canChangeStatus && osi.id_osi ? (
                  <div className="relative inline-block">
                    {statusLoadingId === osi.id_osi ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] text-gray-500">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        ...
                      </span>
                    ) : (
                      <div
                        className="relative inline-flex items-center rounded-full transition-opacity hover:opacity-80"
                        style={{
                          backgroundColor: `${osi.status_color}20`,
                          border: `1px solid ${osi.status_color}60`,
                        }}
                      >
                        <select
                          value={osi.id_estatus ?? undefined}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleStatusSelect(osi, parseInt(e.target.value));
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="text-[10px] font-bold uppercase rounded-full pl-2 pr-5 py-0.5 text-center border-0 cursor-pointer focus:ring-2 focus:ring-blue-400 focus:outline-none appearance-none bg-transparent min-w-[70px]"
                          style={{
                            color: osi.status_color,
                          }}
                          title={`${osi.status_name} — Click para cambiar`}
                        >
                        {statuses.map((status) => (
                          <option
                            key={status.id}
                            value={status.id}
                            style={{
                              backgroundColor: "white",
                              color: "#374151",
                              textTransform: "none",
                              fontWeight: "normal",
                              fontSize: "12px",
                            }}
                          >
                            {status.nombre_estado}
                          </option>
                        ))}
                        </select>
                        <ChevronDown
                          className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 h-3 w-3"
                          style={{ color: osi.status_color }}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase whitespace-nowrap"
                    style={{
                      backgroundColor: `${osi.status_color}20`,
                      color: osi.status_color,
                    }}
                  >
                    {osi.status_name}
                  </span>
                )}
              </td>
              <td className="px-3 py-2 text-center">
                <div className="inline-flex items-center gap-1.5">
                  <Link
                    href={`/consulta-osi/preview/${osi.id_osi}`}
                    onClick={(event) => event.stopPropagation()}
                    className="inline-flex items-center justify-center rounded-md border border-gray-200 p-1.5 text-blue-700 hover:bg-blue-50 transition-colors"
                    title="Ver formato OSI"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Link>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      onCommentsClick(osi);
                    }}
                    className="inline-flex items-center justify-center rounded-md border border-gray-200 p-1.5 text-green-700 hover:bg-green-50 transition-colors"
                    title="Comentarios"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                  </button>
                </div>
              </td>
            </tr>
            {isExpanded && osi.id_osi && (
              <tr className="bg-gray-50/50">
                <td colSpan={11} className="px-4 py-3">
                  {sessionsLoading === osi.id_osi ? (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Cargando sesiones...
                    </div>
                  ) : (sessionsByOSI[osi.id_osi] || []).length === 0 ? (
                    <p className="text-xs text-gray-500 italic">Esta OSI no tiene sesiones registradas.</p>
                  ) : (
                    <div className="space-y-2">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border border-gray-200 rounded">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-2 py-1.5 text-left font-semibold text-gray-600 uppercase tracking-wider">Sesión</th>
                              <th className="px-2 py-1.5 text-left font-semibold text-gray-600 uppercase tracking-wider">Fecha</th>
                              <th className="px-2 py-1.5 text-left font-semibold text-gray-600 uppercase tracking-wider">Hora Inicio</th>
                              <th className="px-2 py-1.5 text-left font-semibold text-gray-600 uppercase tracking-wider">Hora Fin</th>
                              <th className="px-2 py-1.5 text-left font-semibold text-gray-600 uppercase tracking-wider">Estado</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {(sessionsByOSI[osi.id_osi] || []).map((session) => (
                              <tr key={session.id}>
                                <td className="px-2 py-1.5 font-medium text-gray-700">#{session.nro_sesion}</td>
                                <td className="px-2 py-1.5 text-gray-600">{formatDate(session.fecha)}</td>
                                <td className="px-2 py-1.5 text-gray-600">{session.hora_inicio || "-"}</td>
                                <td className="px-2 py-1.5 text-gray-600">{session.hora_fin || "-"}</td>
                                <td className="px-2 py-1.5">
                                  {canChangeStatus && onSessionStatusChange ? (
                                    <div className="relative inline-block">
                                      {sessionStatusLoading === session.id ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] text-gray-500">
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                          ...
                                        </span>
                                      ) : (
                                        <div
                                          className="relative inline-flex items-center rounded-full transition-opacity hover:opacity-80"
                                          style={{
                                            backgroundColor: `${session.status_color}20`,
                                            border: `1px solid ${session.status_color}60`,
                                          }}
                                        >
                                          <select
                                            value={session.id_estatus ?? ""}
                                            onChange={(e) => {
                                              const val = e.target.value;
                                              if (val) handleSessionStatusSelect(session, parseInt(val));
                                            }}
                                            className="text-[10px] font-bold uppercase rounded-full pl-2 pr-5 py-0.5 text-center border-0 cursor-pointer focus:ring-2 focus:ring-blue-400 focus:outline-none appearance-none bg-transparent min-w-[70px]"
                                            style={{ color: session.status_color }}
                                            title={`${session.status_name} — Click para cambiar`}
                                          >
                                            <option value="" style={{ backgroundColor: "white", color: "#374151", textTransform: "none", fontWeight: "normal", fontSize: "12px" }}>
                                              Sin estado
                                            </option>
                                            {statuses.map((status) => (
                                              <option
                                                key={status.id}
                                                value={status.id}
                                                style={{ backgroundColor: "white", color: "#374151", textTransform: "none", fontWeight: "normal", fontSize: "12px" }}
                                              >
                                                {status.nombre_estado}
                                              </option>
                                            ))}
                                          </select>
                                          <ChevronDown
                                            className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 h-3 w-3"
                                            style={{ color: session.status_color }}
                                          />
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <span
                                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase whitespace-nowrap"
                                      style={{
                                        backgroundColor: `${session.status_color}20`,
                                        color: session.status_color,
                                      }}
                                    >
                                      {session.status_name}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {allFinalBanner[osi.id_osi] && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-300 rounded text-xs text-amber-800">
                          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                          <span>Todas las sesiones están en estado final.</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const finalStatus = statuses.find((s) => s.es_estado_final);
                              if (finalStatus && osi.id_osi) {
                                handleStatusSelect(osi, finalStatus.id);
                              }
                            }}
                            className="ml-auto px-2 py-0.5 text-[10px] font-bold uppercase rounded border border-amber-400 text-amber-800 hover:bg-amber-100 transition-colors"
                          >
                            Actualizar OSI
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            )}
            </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
