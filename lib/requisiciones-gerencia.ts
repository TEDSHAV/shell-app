// Maps a user's department name to the corresponding "Gerencia Solicitante".
// Used by the requisiciones form so the Gerencia field reflects the
// organizational grouping rather than the literal department.
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
