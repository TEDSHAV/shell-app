export type OsiStFechaRango = {
  inicio: string | null;
  fin: string | null;
};

export type OsiStFechasServicioSlice = {
  reunionPreProyecto: string | null;
  diasCampo: OsiStFechaRango;
  diasInforme: OsiStFechaRango;
  diasRevision: OsiStFechaRango;
};

export const OSI_ST_FECHA_RANGO_VACIO: OsiStFechaRango = {
  inicio: null,
  fin: null,
};

export function format_osi_st_garantia_default(dias: number): string {
  const n = Number.isFinite(dias) && dias > 0 ? Math.round(dias) : 15;
  return `${n} días`;
}

export function resolve_osi_st_garantia_display(
  stored: string | null | undefined,
  default_dias?: number,
): string {
  const trimmed = String(stored ?? "").trim();
  if (trimmed) return trimmed;
  return format_osi_st_garantia_default(default_dias ?? 15);
}

export function resolve_st_fecha_reunion_pre_proyecto(
  fecha_inicio_real: string | null | undefined,
  sessions: Array<{ fecha?: string | null }> | undefined,
): string | null {
  const raw_real = String(fecha_inicio_real ?? "").trim();
  if (raw_real) return raw_real;
  for (const session of sessions ?? []) {
    const fecha = String(session?.fecha ?? "").trim();
    if (fecha) return fecha;
  }
  return null;
}

export function build_st_fechas_planificadas(
  reunion_iso: string | null,
): OsiStFechasServicioSlice {
  return {
    reunionPreProyecto: reunion_iso,
    diasCampo: { ...OSI_ST_FECHA_RANGO_VACIO },
    diasInforme: { ...OSI_ST_FECHA_RANGO_VACIO },
    diasRevision: { ...OSI_ST_FECHA_RANGO_VACIO },
  };
}

export function build_st_fechas_ejecutadas_vacias(): OsiStFechasServicioSlice {
  return {
    reunionPreProyecto: null,
    diasCampo: { ...OSI_ST_FECHA_RANGO_VACIO },
    diasInforme: { ...OSI_ST_FECHA_RANGO_VACIO },
    diasRevision: { ...OSI_ST_FECHA_RANGO_VACIO },
  };
}

export function has_st_sesiones_ejecutadas(
  sessions:
    | Array<{ fecha?: string | null }>
    | undefined,
): boolean {
  return (sessions ?? []).some((session) =>
    String(session?.fecha ?? "").trim(),
  );
}
