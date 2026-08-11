"use client";

import { useState, useEffect, useLayoutEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import type {
  OSIListFilters,
  OSIListItem,
  OSIStatusOption,
} from "@/types/osi";
import { getOSIList, getOSIListFilterOptions, updateOSIStatus, updateSessionStatus, setOSIHiddenForClient, toggleOSIAttachmentReceived } from "@/actions/osi";
import OSIFilters from "./components/OSIFilters";
import OSITable from "./components/OSITable";
import OSIPagination from "./components/OSIPagination";
import OSICommentsSheet from "./components/OSICommentsSheet";

interface ConsultaOSIClientProps {
  canChangeStatus: boolean;
  canHideForClient: boolean;
  canToggleAttachment: boolean;
}

// Cache key for a (filters, page, itemsPerPage) combination.
type CacheKey = string;

interface CacheEntry {
  osis: OSIListItem[];
  totalCount: number;
  timestamp: number;
}

// Stale-while-revalidate: entries are fresh for 60s, then stale but still
// usable instantly while a refetch runs in the background.
const FRESH_MS = 60_000;
const MAX_CACHE = 20;

function cacheKey(filters: OSIListFilters, page: number, itemsPerPage: number): CacheKey {
  return JSON.stringify({ ...filters, page, itemsPerPage });
}

export default function ConsultaOSIClient({ canChangeStatus, canHideForClient, canToggleAttachment }: ConsultaOSIClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
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

  // --- Client-side page cache (stale-while-revalidate) ---
  const cacheRef = useRef<Map<CacheKey, CacheEntry>>(new Map());
  const filtersLoadedRef = useRef(false);

  const getCached = useCallback((key: CacheKey): CacheEntry | null => {
    const entry = cacheRef.current.get(key);
    if (!entry) return null;
    return entry;
  }, []);

  const setCached = useCallback((key: CacheKey, entry: CacheEntry) => {
    cacheRef.current.set(key, entry);
    // Evict oldest entries if cache grows too large.
    if (cacheRef.current.size > MAX_CACHE) {
      const firstKey = cacheRef.current.keys().next().value;
      if (firstKey) cacheRef.current.delete(firstKey);
    }
  }, []);

  // --- Sync cache swap: runs before paint so cached data appears instantly ---
  useLayoutEffect(() => {
    const key = cacheKey(filters, currentPage, itemsPerPage);
    const cached = getCached(key);
    if (cached) {
      setOsis(cached.osis);
      setTotalCount(cached.totalCount);
      // If fresh, we can skip the fetch entirely — clear all loading states.
      if (Date.now() - cached.timestamp < FRESH_MS) {
        setLoading(false);
        setFetching(false);
        if (!filtersLoadedRef.current) setLoadingFilters(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, currentPage, itemsPerPage]);

  // --- Async fetch: runs after paint, only if data is stale or missing ---
  useEffect(() => {
    let cancelled = false;

    const key = cacheKey(filters, currentPage, itemsPerPage);
    const cached = getCached(key);

    // If we have fresh cached data, skip the fetch entirely.
    if (cached && Date.now() - cached.timestamp < FRESH_MS) {
      return;
    }

    const isInitialLoad = !filtersLoadedRef.current;
    const hasExistingData = osis.length > 0;

    // Determine loading state.
    if (cached) {
      // Stale cache — data already shown by layout effect, just fetch in background.
      setLoading(false);
      setFetching(true);
    } else if (hasExistingData || !isInitialLoad) {
      // Filter/page change with no cache: keep old data visible, show thin bar.
      setLoading(false);
      setFetching(true);
    } else {
      // Very first load — full spinner.
      setLoading(true);
      setFetching(false);
    }

    if (isInitialLoad) setLoadingFilters(true);

    const loadAll = async () => {
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
        setCached(key, {
          osis: dataResult.osis,
          totalCount: dataResult.totalCount,
          timestamp: Date.now(),
        });

        if (isInitialLoad && results[1]) {
          const options = results[1];
          setCompanies(options.companies);
          setEjecutivos(options.ejecutivos);
          setCityOptions(options.cityOptions);
          setStatuses(options.statuses);
          filtersLoadedRef.current = true;
        }
      } catch (error) {
        console.error("Error loading OSI data:", error);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setFetching(false);
          setLoadingFilters(false);
        }
      }
    };

    loadAll();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, currentPage, itemsPerPage]);

  // --- Prefetch next page in the background (only when not on last page) ---
  useEffect(() => {
    const totalPages = Math.ceil(totalCount / itemsPerPage);
    if (currentPage >= totalPages) return;
    const nextPage = currentPage + 1;
    const nextKey = cacheKey(filters, nextPage, itemsPerPage);
    if (getCached(nextKey)) return; // already cached

    let cancelled = false;
    // Small delay so the prefetch doesn't compete with the main fetch.
    const timer = setTimeout(async () => {
      if (cancelled) return;
      try {
        const result = await getOSIList(filters, nextPage, itemsPerPage);
        if (cancelled) return;
        setCached(nextKey, {
          osis: result.osis,
          totalCount: result.totalCount,
          timestamp: Date.now(),
        });
      } catch {
        // Prefetch failure is non-fatal.
      }
    }, 300);

    return () => { cancelled = true; clearTimeout(timer); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, totalCount, itemsPerPage, filters]);

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
        // Invalidate cache for current view since data changed.
        const key = cacheKey(filters, currentPage, itemsPerPage);
        cacheRef.current.delete(key);
      } else {
        console.error("Error changing OSI status:", result.error);
      }
      return result;
    },
    [statuses, filters, currentPage, itemsPerPage],
  );

  const handleSessionStatusChange = useCallback(
    async (
      sessionId: number,
      newStatusId: number,
      execution?: {
        fecha_ejecutada: string;
        hora_ejecutada: string;
        ejecutada_en_fecha_planificada: boolean;
      },
    ) => {
      return await updateSessionStatus(sessionId, newStatusId, execution);
    },
    [],
  );

  const handleToggleHidden = useCallback(
    async (osi: OSIListItem, hidden: boolean) => {
      if (!osi.id_osi) return { success: false, error: "OSI inválido" };
      const result = await setOSIHiddenForClient(osi.id_osi, hidden);
      if (result.success) {
        setOsis((prev) =>
          prev.map((o) =>
            o.id_osi === osi.id_osi
              ? { ...o, oculto_para_cliente: hidden }
              : o,
          ),
        );
        // Invalidate cache for current view since data changed.
        const key = cacheKey(filters, currentPage, itemsPerPage);
        cacheRef.current.delete(key);
      } else {
        console.error("Error toggling OSI hidden state:", result.error);
      }
      return result;
    },
    [filters, currentPage, itemsPerPage],
  );

  const handleToggleAttachment = useCallback(
    async (osi: OSIListItem) => {
      if (!osi.id_osi) return { success: false, error: "OSI inválido" };
      const result = await toggleOSIAttachmentReceived(osi.id_osi);
      if (result.success) {
        const newReceived = !!result.attachment_received;
        const newAt = newReceived ? new Date().toISOString() : null;
        setOsis((prev) =>
          prev.map((o) =>
            o.id_osi === osi.id_osi
              ? { ...o, attachment_received: newReceived, attachment_received_at: newAt }
              : o,
          ),
        );
        // Invalidate cache for current view since data changed.
        const key = cacheKey(filters, currentPage, itemsPerPage);
        cacheRef.current.delete(key);
      } else {
        console.error("Error toggling attachment received:", result.error);
        alert(result.error);
      }
      return result;
    },
    [filters, currentPage, itemsPerPage],
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
          fetching={fetching}
          onCommentsClick={handleCommentsClick}
          selectedOSI={selectedOSI}
          canChangeStatus={canChangeStatus}
          statuses={statuses}
          onStatusChange={handleStatusChange}
          onSessionStatusChange={canChangeStatus ? handleSessionStatusChange : undefined}
          canHideForClient={canHideForClient}
          onToggleHidden={canHideForClient ? handleToggleHidden : undefined}
          canToggleAttachment={canToggleAttachment}
          onToggleAttachment={canToggleAttachment ? handleToggleAttachment : undefined}
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
