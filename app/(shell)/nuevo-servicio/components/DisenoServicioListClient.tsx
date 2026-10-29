"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Search,
  X,
  Filter,
  ChevronDown,
  Layers,
  GraduationCap,
  Wrench,
} from "lucide-react";
import type { DisenoServicioListItem } from "@/types/diseno-servicio";
import {
  isCapacitacion,
  isServiciosTecnicos,
  matchesDisenoFilters,
  computeDepartmentCounts,
  computeDepartmentMetrics,
  type DisenoServicioFilters,
  type DeptTab,
} from "@/lib/diseno-servicio-filters";
import DisenoServicioTable from "./DisenoServicioTable";
import DisenoNotasModal from "./DisenoNotasModal";

const EMPTY_FILTERS: DisenoServicioFilters = {
  search: "",
  solicitante: "",
  departamento: "",
  estatus: "",
  osiLink: "",
  dateFrom: "",
  dateTo: "",
};

interface DisenoServicioListClientProps {
  initialRecords: DisenoServicioListItem[];
  initialDept?: string;
}

export default function DisenoServicioListClient({
  initialRecords,
  initialDept,
}: DisenoServicioListClientProps) {
  const [records, setRecords] = useState<DisenoServicioListItem[]>(initialRecords);
  const [filters, setFilters] = useState<DisenoServicioFilters>(EMPTY_FILTERS);
  const [expanded, setExpanded] = useState(false);

  // Active department tab ("todos" | "cap" | "st")
  const normalizedInitialDept: DeptTab =
    initialDept === "cap" ? "cap" : initialDept === "st" ? "st" : "todos";
  const [activeDeptTab, setActiveDeptTab] = useState<DeptTab>(normalizedInitialDept);

  // Active record for DisenoNotasModal
  const [activeNotaRecord, setActiveNotaRecord] = useState<DisenoServicioListItem | null>(null);

  // Derive total unfiltered counts per department
  const totalCounts = useMemo(() => {
    return computeDepartmentCounts(records);
  }, [records]);

  // Derive dropdown options from records
  const solicitanteOptions = useMemo(
    () =>
      Array.from(
        new Set(records.map((r) => r.solicitante_nombre).filter(Boolean)),
      ).sort((a, b) => a.localeCompare(b)),
    [records],
  );

  const departamentoOptions = useMemo(
    () =>
      Array.from(
        new Set(records.map((r) => r.solicitante_departamento).filter(Boolean)),
      ).sort((a, b) => a.localeCompare(b)),
    [records],
  );

  const estatusOptions = useMemo(
    () =>
      Array.from(
        new Map(
          records.map((r) => [
            r.id_estatus,
            { id: r.id_estatus, nombre: r.estatus_nombre || "Desconocido" },
          ]),
        ).values(),
      ).sort((a, b) => a.id - b.id),
    [records],
  );

  // Filter records matching general filters (search, solicitante, departamento, estatus, osiLink, date range)
  const matchingRecords = useMemo(() => {
    return records.filter((r) => matchesDisenoFilters(r, filters));
  }, [records, filters]);

  // Metrics per department (requested, finished, percentage)
  const departmentMetrics = useMemo(() => {
    return computeDepartmentMetrics(matchingRecords);
  }, [matchingRecords]);

  // Final records filtered by both active filters and department tab
  const filteredRecords = useMemo(() => {
    if (activeDeptTab === "todos") return matchingRecords;
    return matchingRecords.filter((r) =>
      activeDeptTab === "cap" ? isCapacitacion(r) : isServiciosTecnicos(r),
    );
  }, [matchingRecords, activeDeptTab]);

  const hasActiveFilters = Object.values(filters).some(
    (v) => v !== "" && v !== undefined,
  );

  const handleFilterChange = (key: keyof DisenoServicioFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => setFilters(EMPTY_FILTERS);

  // Callback from DisenoNotasModal to update note count in local state
  const handleNoteCountChange = useCallback((newCount: number) => {
    setActiveNotaRecord((curr) => {
      if (!curr) return null;
      return { ...curr, notas_count: newCount };
    });
    setRecords((prev) =>
      prev.map((item) =>
        item.id === activeNotaRecord?.id
          ? { ...item, notas_count: newCount }
          : item,
      ),
    );
  }, [activeNotaRecord?.id]);

  return (
    <div className="space-y-4">
      {/* Department Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-2">
        <div className="inline-flex rounded-lg bg-gray-100 p-1 text-sm font-medium">
          <button
            type="button"
            onClick={() => setActiveDeptTab("todos")}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeDeptTab === "todos"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
            title={`Todos: ${departmentMetrics.todos.finalizados} finalizados de ${departmentMetrics.todos.solicitados} solicitados (${departmentMetrics.todos.porcentaje}%)`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Todos los Servicios</span>
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                activeDeptTab === "todos"
                  ? "bg-gray-200 text-gray-800"
                  : "bg-gray-200/60 text-gray-600"
              }`}
            >
              <span>
                {departmentMetrics.todos.finalizados}/{departmentMetrics.todos.solicitados}
              </span>
              <span className="text-[9px] font-semibold opacity-75">
                ({departmentMetrics.todos.porcentaje}%)
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDeptTab("cap")}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeDeptTab === "cap"
                ? "bg-white text-purple-700 shadow-sm"
                : "text-gray-600 hover:text-purple-700"
            }`}
            title={`Capacitación: ${departmentMetrics.cap.finalizados} finalizados de ${departmentMetrics.cap.solicitados} solicitados (${departmentMetrics.cap.porcentaje}%)`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Capacitación</span>
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                activeDeptTab === "cap"
                  ? "bg-purple-100 text-purple-800"
                  : "bg-gray-200/60 text-gray-600"
              }`}
            >
              <span>
                {departmentMetrics.cap.finalizados}/{departmentMetrics.cap.solicitados}
              </span>
              <span className="text-[9px] font-semibold text-purple-700">
                ({departmentMetrics.cap.porcentaje}%)
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDeptTab("st")}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeDeptTab === "st"
                ? "bg-white text-orange-700 shadow-sm"
                : "text-gray-600 hover:text-orange-700"
            }`}
            title={`Servicios Técnicos: ${departmentMetrics.st.finalizados} finalizados de ${departmentMetrics.st.solicitados} solicitados (${departmentMetrics.st.porcentaje}%)`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Servicios Técnicos</span>
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                activeDeptTab === "st"
                  ? "bg-orange-100 text-orange-800"
                  : "bg-gray-200/60 text-gray-600"
              }`}
            >
              <span>
                {departmentMetrics.st.finalizados}/{departmentMetrics.st.solicitados}
              </span>
              <span className="text-[9px] font-semibold text-orange-700">
                ({departmentMetrics.st.porcentaje}%)
              </span>
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>Mostrando:</span>
          <span className="font-semibold text-gray-800">
            {filteredRecords.length}
          </span>
          <span>de</span>
          <span className="font-semibold text-gray-800">
            {activeDeptTab === "todos"
              ? totalCounts.todos
              : activeDeptTab === "cap"
              ? totalCounts.cap
              : totalCounts.st}
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
          <div className="flex items-center gap-2.5">
            <Filter className="w-4 h-4 text-gray-500" />
            <h3 className="font-semibold text-xs text-gray-900 uppercase tracking-wider">
              Búsqueda y Filtros
            </h3>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded-md font-medium"
              >
                <X className="w-3 h-3" />
                Limpiar
              </button>
            )}
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 p-1 rounded-md transition-colors"
          >
            <span>{expanded ? "Ocultar avanzados" : "Filtros avanzados"}</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${
                expanded ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>

        <div className="p-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Quick search always visible */}
            <div className="relative md:col-span-2 lg:col-span-2">
              <label className="block text-[11px] font-medium text-gray-600 mb-0.5">
                Buscar por nombre, ID u OSI
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Ej: Espacios Confinados, #12, OSI 3502..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-600 mb-0.5">
                Estatus
              </label>
              <select
                value={filters.estatus}
                onChange={(e) => handleFilterChange("estatus", e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
              >
                <option value="">Todos los estatus</option>
                {estatusOptions.map((status) => (
                  <option key={status.id} value={status.id.toString()}>
                    {status.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-600 mb-0.5">
                Vínculo OSI
              </label>
              <select
                value={filters.osiLink}
                onChange={(e) => handleFilterChange("osiLink", e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
              >
                <option value="">Todas las solicitudes</option>
                <option value="with_osi">Con OSI vinculada</option>
                <option value="without_osi">Sin OSI vinculada</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-600 mb-0.5">
                Solicitante
              </label>
              <select
                value={filters.solicitante}
                onChange={(e) => handleFilterChange("solicitante", e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
              >
                <option value="">Todos los solicitantes</option>
                {solicitanteOptions.map((nombre) => (
                  <option key={nombre} value={nombre}>
                    {nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {expanded && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 pt-3 border-t border-gray-100">
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-0.5">
                  Departamento Solicitante
                </label>
                <select
                  value={filters.departamento}
                  onChange={(e) => handleFilterChange("departamento", e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                >
                  <option value="">Todos los departamentos</option>
                  {departamentoOptions.map((nombre) => (
                    <option key={nombre} value={nombre}>
                      {nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-0.5">
                  F. Solicitud Desde
                </label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-0.5">
                  F. Solicitud Hasta
                </label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange("dateTo", e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Table */}
      <DisenoServicioTable
        records={filteredRecords}
        onOpenNotas={(rec) => setActiveNotaRecord(rec)}
      />

      {/* Notes Modal */}
      {activeNotaRecord && (
        <DisenoNotasModal
          solicitudId={activeNotaRecord.id}
          solicitudNombre={activeNotaRecord.nombre_sugerido}
          isOpen={true}
          onClose={() => setActiveNotaRecord(null)}
          onNoteCountChange={handleNoteCountChange}
        />
      )}
    </div>
  );
}
