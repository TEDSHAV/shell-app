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
export function fold_requisicion_text(value: string | null | undefined): string {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function mapGerenciaSolicitante(deptName: string | null | undefined): string {
  const d = fold_requisicion_text(deptName);
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
  return fold_requisicion_text(deptName).includes("capacitacion");
}

// True when the given department name corresponds to the Servicios Tecnicos department.
export function isServiciosTecnicosDept(deptName: string | null | undefined): boolean {
  const d = fold_requisicion_text(deptName);
  return d.includes("servicios") && d.includes("tecnic");
}

export type OsiTipoFilter = "capacitacion" | "servicios tecnicos" | "all";

export function osi_tipo_filter_for_departamento(
  deptName: string | null | undefined,
): OsiTipoFilter {
  if (isCapacitacionDept(deptName)) return "capacitacion";
  if (isServiciosTecnicosDept(deptName)) return "servicios tecnicos";
  return "all";
}

export function osi_matches_tipo_filter(
  tipo_servicio: string | null | undefined,
  filter: OsiTipoFilter,
): boolean {
  if (filter === "all") return true;
  const tipo = fold_requisicion_text(tipo_servicio);
  if (filter === "servicios tecnicos") {
    return tipo.includes("servicios tecnicos") || tipo.includes("servicio tecnico");
  }
  return tipo.includes("capacitacion");
}

export function externa_mode_for_departamento(
  deptName: string | null | undefined,
): "capacitacion" | "servicios tecnicos" | "negocios" {
  if (isCapacitacionDept(deptName)) return "capacitacion";
  if (isServiciosTecnicosDept(deptName)) return "servicios tecnicos";
  return "negocios";
}

// True when the department is Administración (name contains "admin").
export function isAdministracionDept(deptName: string | null | undefined): boolean {
  return fold_requisicion_text(deptName).includes("admin");
}

export function normalizeDeptKey(deptName: string | null | undefined): string {
  return fold_requisicion_text(deptName)
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

export type ApproverRecordFlags = {
  tipo_solicitud?: string | null;
  id_osi?: unknown;
  departamento?: string | null;
  lider_estatus?: string | null;
  coordinador_estatus?: string | null;
  aumento_costos_estatus?: string | null;
  costos_confirmados_at?: string | null;
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

/** Líder pendiente: internas con lider_estatus pendiente (sin filtro de montos). */
export function isLiderGatePending(record: ApproverRecordFlags): boolean {
  if (!isInternaRecord(record)) return false;
  if (record.lider_estatus !== "pendiente") return false;
  return true;
}

/** Administración no tramita internas hasta que coord/líder (si aplican) estén en null o aprobada. */
export function admin_tramite_blocked_reason(
  record: ApproverRecordFlags,
): string | null {
  if (record.aumento_costos_estatus === "pendiente") {
    return "Espere el sello de aumento de costos.";
  }
  if (record.aumento_costos_estatus === "rechazada") {
    return "El aumento de costos fue rechazado.";
  }
  if (!isInternaRecord(record)) return null;
  if (record.coordinador_estatus === "pendiente") {
    return "Espere el sello del coordinador.";
  }
  if (record.coordinador_estatus === "rechazada") {
    return "El coordinador rechazó esta requisición.";
  }
  if (record.lider_estatus === "pendiente") {
    return "Espere el sello del líder.";
  }
  if (record.lider_estatus === "rechazada") {
    return "El líder rechazó esta requisición.";
  }
  return null;
}

export function assert_admin_tramite_allowed(record: ApproverRecordFlags): void {
  const reason = admin_tramite_blocked_reason(record);
  if (reason) throw new Error(reason);
}

export function isAumentoGatePending(record: ApproverRecordFlags): boolean {
  if (isInternaRecord(record)) return false;
  return record.aumento_costos_estatus === "pendiente";
}

export function canStampAumentoCostos(params: {
  record: ApproverRecordFlags;
  can_approve_aumento: boolean;
  liderDepts: string[];
  coordinadorDepts: string[];
}): boolean {
  if (!isAumentoGatePending(params.record)) return false;
  if (params.record._isOwn) return false;
  if (params.can_approve_aumento) return true;
  return (
    deptNameInList(params.record.departamento, params.liderDepts) ||
    deptNameInList(params.record.departamento, params.coordinadorDepts)
  );
}

export function isPendingForCurrentApprover(
  record: ApproverRecordFlags,
  liderDepts: string[],
  coordinadorDepts: string[],
): boolean {
  if (record._isApprovalHistory) return false;
  if (isAumentoGatePending(record)) {
    if (record._isOwn) return false;
    return (
      deptNameInList(record.departamento, liderDepts) ||
      deptNameInList(record.departamento, coordinadorDepts)
    );
  }
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
