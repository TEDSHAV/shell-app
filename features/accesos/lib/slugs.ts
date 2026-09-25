export const ACTION_CATALOG = [
  {
    slug: "access",
    nombre: "Acceder",
    descripcion: "Entrar al módulo o pantalla y ver que existe.",
  },
  {
    slug: "read",
    nombre: "Leer",
    descripcion: "Consultar registros sin modificarlos.",
  },
  {
    slug: "write",
    nombre: "Escribir",
    descripcion: "Crear o cambiar datos (atajo amplio).",
  },
  {
    slug: "create",
    nombre: "Crear",
    descripcion: "Dar de alta registros nuevos.",
  },
  {
    slug: "edit",
    nombre: "Editar",
    descripcion: "Modificar registros que ya existen.",
  },
  {
    slug: "approve",
    nombre: "Aprobar",
    descripcion: "Aprobar o rechazar una solicitud o documento.",
  },
  {
    slug: "manage",
    nombre: "Gestionar",
    descripcion: "Administrar el recurso o la configuración del módulo.",
  },
  {
    slug: "export",
    nombre: "Exportar",
    descripcion: "Descargar o extraer información.",
  },
  {
    slug: "config",
    nombre: "Configurar",
    descripcion: "Cambiar ajustes del módulo, no los datos de negocio.",
  },
  {
    slug: "executive",
    nombre: "Ejecutivo",
    descripcion: "Operar el flujo de campo o de ejecución (p. ej. OSI).",
  },
  {
    slug: "access-all",
    nombre: "Acceso completo",
    descripcion: "Acceso total al módulo (atajo de catálogo).",
  },
] as const;

export const PERMISSION_ACTIONS = ACTION_CATALOG.map((a) => a.slug);

export type PermissionAction = (typeof ACTION_CATALOG)[number]["slug"];

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
  st: "Servicios Técnicos",
  inventario: "Inventario",
  shell: "Shell",
  requisiciones: "Requisiciones",
  "planificacion-ted": "Planificación TED",
  "objetivos-ted": "Objetivos TED",
  "gestion-usuarios-prisma": "Usuarios Prisma",
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
  st: "st",
  inventario: "inventario",
  shell: "shell",
  requisiciones: "sadministracion",
  "planificacion-ted": "ted",
  "objetivos-ted": "ted",
  "gestion-usuarios-prisma": "ted",
};

/** Modules that appear in every app's role editor (same global slugs). */
export const CROSS_APP_MODULES = new Set(["requisiciones"]);

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

export function permission_resource(slug: string): string | null {
  const parts = slug.split(":").filter(Boolean);
  if (parts.length < 3) return null;
  return parts[1] ?? null;
}

export type ResourceUsage = {
  slug: string;
  app_names: string[];
  role_labels: string[];
  permissions: Array<{ slug: string; descripcion: string | null }>;
};

export function collect_resource_usages(args: {
  permissions: Array<{ slug: string; descripcion: string | null }>;
  roles: Array<{
    nombre: string;
    permission_slugs: string[];
    app_id: number;
  }>;
  apps: Array<{ id: number; slug: string; nombre: string }>;
}): ResourceUsage[] {
  const by_resource = new Map<string, ResourceUsage>();

  function bucket(slug: string): ResourceUsage {
    const existing = by_resource.get(slug);
    if (existing) return existing;
    const created: ResourceUsage = {
      slug,
      app_names: [],
      role_labels: [],
      permissions: [],
    };
    by_resource.set(slug, created);
    return created;
  }

  function add_unique(list: string[], value: string) {
    if (value && !list.includes(value)) list.push(value);
  }

  for (const perm of args.permissions) {
    const resource = permission_resource(perm.slug);
    if (!resource) continue;
    const row = bucket(resource);
    row.permissions.push({ slug: perm.slug, descripcion: perm.descripcion });
    const home = permission_home_app_slug(perm.slug);
    const home_app = home
      ? args.apps.find((a) => a.slug === home)
      : undefined;
    if (home_app) add_unique(row.app_names, home_app.nombre);
  }

  for (const role of args.roles) {
    const app = args.apps.find((a) => a.id === role.app_id);
    const label = app ? `${role.nombre} · ${app.nombre}` : role.nombre;
    for (const slug of role.permission_slugs) {
      const resource = permission_resource(slug);
      if (!resource) continue;
      const row = bucket(resource);
      add_unique(row.role_labels, label);
      if (app) add_unique(row.app_names, app.nombre);
    }
  }

  return [...by_resource.values()].sort((a, b) => a.slug.localeCompare(b.slug));
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

export function permission_related_to_app(args: {
  slug: string;
  id: number;
  app: { id: number; slug: string };
  roles: Array<{ app_id: number; permission_slugs: string[] }>;
  modules: Array<{ slug: string; app_id: number | null }>;
  keep_ids: number[];
}): boolean {
  if (args.keep_ids.includes(args.id)) return true;
  const module = permission_module(args.slug);
  if (CROSS_APP_MODULES.has(module)) return true;
  if (module === args.app.slug) return true;
  if (MODULE_HOME_APP[module] === args.app.slug) return true;
  const row = args.modules.find((m) => m.slug === module);
  if (row && row.app_id === args.app.id) return true;
  return args.roles.some(
    (role) =>
      role.app_id === args.app.id && role.permission_slugs.includes(args.slug),
  );
}
