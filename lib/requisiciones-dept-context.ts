import {
  isAdministracionDept,
  isCapacitacionDept,
  isServiciosTecnicosDept,
  normalizeDeptKey,
} from "@/lib/requisiciones-gerencia";
import {
  ADMIN_APP_SLUG,
  ADMIN_OPERATIVE_ROLE_SLUGS,
  PRODUCT_COORD_ROLE_SLUGS,
  PRODUCT_LIDER_ROLE_SLUGS,
  REQ_GESTION_APPROVE_COORD,
  REQ_GESTION_APPROVE_LIDER,
  REQ_GESTION_PROCESS,
} from "@/lib/requisiciones-slugs";

export type DeptCatalogRow = { nombre: string; gerencia: string | null };

export type DeptKey =
  | "administracion"
  | "recursos_humanos"
  | "servicios_tecnicos"
  | "capacitacion"
  | "calidad"
  | "negocios"
  | "marketing"
  | "ted";

const APP_TO_DEPT_KEY: Record<string, DeptKey> = {
  sadministracion: "administracion",
  administracion: "administracion",
  srh: "recursos_humanos",
  "recursos-humanos": "recursos_humanos",
  st: "servicios_tecnicos",
  "servicios-tecnicos": "servicios_tecnicos",
  scapacitacion: "capacitacion",
  capacitacion: "capacitacion",
  scalidad: "calidad",
  calidad: "calidad",
  sgestion: "negocios",
  negocios: "negocios",
};

const ADMIN_SIBLING_KEYS: DeptKey[] = ["administracion", "recursos_humanos"];

export function isRecursosHumanosDept(deptName: string | null | undefined): boolean {
  const d = normalizeDeptKey(deptName);
  return d.includes("recurso") && d.includes("humano");
}

export function isNegociosDept(deptName: string | null | undefined): boolean {
  return normalizeDeptKey(deptName).includes("negocios");
}

export function isCalidadDept(deptName: string | null | undefined): boolean {
  return normalizeDeptKey(deptName).includes("calidad");
}

export function isMarketingDept(deptName: string | null | undefined): boolean {
  return normalizeDeptKey(deptName).includes("marketing");
}

export function isTedDept(deptName: string | null | undefined): boolean {
  return normalizeDeptKey(deptName) === "ted";
}

export function dept_matches_key(
  deptName: string | null | undefined,
  key: DeptKey,
): boolean {
  switch (key) {
    case "administracion":
      return isAdministracionDept(deptName);
    case "recursos_humanos":
      return isRecursosHumanosDept(deptName);
    case "servicios_tecnicos":
      return isServiciosTecnicosDept(deptName);
    case "capacitacion":
      return isCapacitacionDept(deptName);
    case "calidad":
      return isCalidadDept(deptName);
    case "negocios":
      return isNegociosDept(deptName);
    case "marketing":
      return isMarketingDept(deptName);
    case "ted":
      return isTedDept(deptName);
    default:
      return false;
  }
}

export function dept_key_for_name(deptName: string | null | undefined): DeptKey | null {
  const keys: DeptKey[] = [
    "administracion",
    "recursos_humanos",
    "servicios_tecnicos",
    "capacitacion",
    "calidad",
    "negocios",
    "marketing",
    "ted",
  ];
  return keys.find((key) => dept_matches_key(deptName, key)) ?? null;
}

export function dept_key_for_app(app_slug_or_id: string | null | undefined): DeptKey | null {
  if (!app_slug_or_id) return null;
  return APP_TO_DEPT_KEY[app_slug_or_id.trim().toLowerCase()] ?? null;
}

export function catalog_names_for_keys(
  catalog: DeptCatalogRow[],
  keys: Iterable<DeptKey>,
): string[] {
  const key_set = new Set(keys);
  const names: string[] = [];
  for (const row of catalog) {
    if (!row.nombre) continue;
    for (const key of key_set) {
      if (dept_matches_key(row.nombre, key)) {
        names.push(row.nombre);
        break;
      }
    }
  }
  return names;
}

export function gerencia_for_dept(
  catalog: DeptCatalogRow[],
  deptName: string,
): string | null {
  const target = normalizeDeptKey(deptName);
  const hit = catalog.find((row) => normalizeDeptKey(row.nombre) === target);
  return hit?.gerencia || null;
}

function add_home_key(keys: Set<DeptKey>, home_dept: string | null | undefined) {
  const home_key = dept_key_for_name(home_dept);
  if (home_key) keys.add(home_key);
}

/** Gestor, coordinador, líder o admin-ted de Administración (no solicitante). */
export function is_admin_operative(roles_by_app: Record<string, string>): boolean {
  const role = roles_by_app[ADMIN_APP_SLUG] || roles_by_app.administracion;
  return Boolean(role && ADMIN_OPERATIVE_ROLE_SLUGS.has(role));
}

/** Deptos desde los que la persona puede pedir. */
export function request_dept_keys(args: {
  home_dept: string | null | undefined;
  roles_by_app: Record<string, string>;
}): Set<DeptKey> {
  const keys = new Set<DeptKey>();
  add_home_key(keys, args.home_dept);
  const admin_member = is_admin_operative(args.roles_by_app);
  for (const app_slug of Object.keys(args.roles_by_app)) {
    if (app_slug === ADMIN_APP_SLUG || app_slug === "administracion") {
      continue;
    }
    const mapped = dept_key_for_app(app_slug);
    if (mapped) keys.add(mapped);
  }
  if (admin_member) {
    for (const key of ADMIN_SIBLING_KEYS) keys.add(key);
  }
  return keys;
}

