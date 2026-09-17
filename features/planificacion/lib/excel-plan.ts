import { GENERAL_PLAN_APP } from "./shell-plan-apps";
import { normalize_prisma_path } from "./prisma-routes";
import { optional_excel_dates } from "./task-dates";
import type { PlanOrigen } from "./types";

export const EXCEL_PLAN_MAX_ROWS = 500;
export const GENERAL_FALLBACK_MODULO = GENERAL_PLAN_APP.nombre;
export const HANG_GENERAL_APP = "__hang_general_app__";
export const HANG_APP_GENERAL_MODULE = "__hang_app_general_module__";

export type ExcelPlanKind = "create" | "duplicate" | "error";

export type ExcelPlanRow = {
  row: number;
  excel_id: string;
  excel_modulo: string;
  excel_titulo: string;
  modulo: string;
  titulo: string;
  titulo_guardado: string;
  origen: PlanOrigen | null;
  avance: number;
  no_solicitada: boolean;
  completada: boolean;
  entregable_tipo: "vista" | "ninguno";
  entregable_ruta: string | null;
  warning: string | null;
  error: string | null;
  kind: ExcelPlanKind;
  modulo_existe: boolean;
  excel_app: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  app_ids: number[];
  hang_on_general: boolean;
  hang_on_app_module: boolean;
};

export type ExcelModuloRole = {
  as: "modulo" | "tarea";
  parent_modulo: string;
};

export type ExcelExistingTask = {
  modulo: string;
  titulo: string;
};

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function fold_label(value: string): string {
  return fold(value);
}

export function apps_for_excel_row(row: ExcelPlanRow): number[] {
  return row.app_ids ?? [];
}

function compact_label(value: string): string {
  return fold(value).replace(/ /g, "");
}

const APP_ALIASES: Record<string, string> = {
  general: "general",
  transversal: "general",
  global: "general",
  admin: "administracion",
  administracion: "administracion",
  mkt: "marketing",
  rrhh: "recursos-humanos",
  rh: "recursos-humanos",
  sig: "calidad",
  st: "servicios-tecnicos",
  soportetecnico: "servicios-tecnicos",
  soporte: "servicios-tecnicos",
};

