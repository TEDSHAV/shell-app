// Maps a user's department name to the corresponding "Gerencia Solicitante".
//
// This is a FALLBACK only. The primary source of truth is the DB's
// `departamentos.gerencia` column (a FK to `gerencias.nombre`), which is read
// by `getCurrentUser()` (server-side) and `getRequisicionRecord()` (for display).
// This hardcoded mapping is used when:
//   1. The DB gerencia is empty/missing (edge case)
//   2. A legacy record has no `departamento` and we need to derive the gerencia
//      from the stored `gerencia_solicitante` in list views (no per-record DB
//      lookup is feasible there)
//
// If the DB mapping changes, update this function to stay in sync.
//
// Mapping:
//   Capacitacion, Servicios Tecnicos, Calidad, SIG, SSST -> "Servicios"
//   TED, Marketing, Negocios                            -> "Negocios"
//   Administracion, Recursos Humanos, Contabilidad       -> "Administracion"
//   (fallback)                                          -> the department name itself
export function mapGerenciaSolicitante(deptName: string | null | undefined): string {
  const d = (deptName || "").trim().toLowerCase();
  if (!d) return "";
  if (
    d.includes("capacitacion") ||
    (d.includes("servicios") && d.includes("tecnic")) ||
    d.includes("calidad") ||
    d === "sig" ||
    d.includes("ssst")
  ) {
    return "Servicios";
  }
  if (d === "ted" || d.includes("marketing") || d.includes("negocios")) {
    return "Negocios";
  }
  if (
    d.includes("admin") ||
    (d.includes("recursos") && d.includes("humanos")) ||
    d.includes("contabilidad")
  ) {
    return "Administracion";
  }
  return deptName!.trim();
}

// True when the given department name corresponds to the Capacitacion department.
export function isCapacitacionDept(deptName: string | null | undefined): boolean {
  return (deptName || "").trim().toLowerCase().includes("capacitacion");
}

// True when the given department name corresponds to the Servicios Tecnicos department.
export function isServiciosTecnicosDept(deptName: string | null | undefined): boolean {
  const d = (deptName || "").trim().toLowerCase();
  return d.includes("servicios") && d.includes("tecnic");
}

// True when the department is Administración (name contains "admin").
export function isAdministracionDept(deptName: string | null | undefined): boolean {
  return (deptName || "").trim().toLowerCase().includes("admin");
}

