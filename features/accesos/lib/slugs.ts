export const PERMISSION_ACTIONS = [
  "access",
  "read",
  "write",
  "create",
  "edit",
  "approve",
  "manage",
  "export",
] as const;

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

const SLUG_PART = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugify_kebab(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function is_valid_app_or_role_slug(slug: string): boolean {
  return SLUG_PART.test(slug);
}

export const MODULE_LABELS: Record<string, string> = {
  finance: "Finanzas",
  sales: "Ventas",
  mkt: "Marketing",
  reportes: "Reportes",
  directorio: "Directorio",
  pipeline: "Pipeline",
  clientes: "Clientes",
  admin: "Administración",
  scapacitacion: "Capacitación",
  scalidad: "Calidad",
  srh: "RRHH",
};

/** App where that module is used (permissions are global; this is orientation). */
export const MODULE_HOME_APP: Record<string, string> = {
  finance: "sgestion",
  sales: "sgestion",
  mkt: "sgestion",
  reportes: "sgestion",
  directorio: "sgestion",
  pipeline: "sgestion",
  clientes: "sgestion",
  admin: "sadministracion",
  scapacitacion: "scapacitacion",
  scalidad: "scalidad",
  srh: "srh",
};

export function permission_home_app_slug(slug: string): string | null {
  return MODULE_HOME_APP[permission_module(slug)] ?? null;
}

export function permission_module(slug: string): string {
  const part = (slug.split(":")[0] || "").trim();
  return part || "otros";
}

export function module_label(slug_or_module: string): string {
  const key = permission_module(slug_or_module);
  return MODULE_LABELS[key] || key;
}

export function build_permission_slug(
  modulo: string,
  recurso: string,
  accion: string,
): string {
  const m = slugify_kebab(modulo);
  const r = slugify_kebab(recurso);
  const a = slugify_kebab(accion);
  return [m, r, a].filter(Boolean).join(":");
}

export function is_valid_permission_slug(slug: string): boolean {
  const parts = slug.split(":");
  if (parts.length < 2 || parts.length > 4) return false;
  return parts.every((p) => SLUG_PART.test(p));
}

export function group_permissions_by_module<T extends { slug: string }>(
  items: T[],
): Array<{ module: string; items: T[] }> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = permission_module(item.slug);
    const list = map.get(key) || [];
    list.push(item);
    map.set(key, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([module, grouped]) => ({
      module,
      items: grouped.sort((x, y) => x.slug.localeCompare(y.slug)),
    }));
}
