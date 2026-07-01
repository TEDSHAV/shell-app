"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface OSIPaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
  loading?: boolean;
}

export default function OSIPagination({
  currentPage,
  totalPages,
  totalCount,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  loading = false,
}: OSIPaginationProps) {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalCount);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-3 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span>Mostrar</span>
        <select
          value={itemsPerPage}
          onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
          className="border border-gray-300 rounded-md text-sm px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={loading}
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
        <span>por página</span>
      </div>

      <div className="text-sm text-gray-600">
        {totalCount > 0 ? (
          <>
            Mostrando <span className="font-medium">{startItem}</span> a{" "}
            <span className="font-medium">{endItem}</span> de{" "}
            <span className="font-medium">{totalCount}</span> resultados
          </>
        ) : (
          "Sin resultados"
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1 || loading}
            className="p-1.5 border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-600">
            Página <span className="font-medium">{currentPage}</span> de{" "}
            <span className="font-medium">{totalPages}</span>
          </span>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages || loading}
            className="p-1.5 border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