export function normalizeDeptKey(deptName: string | null | undefined): string {
  return (deptName || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

export function deptNameInList(
  deptName: string | null | undefined,
  list: string[],
): boolean {
  if (!deptName) return false;
  const target = normalizeDeptKey(deptName);
  return list.some((d) => normalizeDeptKey(d) === target);
}

export const deptInList = deptNameInList;

function isInternaRecord(record: {
  tipo_solicitud?: string | null;
  id_osi?: unknown;
}): boolean {
  return (
    record.tipo_solicitud === "Interno" ||
    (!record.tipo_solicitud && !record.id_osi)
  );
}

type ApproverRecordFlags = {
  tipo_solicitud?: string | null;
  id_osi?: unknown;
  departamento?: string | null;
  lider_estatus?: string | null;
  coordinador_estatus?: string | null;
  _isApprovalHistory?: boolean;
  _isOwn?: boolean;
  _creatorIsDeptCoordinador?: boolean;
  _deptHasCoordinador?: boolean;
};

export function skipsCoordinadorGate(record: ApproverRecordFlags): boolean {
  if (record._creatorIsDeptCoordinador) return true;
  if (record._deptHasCoordinador === false) return true;
  return false;
}

export function isLiderGatePending(record: ApproverRecordFlags): boolean {
  if (!isInternaRecord(record)) return false;
  if (record.lider_estatus === "aprobada" || record.lider_estatus === "rechazada") {
    return false;
  }
  if (record.lider_estatus === "pendiente") return true;
  if (skipsCoordinadorGate(record) && record.coordinador_estatus !== "rechazada") {
    return true;
  }
  return false;
}

export function isPendingForCurrentApprover(
  record: ApproverRecordFlags,
  liderDepts: string[],
  coordinadorDepts: string[],
): boolean {
  if (record._isApprovalHistory) return false;
  if (!isInternaRecord(record)) return false;
  if (
    isLiderGatePending(record) &&
    deptNameInList(record.departamento, liderDepts)
  ) {
    return true;
  }
  if (record._isOwn || skipsCoordinadorGate(record)) return false;
  if (
    record.coordinador_estatus === "pendiente" &&
    deptNameInList(record.departamento, coordinadorDepts)
  ) {
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// TEMPORARY WORKAROUND — interna approval routing override.
//
// Requisiciones INTERNAS from these departments must be approved by the lider of
// the target gerencia below instead of the lider of their own
// departamentos.gerencia. Requested so the Negocios lider approves these
// departments' internas for a while, because the Servicios lider is temporarily
// absent.
//
// Scope: internas ONLY. Externas keep the department coordinador as approver
// (with the department's natural gerencia lider as fallback).
//
// Coverage: every department whose natural gerencia is "Servicios"
// (Capacitacion, Servicios Tecnicos, Calidad, SIG, SSST) plus TED (which is
// naturally Negocios but is listed for clarity). When the Servicios lider
// returns, remove the Servicios-gerencia entries (and TED if desired).
//
// TO REMOVE THIS WORKAROUND: delete INTERNA_LIDER_GERENCIA_OVERRIDES and the two
// helpers below; the call sites fall back to the department's own gerencia.
// ---------------------------------------------------------------------------
const INTERNA_LIDER_GERENCIA_OVERRIDES: { matches: (d: string) => boolean; gerencia: string }[] = [
  { matches: (d) => d.includes("capacitacion"), gerencia: "Negocios" },
  { matches: (d) => d.includes("servicios") && d.includes("tecnic"), gerencia: "Negocios" },
  { matches: (d) => d.includes("calidad"), gerencia: "Negocios" },
  // Exact match: "sig" is short enough that a substring test would be risky.
  { matches: (d) => d === "sig", gerencia: "Negocios" },
  { matches: (d) => d.includes("ssst"), gerencia: "Negocios" },
  // Exact match: "ted" is short enough that a substring test would be risky.
  { matches: (d) => d === "ted", gerencia: "Negocios" },
];

// Returns the gerencia whose lider must approve INTERNAS for the given
// department, or null when the department's own gerencia should be used.
export function resolveInternaApprovalGerencia(
  deptName: string | null | undefined,
): string | null {
  const d = (deptName || "").trim().toLowerCase();
  if (!d) return null;
  return INTERNA_LIDER_GERENCIA_OVERRIDES.find((o) => o.matches(d))?.gerencia || null;
}

// True when the given department's interna approval is redirected to another
// gerencia's lider.
export function isInternaLiderOverrideDept(deptName: string | null | undefined): boolean {
  return resolveInternaApprovalGerencia(deptName) !== null;
}

// Returns the date string (YYYY-MM-DD) used to display a requisicion in the
// list's "Fecha" column. This MUST match the value rendered by RequisicionRow
// so the date filters compare against the same date the user sees:
//   1. The selected session's fecha (when id_sesion is set and found)
//   2. The OSI's fecha_inicio_real
//   3. The requisicion's fecha_solicitud
//   4. "" when none are present
//
// Values are sliced to 10 chars (YYYY-MM-DD) so lexicographic comparison
// against the <input type="date"> filter values stays correct even if a source
// returns a full timestamp.
export function getRequisicionDisplayDate(record: any): string {
  const sesiones = record?.v_osi_formato_completo?.desglose_recursos_sesiones as any[] | null | undefined;
  const selectedSesion = record?.id_sesion
    ? (sesiones || []).find((s) => s?.id_sesion === record.id_sesion)
    : null;
  const executionDate = selectedSesion?.fecha || record?.v_osi_formato_completo?.fecha_inicio_real;
  const value = executionDate || record?.fecha_solicitud || "";
  return typeof value === "string" ? value.slice(0, 10) : "";
}