function product_coord_role(role_slug: string | undefined): boolean {
  return Boolean(role_slug && PRODUCT_COORD_ROLE_SLUGS.has(role_slug));
}

function product_lider_role(role_slug: string | undefined): boolean {
  return Boolean(role_slug && PRODUCT_LIDER_ROLE_SLUGS.has(role_slug));
}

/** Coordinador del depto Administración (no el rol transversal de sello). */
function admin_dept_coordinador_role(role_slug: string | undefined): boolean {
  return role_slug === "coordinador";
}

/** Líder de la gerencia Administración (no el rol transversal de sello). */
function admin_dept_lider_role(role_slug: string | undefined): boolean {
  return role_slug === "lider";
}

/** Admin TED / probador: no figura en el mapa de negocio. */
export function is_requisicion_manual_tester(
  roles_by_app: Record<string, string>,
): boolean {
  const admin_role =
    roles_by_app[ADMIN_APP_SLUG] || roles_by_app.administracion;
  return admin_role === "admin-ted";
}

/** Territorio de 1.er sello. El rol transversal solo autoriza; no cubre Admin. */
export function stamp_coord_dept_keys(roles_by_app: Record<string, string>): Set<DeptKey> {
  const keys = new Set<DeptKey>();
  if (admin_dept_coordinador_role(roles_by_app[ADMIN_APP_SLUG])) {
    for (const key of ADMIN_SIBLING_KEYS) keys.add(key);
  }
  if (product_coord_role(roles_by_app.st)) keys.add("servicios_tecnicos");
  if (product_coord_role(roles_by_app.scapacitacion)) keys.add("capacitacion");
  if (product_coord_role(roles_by_app.scalidad)) keys.add("calidad");
  return keys;
}

/** Territorio de 2.º sello. El rol transversal solo autoriza; no cubre Admin. */
export function stamp_lider_dept_keys(roles_by_app: Record<string, string>): Set<DeptKey> {
  const keys = new Set<DeptKey>();
  if (admin_dept_lider_role(roles_by_app[ADMIN_APP_SLUG])) {
    for (const key of ADMIN_SIBLING_KEYS) keys.add(key);
  }
  if (product_lider_role(roles_by_app.st)) keys.add("servicios_tecnicos");
  if (product_lider_role(roles_by_app.scapacitacion)) keys.add("capacitacion");
  if (product_lider_role(roles_by_app.scalidad)) keys.add("calidad");
  if (
    product_lider_role(roles_by_app.sgestion) ||
    product_lider_role(roles_by_app.negocios)
  ) {
    keys.add("negocios");
    keys.add("marketing");
  }
  return keys;
}

/** Depts covered because the user is `gerencias.lider` of their home gerencia. */
export function organigram_lider_dept_names(
  catalog: DeptCatalogRow[],
  led_gerencias: string[],
): string[] {
  const led = new Set(
    led_gerencias.map((nombre) => normalizeDeptKey(nombre)).filter(Boolean),
  );
  if (led.size === 0) return [];
  const names: string[] = [];
  for (const row of catalog) {
    if (!row.nombre) continue;
    const home = normalizeDeptKey(row.gerencia);
    if (home && led.has(home)) {
      names.push(row.nombre);
    }
  }
  return names;
}

/** Misma regla que getRequisicionAccess: sello = permiso/rol; organigrama = territorio. */
export function resolve_stamp_territory(args: {
  slugs: string[];
  roles_by_app: Record<string, string>;
  catalog: DeptCatalogRow[];
  organigram_coord_depts: string[];
  led_gerencias: string[];
}): {
  can_approve_coord: boolean;
  can_approve_lider: boolean;
  can_process: boolean;
  coord_depts: string[];
  lider_depts: string[];
} {
  const slug_set = new Set(args.slugs);
  const product_coord_keys = stamp_coord_dept_keys(args.roles_by_app);
  const product_lider_keys = stamp_lider_dept_keys(args.roles_by_app);
  const can_approve_coord =
    slug_set.has(REQ_GESTION_APPROVE_COORD) || product_coord_keys.size > 0;
  const can_approve_lider =
    slug_set.has(REQ_GESTION_APPROVE_LIDER) || product_lider_keys.size > 0;
  const can_process = slug_set.has(REQ_GESTION_PROCESS);
  const coord_depts = can_approve_coord
    ? [...new Set([
        ...catalog_names_for_keys(args.catalog, product_coord_keys),
        ...args.organigram_coord_depts,
      ])]
    : [];
  const lider_depts = can_approve_lider
    ? [...new Set([
        ...catalog_names_for_keys(args.catalog, product_lider_keys),
        ...organigram_lider_dept_names(args.catalog, args.led_gerencias),
      ])]
    : [];
  return {
    can_approve_coord,
    can_approve_lider,
    can_process,
    coord_depts,
    lider_depts,
  };
}

export function dept_in_keys(
  deptName: string | null | undefined,
  keys: Iterable<DeptKey>,
): boolean {
  for (const key of keys) {
    if (dept_matches_key(deptName, key)) return true;
  }
  return false;
}

export function user_has_slug(
  slugs: Iterable<string>,
  slug: string,
): boolean {
  for (const item of slugs) {
    if (item === slug) return true;
  }
  return false;
}

export function flatten_permission_slugs(
  perms_by_app: Record<string, string[]>,
): string[] {
  return [...new Set(Object.values(perms_by_app).flat())];
}
