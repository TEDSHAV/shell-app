"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type {
  OSIListFilters,
  OSIListItem,
  OSIStatusOption,
} from "@/types/osi";
import { getOSIList, getOSIListFilterOptions, updateOSIStatus, updateSessionStatus } from "@/actions/osi";
import OSIFilters from "./components/OSIFilters";
import OSITable from "./components/OSITable";
import OSIPagination from "./components/OSIPagination";
import OSICommentsSheet from "./components/OSICommentsSheet";

interface ConsultaOSIClientProps {
  canChangeStatus: boolean;
}

export default function ConsultaOSIClient({ canChangeStatus }: ConsultaOSIClientProps) {
  const router = useRouter();
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
    let cancelled = false;

    const loadAll = async () => {
      const isInitialLoad = !statuses.length;

      setLoading(true);
      if (isInitialLoad) setLoadingFilters(true);

      try {
        const promises: Promise<any>[] = [
          getOSIList(filters, currentPage, itemsPerPage),
        ];

        if (isInitialLoad) {
          promises.push(getOSIListFilterOptions());
        }

        const results = await Promise.all(promises);

        if (cancelled) return;

        const dataResult = results[0];
        setOsis(dataResult.osis);
        setTotalCount(dataResult.totalCount);

        if (isInitialLoad && results[1]) {
          const options = results[1];
          setCompanies(options.companies);
          setEjecutivos(options.ejecutivos);
          setCityOptions(options.cityOptions);
          setStatuses(options.statuses);
        }
      } catch (error) {
        console.error("Error loading OSI data:", error);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setLoadingFilters(false);
        }
      }
    };

    loadAll();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (osi.id_osi) {
      router.push(`/consulta-osi/preview/${osi.id_osi}`);
    }
  }, [router]);

  const handleCommentsClick = useCallback((osi: OSIListItem) => {
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

  const handleSessionStatusChange = useCallback(
    async (sessionId: number, newStatusId: number) => {
      return await updateSessionStatus(sessionId, newStatusId);
    },
    [],
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
          onCommentsClick={handleCommentsClick}
          selectedOSI={selectedOSI}
          canChangeStatus={canChangeStatus}
          statuses={statuses}
          onStatusChange={handleStatusChange}
          onSessionStatusChange={canChangeStatus ? handleSessionStatusChange : undefined}
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
