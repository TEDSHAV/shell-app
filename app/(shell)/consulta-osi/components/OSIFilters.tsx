"use client";

import { useState } from "react";
import type { OSIListFilters, OSIStatusOption } from "@/types/osi";
import { Search, X, Filter, ChevronDown } from "lucide-react";

interface OSIFiltersProps {
  filters: OSIListFilters;
  onFiltersChange: (filters: OSIListFilters) => void;
  companies: { id_empresa: number; nombre_empresa: string }[];
  ejecutivos: string[];
  cityOptions: { id: number; nombre_ciudad: string }[];
  statuses: OSIStatusOption[];
  loading?: boolean;
}

export default function OSIFilters({
  filters,
  onFiltersChange,
  companies,
  ejecutivos,
  cityOptions,
  statuses,
  loading = false,
}: OSIFiltersProps) {
  const [expanded, setExpanded] = useState(true);

  const handleFilterChange = (key: keyof OSIListFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = Object.values(filters).some(
    (value) => value !== undefined && value !== "",
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-200">
        <div className="flex items-center gap-2.5">
          <Filter className="w-4 h-4 text-gray-500" />
          <h3 className="font-semibold text-sm text-gray-900">Filtros</h3>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-md"
            >
              <X className="w-3 h-3" />
              Limpiar
            </button>
          )}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
        >
          <ChevronDown
            className={`w-4 h-4 text-gray-500 transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {expanded && (
        <div className="p-3">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <div className="relative">
              <label className="block text-[11px] font-medium text-gray-600 mb-0.5">
                N° OSI
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={filters.nroOsi || ""}
                  onChange={(e) => handleFilterChange("nroOsi", e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-600 mb-0.5">
                Empresa
              </label>
              <select
                value={filters.companyName || ""}
                onChange={(e) =>
                  handleFilterChange("companyName", e.target.value || undefined)
                }
                className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                disabled={loading}
              >
                <option value="">Todas</option>
                {companies.map((company) => (
                  <option
                    key={company.id_empresa}
                    value={company.nombre_empresa}
                  >
                    {company.nombre_empresa}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-600 mb-0.5">
                Ciudad
              </label>
              <select
                value={filters.ciudad || ""}
                onChange={(e) =>
                  handleFilterChange("ciudad", e.target.value || undefined)
                }
                className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                disabled={loading}
              >
                <option value="">Todas</option>
                {cityOptions.map((city) => (
                  <option key={city.id} value={city.id.toString()}>
                    {city.nombre_ciudad}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-600 mb-0.5">
                Ejecutivo
              </label>
              <select
                value={filters.ejecutivo || ""}
                onChange={(e) =>
                  handleFilterChange("ejecutivo", e.target.value || undefined)
                }
                className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                disabled={loading}
              >
                <option value="">Todos</option>
                {ejecutivos.map((ejecutivo) => (
                  <option key={ejecutivo} value={ejecutivo}>
                    {ejecutivo}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-600 mb-0.5">
                F. Inicio Desde
              </label>
              <input
                type="date"
                value={filters.dateFrom || ""}
                onChange={(e) =>
                  handleFilterChange("dateFrom", e.target.value || undefined)
                }
                className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-600 mb-0.5">
                F. Inicio Hasta
              </label>
              <input
                type="date"
                value={filters.dateTo || ""}
                onChange={(e) =>
                  handleFilterChange("dateTo", e.target.value || undefined)
                }
                className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-600 mb-0.5">
                Estado
              </label>
              <select
                value={filters.status || ""}
                onChange={(e) =>
                  handleFilterChange("status", e.target.value || undefined)
                }
                className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                disabled={loading}
              >
                <option value="">Todos</option>
                {statuses.map((status) => (
                  <option key={status.id} value={status.id.toString()}>
                    {status.nombre_estado}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
