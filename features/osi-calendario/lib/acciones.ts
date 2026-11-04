import type { AccionSesion } from "./types";

/** Lo que significa cada acción, visible antes de elegirla (mismo vocabulario que los estados). */
export const ACCION_UI: Record<AccionSesion, { titulo: string; descripcion: string; boton: string; color: string; activo: string; icono_activo: string }> = {
  ejecutar: {
    titulo: "Ejecutada",
    descripcion: "Se dictó. Registra la fecha en que se dio.",
    boton: "Marcar como ejecutada",
    color: "border-emerald-200 text-emerald-800 hover:bg-emerald-50",
    activo: "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500",
    icono_activo: "bg-emerald-600 text-white",
  },
  reagendar: {
    titulo: "Reagendar",
    descripcion: "No se dio, pero se va a dar. La fecha nueva puede quedar pendiente.",
    boton: "Reagendar sesión",
    color: "border-violet-200 text-violet-800 hover:bg-violet-50",
    activo: "border-violet-500 bg-violet-50 ring-1 ring-violet-500",
    icono_activo: "bg-violet-600 text-white",
  },
  no_ejecutar: {
    titulo: "Cancelar",
    descripcion: "No se dio y no se va a dar más.",
    boton: "Cancelar sesión",
    color: "border-rose-200 text-rose-800 hover:bg-rose-50",
    activo: "border-rose-500 bg-rose-50 ring-1 ring-rose-500",
    icono_activo: "bg-rose-600 text-white",
  },
};

export const ACCION_BOTON_PRIMARIO: Record<AccionSesion, string> = {
  ejecutar: "bg-emerald-600 hover:bg-emerald-700",
  reagendar: "bg-violet-600 hover:bg-violet-700",
  no_ejecutar: "bg-rose-600 hover:bg-rose-700",
};

/** Clases del diálogo: centrado en escritorio, hoja inferior en teléfono. */
export const HOJA_MOVIL =
  "max-sm:inset-x-0 max-sm:bottom-0 max-sm:top-auto max-sm:left-0 max-sm:w-full max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-b-none max-sm:max-h-[92dvh] max-sm:data-[state=open]:zoom-in-100";
