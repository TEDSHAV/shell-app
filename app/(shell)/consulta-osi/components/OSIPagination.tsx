"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface OSIPaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
  loading?: boolean;
  fetching?: boolean;
}

type PageToken = number | "ellipsis-left" | "ellipsis-right";

/**
 * Compute the page-number sequence to render, with ellipsis markers where
 * there's a gap. Always shows the first and last page, plus a window of
 * `windowSize` pages around the current page.
 */
function getPageRange(current: number, total: number, windowSize = 1): PageToken[] {
  if (total <= 1) return total === 1 ? [1] : [];

  const pages: PageToken[] = [];
  const start = Math.max(2, current - windowSize);
  const end = Math.min(total - 1, current + windowSize);

  pages.push(1);

  if (start > 2) pages.push("ellipsis-left");

  for (let p = start; p <= end; p++) pages.push(p);

  if (end < total - 1) pages.push("ellipsis-right");

  pages.push(total);
  return pages;
}

export default function OSIPagination({
  currentPage,
  totalPages,
  totalCount,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  loading = false,
  fetching = false,
}: OSIPaginationProps) {
  const [jumpValue, setJumpValue] = useState("");
  const disabled = loading || fetching;
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalCount);
  const pageTokens = getPageRange(currentPage, totalPages);

  const goToPage = (page: number) => {
    const clamped = Math.max(1, Math.min(totalPages, page));
    if (clamped !== currentPage) onPageChange(clamped);
  };

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(jumpValue, 10);
    if (!Number.isNaN(parsed)) goToPage(parsed);
    setJumpValue("");
  };

  const navButtonClass =
    "inline-flex items-center justify-center h-8 min-w-8 px-2 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-gray-600 transition-colors";

  const pageButtonClass = (active: boolean) =>
    `inline-flex items-center justify-center h-8 min-w-8 px-2 rounded-md border text-sm transition-colors ${
      active
        ? "border-blue-600 bg-blue-600 text-white font-semibold cursor-default"
        : "border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
    }`;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-3 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-3">
      {/* Page size selector */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span>Mostrar</span>
        <select
          value={itemsPerPage}
          onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
          className="border border-gray-300 rounded-md text-sm px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={disabled}
          aria-label="Resultados por página"
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
        <span>por página</span>
      </div>

      {/* Result summary */}
      <div className="text-sm text-gray-600" aria-live="polite">
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

      {/* Page navigation */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1.5 flex-wrap justify-center">
          <button
            type="button"
            onClick={() => goToPage(1)}
            disabled={currentPage === 1 || disabled}
            className={navButtonClass}
            aria-label="Primera página"
            title="Primera página"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1 || disabled}
            className={navButtonClass}
            aria-label="Página anterior"
            title="Página anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {pageTokens.map((token) => {
            if (token === "ellipsis-left" || token === "ellipsis-right") {
              return (
                <span
                  key={token}
                  className="inline-flex items-center justify-center h-8 min-w-8 px-1 text-gray-400 select-none"
                  aria-hidden="true"
                >
                  …
                </span>
              );
            }
            const isActive = token === currentPage;
            return (
              <button
                key={token}
                type="button"
                onClick={() => goToPage(token)}
                disabled={isActive || disabled}
                className={pageButtonClass(isActive)}
                aria-label={`Página ${token}`}
                aria-current={isActive ? "page" : undefined}
              >
                {token}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages || disabled}
            className={navButtonClass}
            aria-label="Página siguiente"
            title="Página siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => goToPage(totalPages)}
            disabled={currentPage === totalPages || disabled}
            className={navButtonClass}
            aria-label="Última página"
            title="Última página"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>

          {/* Jump to page */}
          <form
            onSubmit={handleJumpSubmit}
            className="flex items-center gap-1 ml-1"
            aria-label="Ir a página"
          >
            <span className="text-sm text-gray-600">Ir a</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={jumpValue}
              onChange={(e) => setJumpValue(e.target.value)}
              placeholder={`${currentPage}`}
              disabled={disabled}
              className="w-14 h-8 border border-gray-300 rounded-md text-sm px-2 text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Número de página"
            />
            <button
              type="submit"
              disabled={disabled || !jumpValue}
              className="h-8 px-2 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Ir
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
