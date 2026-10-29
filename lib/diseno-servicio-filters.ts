import type { DisenoServicioListItem } from "@/types/diseno-servicio";

export interface DisenoServicioFilters {
  search: string;
  solicitante: string;
  departamento: string;
  estatus: string;
  osiLink: "" | "with_osi" | "without_osi";
  dateFrom: string;
  dateTo: string;
}

export type DeptTab = "todos" | "cap" | "st";

export interface DepartmentCounts {
  todos: number;
  cap: number;
  st: number;
}

export interface DepartmentSubtleMetric {
  solicitados: number;
  finalizados: number;
  porcentaje: number;
}

export interface DisenoMetrics {
  cap: DepartmentSubtleMetric;
  st: DepartmentSubtleMetric;
  todos: DepartmentSubtleMetric;
}

/**
 * Calculates rounded integer percentage (done vs requested).
 */
export function calculateDonePercentage(finalizados: number, solicitados: number): number {
  if (solicitados <= 0) return 0;
  return Math.round((finalizados / solicitados) * 100);
}

/**
 * Single source of truth for classifying whether a service request
 * belongs to Capacitación (CAP) or Servicios Técnicos (ST).
 */
export function isCapacitacion(
  item: Pick<DisenoServicioListItem, "tipo_naturaleza" | "id_departamento_ejecutante">,
): boolean {
  if (item.tipo_naturaleza === "cap") return true;
  if (item.tipo_naturaleza === "st") return false;
  if (item.id_departamento_ejecutante === 4) return false;
  if (item.id_departamento_ejecutante === 3) return true;
  return true; // Fallback default aligns with getDisenoServicioList
}

export function isServiciosTecnicos(
  item: Pick<DisenoServicioListItem, "tipo_naturaleza" | "id_departamento_ejecutante">,
): boolean {
  return !isCapacitacion(item);
}

/**
 * Checks if a request is finished/finalized (status 38 = Aprobada/Respondida/Lista).
 */
export function isFinalizado(
  item: Pick<DisenoServicioListItem, "id_estatus" | "estatus_nombre">,
): boolean {
  if (item.id_estatus === 38) return true;
  const name = (item.estatus_nombre || "").toLowerCase();
  return (
    name.includes("aprobada") ||
    name.includes("lista") ||
    name.includes("finalizada") ||
    name.includes("completad")
  );
}

/**
 * Extracts a calendar YYYY-MM-DD date string safely without timezone drift.
 */
export function extractLocalDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  if (trimmed.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }
  try {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }
  } catch {
    // fallback
  }
  return trimmed.slice(0, 10);
}

/**
 * Checks if a record matches all active DisenoServicioFilters.
 */
export function matchesDisenoFilters(
  record: DisenoServicioListItem,
  filters: DisenoServicioFilters,
): boolean {
  // Text search
  if (filters.search) {
    const rawQ = filters.search.toLowerCase().trim();
    if (rawQ) {
      const cleanIdQ = rawQ.replace(/^#/, "").trim();
      const recordIdStr = record.id.toString();
      const matchesId =
        cleanIdQ.length > 0 &&
        (recordIdStr === cleanIdQ || recordIdStr.includes(cleanIdQ));
      const matchesNombre = record.nombre_sugerido?.toLowerCase().includes(rawQ);
      const matchesTipo = record.tipo_servicio?.toLowerCase().includes(rawQ);
      const matchesSolicitante = record.solicitante_nombre?.toLowerCase().includes(rawQ);
      const matchesDepto = record.solicitante_departamento?.toLowerCase().includes(rawQ);
      const matchesEstatus = record.estatus_nombre?.toLowerCase().includes(rawQ);
      const matchesOsi = record.osi_numeros?.some((n) => n.toLowerCase().includes(rawQ));

      if (
        !matchesId &&
        !matchesNombre &&
        !matchesTipo &&
        !matchesSolicitante &&
        !matchesDepto &&
        !matchesEstatus &&
        !matchesOsi
      ) {
        return false;
      }
    }
  }

  // OSI link filter
  if (filters.osiLink === "with_osi" && (record.osi_count || 0) === 0) {
    return false;
  }
  if (filters.osiLink === "without_osi" && (record.osi_count || 0) > 0) {
    return false;
  }

  // Solicitante
  if (filters.solicitante && record.solicitante_nombre !== filters.solicitante) {
    return false;
  }

  // Departamento Solicitante
  if (
    filters.departamento &&
    record.solicitante_departamento !== filters.departamento
  ) {
    return false;
  }

  // Estatus
  if (filters.estatus) {
    const statusId = Number(filters.estatus);
    if (!isNaN(statusId) && record.id_estatus !== statusId) {
      return false;
    }
  }

  // Dates (inclusive calendar day comparison)
  const itemDate = extractLocalDate(record.fecha_solicitud);
  if (filters.dateFrom) {
    if (!itemDate || itemDate < filters.dateFrom) {
      return false;
    }
  }
  if (filters.dateTo) {
    if (!itemDate || itemDate > filters.dateTo) {
      return false;
    }
  }

  return true;
}

/**
 * Computes counts per department tab (todos, cap, st).
 */
export function computeDepartmentCounts(
  records: DisenoServicioListItem[],
): DepartmentCounts {
  let cap = 0;
  let st = 0;
  for (const r of records) {
    if (isCapacitacion(r)) {
      cap++;
    } else {
      st++;
    }
  }
  return { todos: records.length, cap, st };
}

/**
 * Computes subtle requested vs finished metrics per department,
 * including percentage of completion (done vs requested).
 */
export function computeDepartmentMetrics(
  records: DisenoServicioListItem[],
): DisenoMetrics {
  let capSolicitados = 0;
  let capFinalizados = 0;
  let stSolicitados = 0;
  let stFinalizados = 0;

  for (const r of records) {
    const finished = isFinalizado(r);
    if (isCapacitacion(r)) {
      capSolicitados++;
      if (finished) capFinalizados++;
    } else {
      stSolicitados++;
      if (finished) stFinalizados++;
    }
  }

  const totalSolicitados = capSolicitados + stSolicitados;
  const totalFinalizados = capFinalizados + stFinalizados;

  return {
    cap: {
      solicitados: capSolicitados,
      finalizados: capFinalizados,
      porcentaje: calculateDonePercentage(capFinalizados, capSolicitados),
    },
    st: {
      solicitados: stSolicitados,
      finalizados: stFinalizados,
      porcentaje: calculateDonePercentage(stFinalizados, stSolicitados),
    },
    todos: {
      solicitados: totalSolicitados,
      finalizados: totalFinalizados,
      porcentaje: calculateDonePercentage(totalFinalizados, totalSolicitados),
    },
  };
}

/**
 * Filters records by both general filters and department tab.
 */
export function filterDisenoRecords(
  records: DisenoServicioListItem[],
  filters: DisenoServicioFilters,
  activeDeptTab: DeptTab,
): DisenoServicioListItem[] {
  return records.filter((r) => {
    if (!matchesDisenoFilters(r, filters)) {
      return false;
    }
    if (activeDeptTab === "cap") {
      return isCapacitacion(r);
    }
    if (activeDeptTab === "st") {
      return isServiciosTecnicos(r);
    }
    return true;
  });
}