export function split_app_hints(hint: string): string[] {
  return hint
    .split(/\s*(?:,|;|\||\/|，|、)\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function app_acronym(nombre: string): string {
  return fold(nombre)
    .split(" ")
    .filter(
      (word) =>
        word && !["de", "del", "la", "el", "los", "las", "y", "e"].includes(word),
    )
    .map((word) => word[0] ?? "")
    .join("");
}

export function match_plan_app(
  hint: string,
  apps: Array<{ id: number; nombre: string; slug: string }>,
): number | null {
  const packed = compact_label(hint);
  if (!packed) return null;
  const alias = compact_label(APP_ALIASES[packed] ?? packed);
  const exact = apps.find((app) => {
    const names = [
      compact_label(app.nombre),
      compact_label(app.slug),
      fold(app.nombre),
      fold(app.slug),
      app_acronym(app.nombre),
    ];
    return names.includes(packed) || names.includes(alias);
  });
  if (exact) return exact.id;
  if (packed.length < 3) return null;
  const hits = apps.filter((app) => {
    const nombre = compact_label(app.nombre);
    const slug = compact_label(app.slug);
    return nombre.includes(packed) || slug.includes(packed);
  });
  return hits.length === 1 ? hits[0].id : null;
}

export function match_plan_apps(
  hint: string,
  apps: Array<{ id: number; nombre: string; slug: string }>,
): number[] {
  const parts = split_app_hints(hint);
  const tokens = parts.length > 0 ? parts : hint.trim() ? [hint.trim()] : [];
  const ids: number[] = [];
  for (const part of tokens) {
    const id = match_plan_app(part, apps);
    if (id && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

export function unmatched_app_hints(
  hint: string,
  apps: Array<{ id: number; nombre: string; slug: string }>,
): string[] {
  return split_app_hints(hint).filter((part) => !match_plan_app(part, apps));
}

export function role_key(app_id: number, label: string): string {
  return `${app_id}::${fold(label)}`;
}

export function strip_excel_id_prefix(titulo: string): string {
  return titulo.replace(/^\[[^\]]+\]\s*/, "").trim();
}

export function task_key(modulo: string, titulo: string): string {
  return `${fold(modulo)}||${fold(strip_excel_id_prefix(titulo))}`;
}

export function compose_titulo(excel_id: string, titulo: string): string {
  const clean = strip_excel_id_prefix(titulo);
  const id = excel_id.trim();
  if (!id) return clean.slice(0, 240);
  const prefixed = `[${id}] ${clean}`;
  return prefixed.slice(0, 240);
}

function cell_text(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "boolean") return value ? "1" : "0";
  if (typeof value === "object" && "text" in (value as object)) {
    return String((value as { text: unknown }).text ?? "").trim();
  }
  if (typeof value === "object" && "result" in (value as object)) {
    return cell_text((value as { result: unknown }).result);
  }
  return String(value).trim();
}

function cell_date(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  if (typeof value === "number" && Number.isFinite(value) && value > 20000) {
    const utc = Date.UTC(1899, 11, 30) + value * 86400000;
    return cell_date(new Date(utc));
  }
  const text = cell_text(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!match) return null;
  return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
}

function map_header(raw: string): string | null {
  const key = fold(raw);
  if (key === "id") return "id";
  if (key === "modulo") return "modulo";
  if (key.includes("tarea") || key.includes("feature")) return "tarea";
  if (
    key.includes("origen") ||
    key.includes("contexto") ||
    key.includes("categoria")
  ) {
    return "origen";
  }
  if (key === "estado") return "estado";
  if (key.includes("entregable")) return "entregable";
  if (key === "app" || key === "apps" || key.includes("aplicacion")) {
    return "app";
  }
  if (
    key.includes("fecha inicio") ||
    key === "inicio" ||
    key === "desde" ||
    key === "start"
  ) {
    return "fecha_inicio";
  }
  if (
    key.includes("fecha fin") ||
    key === "fin" ||
    key === "hasta" ||
    key === "end"
  ) {
    return "fecha_fin";
  }
  if (key === "fecha" || key.includes("fecha")) return "fecha";
  return null;
}

export function map_origen(raw: string): PlanOrigen | null {
  const key = fold(raw);
  if (!key) return "PLAN";
  if (key === "plan") return "PLAN";
  if (key === "adicional" || key.includes("adicional")) return "ADICIONAL";
  if (key === "ticket" || key.includes("ticket")) return "TICKET";
  if (key === "gerencia") return "GERENCIA";
  if (key === "usuario") return "USUARIO";
  if (
    key === "req" ||
    key === "req flujo" ||
    key === "requerimiento" ||
    key.includes("requerimiento") ||
    key.startsWith("req ")
  ) {
    return "REQUERIMIENTO";
  }
  return null;
}

export function map_estado(raw: string): {
  avance: number;
  no_solicitada: boolean;
  completada: boolean;
  warning: string | null;
  error: string | null;
} {
  const key = fold(raw);
  if (key === "no solicitado") {
    return {
      avance: 0,
      no_solicitada: true,
      completada: false,
      warning: null,
      error: null,
    };
  }
  if (!key) {
    return {
      avance: 0,
      no_solicitada: false,
      completada: false,
      warning: null,
      error: null,
    };
  }
  const cleaned = raw.replace("%", "").replace(",", ".").trim();
  const num = Number(cleaned);
  if (!Number.isFinite(num) || num < 0) {
    return {
      avance: 0,
      no_solicitada: false,
      completada: false,
      warning: `Estado no reconocido (${raw}); se carga como 0%`,
      error: null,
    };
  }
  const avance = Math.min(
    100,
    Math.max(0, Math.round(num <= 1 ? num * 100 : num)),
  );
  return {
    avance,
    no_solicitada: false,
    completada: avance >= 100,
    warning: null,
    error: null,
  };
}

function map_entregable(raw: string): {
  tipo: "vista" | "ninguno";
  ruta: string | null;
} {
  const trimmed = raw.trim();
  if (!trimmed) return { tipo: "ninguno", ruta: null };
  if (trimmed.startsWith("/") || trimmed.includes("://")) {
    const ruta = normalize_prisma_path(trimmed);
    return { tipo: "vista", ruta: ruta || null };
  }
  return { tipo: "ninguno", ruta: null };
}

export function classify_excel_rows(matrix: unknown[][]): ExcelPlanRow[] {
  if (matrix.length === 0) return [];
  const header = matrix[0].map((cell) => map_header(cell_text(cell)));
  const idx = {
    id: header.indexOf("id"),
    modulo: header.indexOf("modulo"),
    tarea: header.indexOf("tarea"),
    origen: header.indexOf("origen"),
    estado: header.indexOf("estado"),
    entregable: header.indexOf("entregable"),
    app: header.indexOf("app"),
    fecha_inicio: header.indexOf("fecha_inicio"),
    fecha_fin: header.indexOf("fecha_fin"),
    fecha: header.indexOf("fecha"),
  };
  if (idx.tarea < 0) {
    return [
      {
        row: 1,
        excel_id: "",
        excel_modulo: "",
        excel_titulo: "",
        modulo: "",
        titulo: "",
        titulo_guardado: "",
        origen: null,
        avance: 0,
        no_solicitada: false,
        completada: false,
        entregable_tipo: "ninguno",
        entregable_ruta: null,
        warning: null,
        error:
          "Falta la columna Tarea / Feature. El módulo es opcional: si no viene, se usa la APP.",
        kind: "error",
        modulo_existe: false,
        excel_app: "",
        fecha_inicio: null,
        fecha_fin: null,
        app_ids: [],
        hang_on_general: false,
        hang_on_app_module: false,
      },
    ];
  }

  const out: ExcelPlanRow[] = [];

  const data = matrix.slice(1, EXCEL_PLAN_MAX_ROWS + 1);
  data.forEach((line, offset) => {
    const row_num = offset + 2;
    const excel_id = idx.id >= 0 ? cell_text(line[idx.id]) : "";
    const excel_app = idx.app >= 0 ? cell_text(line[idx.app]) : "";
    const modulo = (
      idx.modulo >= 0 ? cell_text(line[idx.modulo]) : excel_app
    ).slice(0, 160) || excel_app.slice(0, 160);
    const titulo = cell_text(line[idx.tarea]);
    const origen_raw = idx.origen >= 0 ? cell_text(line[idx.origen]) : "";
    const estado_raw = idx.estado >= 0 ? cell_text(line[idx.estado]) : "";
    const entregable_raw =
      idx.entregable >= 0 ? cell_text(line[idx.entregable]) : "";
    const single = idx.fecha >= 0 ? cell_date(line[idx.fecha]) : null;
    const fecha_inicio =
      (idx.fecha_inicio >= 0 ? cell_date(line[idx.fecha_inicio]) : null) ??
      single;
    const fecha_fin =
      (idx.fecha_fin >= 0 ? cell_date(line[idx.fecha_fin]) : null) ??
      fecha_inicio ??
      single;

    if (!modulo && !titulo && !excel_id && !excel_app) return;

    const estado = map_estado(estado_raw);
    const origen = origen_raw ? map_origen(origen_raw) : "PLAN";
    const entregable = map_entregable(entregable_raw);
    const titulo_guardado = compose_titulo(excel_id, titulo);

    let error: string | null = estado.error;
    if (!modulo) error = error ?? "Falta el módulo o la APP";
    if (!titulo) error = error ?? "Falta la tarea / feature";
    if (origen_raw && !origen) {
      error = error ?? `Origen no reconocido: ${origen_raw}`;
    }

    out.push({
      row: row_num,
      excel_id,
      excel_modulo: modulo,
      excel_titulo: titulo,
      modulo,
      titulo,
      titulo_guardado,
      origen: origen_raw && !origen ? null : origen,
      avance: estado.avance,
      no_solicitada: estado.no_solicitada,
      completada: estado.completada,
      entregable_tipo: entregable.tipo,
      entregable_ruta: entregable.ruta,
      warning: estado.warning,
      error,
      kind: error ? "error" : "create",
      modulo_existe: false,
      excel_app,
      fecha_inicio,
      fecha_fin,
      app_ids: [],
      hang_on_general: false,
      hang_on_app_module: false,
    });
  });

  return out;
}

export function unique_excel_modulos(
  rows: ExcelPlanRow[],
): Array<{ label: string; count: number }> {
  const map = new Map<string, { label: string; count: number }>();
  for (const row of rows) {
    if (row.kind === "error" && !row.excel_modulo) continue;
    const label = row.excel_modulo;
    if (!label) continue;
    const key = fold(label);
    const current = map.get(key);
    if (current) current.count += 1;
    else map.set(key, { label, count: 1 });
  }
  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label, "es"));
}

export function unique_excel_app_groups(
  rows: ExcelPlanRow[],
): Array<{ label: string; items: ExcelPlanRow[] }> {
  const map = new Map<string, { label: string; items: ExcelPlanRow[] }>();
  const order: string[] = [];
  for (const row of rows) {
    const label = row.excel_app.trim() || "Sin APP";
    const key = fold(label) || "sin-app";
    const current = map.get(key);
    if (current) current.items.push(row);
    else {
      map.set(key, { label, items: [row] });
      order.push(key);
    }
  }
  return order.map((key) => map.get(key)!);
}

function titulo_as_task(row: ExcelPlanRow): string {
  const short_name = row.excel_modulo;
  const feature = strip_excel_id_prefix(row.excel_titulo);
  const body =
    feature && fold(feature) !== fold(short_name)
      ? `${short_name} — ${feature}`
      : short_name;
  return compose_titulo(row.excel_id, body);
}

export function apply_excel_roles(
  rows: ExcelPlanRow[],
  roles: Record<string, ExcelModuloRole>,
  existing: ExcelExistingTask[],
  known_modulos: string[] = [],
  app_id = 0,
): ExcelPlanRow[] {
  const existing_modulos = new Set(
    [...existing.map((item) => item.modulo), ...known_modulos].map((name) =>
      fold(name),
    ),
  );
  const known = new Set(
    existing.map((item) => task_key(item.modulo, item.titulo)),
  );
  const seen = new Set<string>();

  return rows.map((row) => {
    if (row.kind === "error" && row.error?.startsWith("Falta")) {
      return row;
    }
    const role =
      (app_id > 0 ? roles[role_key(app_id, row.excel_modulo)] : undefined) ??
      roles[fold(row.excel_modulo)] ?? {
        as: "modulo" as const,
        parent_modulo: "",
      };
    let modulo = row.excel_modulo;
    let titulo = row.excel_titulo;
    let titulo_guardado = compose_titulo(row.excel_id, row.excel_titulo);
    let error = row.error;
    const mapping_errors = [
      "Falta el módulo",
      "Falta la tarea / feature",
      "Elige el módulo padre",
      "El módulo padre no puede ser la misma etiqueta",
    ];
    if (error && mapping_errors.includes(error)) error = null;

    let hang_on_general = false;
    let hang_on_app_module = false;
    if (role.as === "tarea") {
      modulo = role.parent_modulo.trim();
      titulo = row.excel_modulo;
      titulo_guardado = titulo_as_task(row);
      if (!modulo || modulo === HANG_APP_GENERAL_MODULE) {
        modulo = GENERAL_FALLBACK_MODULO;
        hang_on_app_module = true;
      } else if (modulo === HANG_GENERAL_APP) {
        modulo = GENERAL_FALLBACK_MODULO;
        hang_on_general = true;
      } else if (fold(modulo) === fold(row.excel_modulo)) {
        error = error ?? "El módulo padre no puede ser la misma etiqueta";
      }
    } else {
      if (!modulo) error = error ?? "Falta el módulo";
      if (!row.excel_titulo) error = error ?? "Falta la tarea / feature";
    }

    const modulo_existe = existing_modulos.has(fold(modulo));
    const key = task_key(modulo, titulo_guardado);
    const in_file = seen.has(key);
    if (modulo && titulo_guardado) seen.add(key);

    let kind: ExcelPlanKind = "create";
    if (error) kind = "error";
    else if (known.has(key) || in_file) kind = "duplicate";

    return {
      ...row,
      modulo,
      titulo,
      titulo_guardado,
      error,
      kind,
      modulo_existe,
      hang_on_general,
      hang_on_app_module,
    };
  });
}

export function summarize_excel_rows(rows: ExcelPlanRow[]) {
  const create = rows.filter((row) => row.kind === "create");
  const duplicate = rows.filter((row) => row.kind === "duplicate");
  const error = rows.filter((row) => row.kind === "error");
  const new_modulos = new Set(
    create.filter((row) => !row.modulo_existe).map((row) => fold(row.modulo)),
  );
  return {
    create: create.length,
    duplicate: duplicate.length,
    error: error.length,
    new_modulos: new_modulos.size,
  };
}

export function excel_commit_rows(
  payload: ExcelPlanRow[],
  _anio: number,
  general_app_id = 0,
) {
  return payload.flatMap((row) => {
    if (!row.origen) return [];
    const dates = optional_excel_dates(row.fecha_inicio, row.fecha_fin);
    const app_ids = row.hang_on_general
      ? general_app_id > 0
        ? [general_app_id]
        : []
      : apps_for_excel_row(row);
    if (app_ids.length === 0) return [];
    return [
      {
        row: row.row,
        modulo: row.modulo,
        titulo_guardado: row.titulo_guardado,
        origen: row.origen,
        avance: row.avance,
        no_solicitada: row.no_solicitada,
        completada: !row.no_solicitada && row.avance >= 100,
        entregable_tipo: row.entregable_tipo,
        entregable_ruta: row.entregable_ruta,
        app_ids,
        hang_on_general: row.hang_on_general,
        hang_on_app_module: row.hang_on_app_module,
        fecha_inicio: dates.fecha_inicio,
        fecha_fin: dates.fecha_fin,
        orden: row.row,
      },
    ];
  });
}
