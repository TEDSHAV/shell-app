import { getAppById } from "@/config/apps";

/** Inventario del departamento (no ejecución Cap/ST). */
export function inventario_href_for_app(from_app: string): string {
  const app = from_app.trim().toLowerCase();
  const q = `?from=${encodeURIComponent(app)}`;

  if (app === "administracion") {
    return `/requisiciones/depositos${q}`;
  }
  return `/requisiciones/depositos/para/${encodeURIComponent(app)}${q}`;
}

/** Inventario de ejecución / servicios (solo Cap y ST). */
export function inventario_servicios_href_for_app(
  from_app: string,
): string | null {
  const app = from_app.trim().toLowerCase();
  const q = `?from=${encodeURIComponent(app)}`;
  if (app === "capacitacion") {
    return `/requisiciones/depositos/ejecutante/capacitacion${q}`;
  }
  if (app === "servicios-tecnicos") {
    return `/requisiciones/depositos/ejecutante/tecnico${q}`;
  }
  return null;
}

/** App Shell a mostrar en sidebar/header cuando hay `?from=` en rutas de requisiciones. */
export function shell_app_id_from_query(
  pathname: string,
  from: string | null | undefined,
): string | null {
  if (!pathname.startsWith("/requisiciones")) return null;
  const id = (from || "").trim().toLowerCase();
  if (!id || id === "administracion") return null;
  return getAppById(id) ? id : null;
}
