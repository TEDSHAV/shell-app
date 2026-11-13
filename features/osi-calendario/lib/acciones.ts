import type { AccionSesion, EstadoSesion, PermisosSesion } from "./types";

/** Lo que significa cada acción, visible antes de elegirla (mismo vocabulario que los estados). */
export const ACCION_UI: Record<AccionSesion, { titulo: string; descripcion: string; boton: string; color: string; activo: string; icono_activo: string; texto: string }> = {
  ejecutar: {
    titulo: "Ejecutada",
    descripcion: "Se dictó. Registra la fecha en que se dio.",
    boton: "Marcar como ejecutada",
    color: "border-emerald-200 text-emerald-800 hover:bg-emerald-50",
    activo: "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500",
    icono_activo: "bg-emerald-600 text-white",
    texto: "text-emerald-700",
  },
  no_se_dio: {
    titulo: "No ejecutada",
    descripcion: "No se dictó en su fecha. Quien corresponda decidirá si se reagenda o se suspende.",
    boton: "Marcar como no ejecutada",
    color: "border-amber-200 text-amber-900 hover:bg-amber-50",
    activo: "border-amber-500 bg-amber-50 ring-1 ring-amber-500",
    icono_activo: "bg-amber-500 text-white",
    texto: "text-amber-700",
  },
  reagendar: {
    titulo: "Reagendar",
    descripcion: "No se dio, pero se va a dar. La fecha nueva puede quedar pendiente.",
    boton: "Reagendar sesión",
    color: "border-violet-200 text-violet-800 hover:bg-violet-50",
    activo: "border-violet-500 bg-violet-50 ring-1 ring-violet-500",
    icono_activo: "bg-violet-600 text-white",
    texto: "text-violet-700",
  },
  no_ejecutar: {
    titulo: "Suspender",
    descripcion: "No se da por ahora. Cuenta como no ejecutada y se puede reactivar reagendándola.",
    boton: "Suspender sesión",
    color: "border-rose-200 text-rose-800 hover:bg-rose-50",
    activo: "border-rose-500 bg-rose-50 ring-1 ring-rose-500",
    icono_activo: "bg-rose-600 text-white",
    texto: "text-rose-700",
  },
};

/** Título de la acción según la sesión: reagendar una suspendida es «Reactivar». */
export function titulo_accion(accion: AccionSesion, estado: EstadoSesion): string {
  return accion === "reagendar" && estado === "cancelada" ? "Reactivar" : ACCION_UI[accion].titulo;
}

export const ACCION_BOTON_PRIMARIO: Record<AccionSesion, string> = {
  ejecutar: "bg-emerald-600 hover:bg-emerald-700",
  no_se_dio: "bg-amber-500 hover:bg-amber-600",
  reagendar: "bg-violet-600 hover:bg-violet-700",
  no_ejecutar: "bg-rose-600 hover:bg-rose-700",
};

export const SIN_PERMISOS: PermisosSesion = { ejecutar: false, reagendar: false, cancelar: false };

export function tiene_algun_permiso(p: PermisosSesion): boolean {
  return p.ejecutar || p.reagendar || p.cancelar;
}

/**
 * Acciones que ve cada quien, en orden:
 * - ejecutar: permiso ejecutar.
 * - no_se_dio: permiso ejecutar y le falta reagendar o cancelar (si tiene los tres, decide directo);
 *   solo si la fecha ya llegó y la sesión sigue abierta.
 * - reagendar: permiso reagendar. Cancelar: permiso cancelar.
 */
/** Acciones del lote (sin mirar el estado de cada sesión): las mismas reglas de permisos que el detalle. */
export function acciones_por_permiso(p: PermisosSesion): AccionSesion[] {
  const out: AccionSesion[] = [];
  if (p.ejecutar) out.push("ejecutar");
  if (p.ejecutar && !(p.reagendar && p.cancelar)) out.push("no_se_dio");
  if (p.reagendar) out.push("reagendar");
  if (p.cancelar) out.push("no_ejecutar");
  return out;
}

/**
 * ¿Tiene sentido aplicar la acción a esta sesión? Lo usa el lote para omitir las que no aplican
 * (y decir por qué) antes de llamar a la RPC. Devuelve null si aplica, o el motivo si no.
 */
export function motivo_no_aplica(accion: AccionSesion, estado: EstadoSesion, fecha_efectiva: string, hoy: string): string | null {
  const cerrada = estado === "ejecutada" || estado === "cancelada";
  switch (accion) {
    case "ejecutar":
      if (estado === "ejecutada") return "Ya está ejecutada";
      if (estado === "sin_fecha") return "No tiene fecha";
      if (fecha_efectiva > hoy) return "Su fecha todavía no llega";
      return null;
    case "no_se_dio":
      if (cerrada) return estado === "ejecutada" ? "Ya está ejecutada" : "Ya está suspendida";
      if (estado === "no_se_dio") return "Ya está como no ejecutada";
      if (estado === "sin_fecha") return "No tiene fecha";
      if (fecha_efectiva > hoy) return "Su fecha todavía no llega";
      return null;
    case "reagendar":
      // Reagendar una suspendida es reactivarla.
      return estado === "ejecutada" ? "Ya está ejecutada" : null;
    case "no_ejecutar":
      if (estado === "cancelada") return "Ya está suspendida";
      if (estado === "ejecutada") return "Ya está ejecutada";
      return null;
  }
}

export function acciones_disponibles(p: PermisosSesion, estado: EstadoSesion, fecha_efectiva: string, hoy: string): AccionSesion[] {
  const abierta = estado !== "ejecutada" && estado !== "cancelada";
  const out: AccionSesion[] = [];
  if (p.ejecutar) out.push("ejecutar");
  if (p.ejecutar && !(p.reagendar && p.cancelar) && abierta && estado !== "no_se_dio" && estado !== "sin_fecha" && fecha_efectiva <= hoy) {
    out.push("no_se_dio");
  }
  if (p.reagendar) out.push("reagendar");
  if (p.cancelar && estado !== "cancelada") out.push("no_ejecutar");
  return out;
}

/** Clases del diálogo: centrado en escritorio, hoja inferior en teléfono. */
export const HOJA_MOVIL =
  "max-sm:inset-x-0 max-sm:bottom-0 max-sm:top-auto max-sm:left-0 max-sm:w-full max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-b-none max-sm:max-h-[92dvh] max-sm:data-[state=open]:zoom-in-100";
