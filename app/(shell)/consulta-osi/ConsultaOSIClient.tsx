"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  OSIListFilters,
  OSIListItem,
  OSIStatusOption,
} from "@/types/osi";
import { getOSIList, getOSIListFilterOptions, updateOSIStatus } from "@/actions/osi";
import OSIFilters from "./components/OSIFilters";
import OSITable from "./components/OSITable";
import OSIPagination from "./components/OSIPagination";
import OSICommentsSheet from "./components/OSICommentsSheet";

interface ConsultaOSIClientProps {
  canChangeStatus: boolean;
}

export default function ConsultaOSIClient({ canChangeStatus }: ConsultaOSIClientProps) {
  const [loading, setLoading] = useState(true);
  const [osis, setOsis] = useState<OSIListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState<OSIListFilters>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const [companies, setCompanies] = useState<
    { id_empresa: number; nombre_empresa: string }[]
  >([]);
  const [ejecutivos, setEjecutivos] = useState<string[]>([]);
  const [cityOptions, setCityOptions] = useState<
    { id: number; nombre_ciudad: string }[]
  >([]);
  const [statuses, setStatuses] = useState<OSIStatusOption[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(true);

  const [selectedOSI, setSelectedOSI] = useState<OSIListItem | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const options = await getOSIListFilterOptions();
        setCompanies(options.companies);
        setEjecutivos(options.ejecutivos);
        setCityOptions(options.cityOptions);
        setStatuses(options.statuses);
      } catch (error) {
        console.error("Error loading filter options:", error);
      } finally {
        setLoadingFilters(false);
      }
    };
    loadFilterOptions();
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const result = await getOSIList(filters, currentPage, itemsPerPage);
        setOsis(result.osis);
        setTotalCount(result.totalCount);
      } catch (error) {
        console.error("Error loading OSIs:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [filters, currentPage, itemsPerPage]);

  const handleFiltersChange = useCallback((newFilters: OSIListFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleItemsPerPageChange = useCallback((newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  }, []);

  const handleRowClick = useCallback((osi: OSIListItem) => {
    setSelectedOSI(osi);
    setSidebarOpen(true);
  }, []);

  const handleSidebarClose = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  const handleStatusChange = useCallback(
    async (osi: OSIListItem, newStatusId: number) => {
      if (!osi.id_osi) return { success: false, error: "OSI inválido" };
      const result = await updateOSIStatus(osi.id_osi, newStatusId);
      if (result.success) {
        setOsis((prev) =>
          prev.map((o) => {
            if (o.id_osi === osi.id_osi) {
              const newStatus = statuses.find((s) => s.id === newStatusId);
              return {
                ...o,
                id_estatus: newStatusId,
                status_name: newStatus?.nombre_estado || "Desconocido",
                status_color: newStatus?.color_hex || "#9CA3AF",
              };
            }
            return o;
          }),
        );
      } else {
        console.error("Error changing OSI status:", result.error);
      }
      return result;
    },
    [statuses],
  );

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  return (
    <div className="relative h-full min-h-0">
      <div className="h-full overflow-auto p-4 sm:p-6">
        <div className="mb-4">
          <h1 className="text-xl font-bold text-gray-900">Consulta de OSIs</h1>
          <p className="mt-0.5 text-sm text-gray-600">
            Visualiza y monitorea las Órdenes de Servicio Interna
          </p>
        </div>

        <OSIFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          companies={companies}
          ejecutivos={ejecutivos}
          cityOptions={cityOptions}
          statuses={statuses}
          loading={loadingFilters}
        />

        <OSITable
          osis={osis}
          loading={loading}
          onRowClick={handleRowClick}
          selectedOSI={selectedOSI}
          canChangeStatus={canChangeStatus}
          statuses={statuses}
          onStatusChange={handleStatusChange}
        />

        <div className="mt-4">
          <OSIPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
            loading={loading}
          />
        </div>
      </div>

      <OSICommentsSheet
        osi={selectedOSI}
        open={sidebarOpen}
        onClose={handleSidebarClose}
      />
    </div>
  );
}
