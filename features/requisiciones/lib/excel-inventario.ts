export const EXCEL_INV_MAX_ROWS = 500;

export type InvObedece = "si" | "no" | "ambos" | null;
export type InvModoCompra = "unidad" | "recurrente";
export type InvEjecutante = "capacitacion" | "tecnico";
export type InvPeriodicidad = "mensual" | "anual" | "semanal" | null;

export type InvExcelCatalogItem = {
  id: number;
  nombre_item: string;
  id_unidad: number | null;
  unidad_label: string | null;
  esta_activo: boolean;
  unidades_por_empaque?: number | null;
  id_unidad_contenido?: number | null;
};

export type InvExcelRow = {
  row: number;
  concepto: string;
  suscripcion_raw: string;
  periodicidad_raw: string;
  presupuesto_raw: string;
  obedece_raw: string;
  modo_compra: InvModoCompra;
  periodicidad: InvPeriodicidad;
  obedece: InvObedece;
  /** Cap y/o ST; vacío = hereda defaults del lote. */
  ejecutantes: InvEjecutante[];
  id_departamentos: number[];
  id_unidad: number | null;
  id_item_match: number | null;
  match_nombre: string | null;
  /** Si true, commit crea ítem nuevo aunque haya match. */
  force_create: boolean;
  unidades_por_empaque: number | null;
  warning: string | null;
  error: string | null;
};

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function fold_inv_label(value: string): string {
  return fold(value);
}

function cell_text(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if ("result" in obj) return cell_text(obj.result);
    if ("text" in obj) return cell_text(obj.text);
    if (Array.isArray(obj.richText)) {
      return obj.richText
        .map((part) =>
          part && typeof part === "object" && "text" in part
            ? String((part as { text: unknown }).text ?? "")
            : "",
        )
        .join("")
        .trim();
    }
  }
  return String(value).trim();
}

function map_header(raw: string): string {
  const key = fold(raw);
  if (key === "items" || key === "item" || key === "n") return "items";
  if (key === "concepto" || key === "nombre" || key === "articulo") {
    return "concepto";
  }
  if (key.includes("suscrip")) return "suscripciones";
  if (key.includes("period")) return "periodicidad";
  if (key.includes("presupuesto")) return "presupuesto";
  if (key.includes("obedece") || key.includes("servicio")) return "obedece";
  return key;
}

function map_si_no(raw: string): boolean | null {
  const key = fold(raw);
  if (!key) return null;
  if (key === "si" || key === "s" || key === "yes" || key === "true") return true;
  if (key === "no" || key === "n" || key === "false") return false;
  return null;
}

function map_obedece(raw: string): InvObedece {
  const key = fold(raw);
  if (!key) return null;
  if (key === "si" || key === "s" || key === "yes") return "si";
  if (key === "no" || key === "n") return "no";
  if (key === "ambos" || key === "ambas" || key === "both") return "ambos";
  return null;
}

function map_periodicidad(raw: string): InvPeriodicidad {
  const key = fold(raw);
  if (!key || key === "n a" || key === "na" || key === "no aplica") return null;
  if (key.includes("mensual") || key === "mes") return "mensual";
  if (key.includes("anual") || key === "ano" || key === "year") return "anual";
  if (key.includes("semanal") || key === "semana") return "semanal";
  if (key.includes("preguntar")) return null;
  return null;
}

export function classify_inv_excel_rows(matrix: unknown[][]): InvExcelRow[] {
  if (matrix.length === 0) {
    return [
      {
        row: 1,
        concepto: "",
        suscripcion_raw: "",
        periodicidad_raw: "",
        presupuesto_raw: "",
        obedece_raw: "",
        modo_compra: "unidad",
        periodicidad: null,
        obedece: null,
        ejecutantes: [],
        id_departamentos: [],
        id_unidad: null,
        id_item_match: null,
        match_nombre: null,
        force_create: false,
        unidades_por_empaque: null,
        warning: null,
        error: "El Excel está vacío.",
      },
    ];
  }

  let header_idx = 0;
  for (let i = 0; i < Math.min(matrix.length, 12); i += 1) {
    const mapped = (matrix[i] ?? []).map((cell) => map_header(cell_text(cell)));
    if (mapped.includes("concepto")) {
      header_idx = i;
      break;
    }
  }

  const header = (matrix[header_idx] ?? []).map((cell) =>
    map_header(cell_text(cell)),
  );
  const idx = {
    concepto: header.indexOf("concepto"),
    suscripciones: header.indexOf("suscripciones"),
    periodicidad: header.indexOf("periodicidad"),
    presupuesto: header.indexOf("presupuesto"),
    obedece: header.indexOf("obedece"),
  };

  if (idx.concepto < 0) {
    return [
      {
        row: header_idx + 1,
        concepto: "",
        suscripcion_raw: "",
        periodicidad_raw: "",
        presupuesto_raw: "",
        obedece_raw: "",
        modo_compra: "unidad",
        periodicidad: null,
        obedece: null,
        ejecutantes: [],
        id_departamentos: [],
        id_unidad: null,
        id_item_match: null,
        match_nombre: null,
        force_create: false,
        unidades_por_empaque: null,
        warning: null,
        error: "Falta la columna CONCEPTO.",
      },
    ];
  }

  const out: InvExcelRow[] = [];
  const data = matrix.slice(header_idx + 1, header_idx + 1 + EXCEL_INV_MAX_ROWS);
  data.forEach((line, offset) => {
    const row_num = header_idx + offset + 2;
    const concepto = cell_text(line[idx.concepto]);
    const suscripcion_raw =
      idx.suscripciones >= 0 ? cell_text(line[idx.suscripciones]) : "";
    const periodicidad_raw =
      idx.periodicidad >= 0 ? cell_text(line[idx.periodicidad]) : "";
    const presupuesto_raw =
      idx.presupuesto >= 0 ? cell_text(line[idx.presupuesto]) : "";
    const obedece_raw = idx.obedece >= 0 ? cell_text(line[idx.obedece]) : "";

    if (
      !concepto &&
      !suscripcion_raw &&
      !periodicidad_raw &&
      !presupuesto_raw &&
      !obedece_raw
    ) {
      return;
    }

    const sus = map_si_no(suscripcion_raw);
    const modo_compra: InvModoCompra =
      sus === true ? "recurrente" : "unidad";
    const periodicidad = map_periodicidad(periodicidad_raw);
    const obedece = map_obedece(obedece_raw);

    let error: string | null = null;
    let warning: string | null = null;
    if (!concepto) error = "Falta el concepto.";
    if (modo_compra === "recurrente" && !periodicidad) {
      error =
        error ??
        "Suscripción SI requiere periodicidad (mensual, anual o semanal).";
    }
    if (obedece_raw && obedece == null) {
      error =
        error ??
        `OBEDECE A UN SERVICIO no reconocido: ${obedece_raw}`;
    }
    if (!obedece_raw) {
      warning = "Sin OBEDECE A UN SERVICIO: se pedirá en clasificar.";
    }
    if (suscripcion_raw && sus == null) {
      warning = [warning, `Suscripción no clara: ${suscripcion_raw}`]
        .filter(Boolean)
        .join(" · ");
    }

    out.push({
      row: row_num,
      concepto,
      suscripcion_raw,
      periodicidad_raw,
      presupuesto_raw,
      obedece_raw,
      modo_compra,
      periodicidad: modo_compra === "recurrente" ? periodicidad : null,
      obedece,
      ejecutantes: [],
      id_departamentos: [],
      id_unidad: null,
      id_item_match: null,
      match_nombre: null,
      force_create: false,
      unidades_por_empaque: null,
      warning,
      error,
    });
  });

  return out;
}

export function match_inv_catalog(
  rows: InvExcelRow[],
  catalog: InvExcelCatalogItem[],
): InvExcelRow[] {
  const by_fold = new Map<string, InvExcelCatalogItem[]>();
  for (const item of catalog) {
    const key = fold(item.nombre_item);
    if (!key) continue;
    const list = by_fold.get(key) ?? [];
    list.push(item);
    by_fold.set(key, list);
  }

  return rows.map((row) => {
    if (row.error || !row.concepto || row.force_create) return row;
    const hits = [...(by_fold.get(fold(row.concepto)) ?? [])].sort(
      (a, b) => Number(b.esta_activo) - Number(a.esta_activo) || a.id - b.id,
    );
    if (hits.length === 1) {
      const hit = hits[0];
      return {
        ...row,
        id_item_match: hit.id,
        match_nombre: hit.nombre_item,
        id_unidad: row.id_unidad ?? hit.id_unidad,
        unidades_por_empaque:
          row.unidades_por_empaque ?? hit.unidades_por_empaque ?? null,
        warning: hit.esta_activo
          ? row.warning
          : [row.warning, "Match inactivo: se reactivará al vincular"]
              .filter(Boolean)
              .join(" · "),
      };
    }
    if (hits.length > 1) {
      const active = hits.filter((item) => item.esta_activo);
      const preferred = active[0] ?? hits[0];
      return {
        ...row,
        id_item_match: null,
        match_nombre: preferred.nombre_item,
        warning: [
          row.warning,
          `Varios matches en catálogo (${hits.length}): decidir en Duplicados`,
        ]
          .filter(Boolean)
          .join(" · "),
      };
    }
    return row;
  });
}

export function resolve_ambitos_pedido(params: {
  obedece: InvObedece;
  ejecutantes: InvEjecutante[];
}): { ambitos: string[]; ambito_catalogo: string; error: string | null } {
  const ejec = [...new Set(params.ejecutantes)];
  if (params.obedece === "no") {
    return {
      ambitos: ["departamentos"],
      ambito_catalogo: "departamentos",
      error: null,
    };
  }
  if (params.obedece === "si") {
    if (ejec.length === 0) {
      return {
        ambitos: [],
        ambito_catalogo: "capacitacion",
        error: "Marca Capacitación y/o Servicios técnicos (departamento ejecutante).",
      };
    }
    return {
      ambitos: ejec,
      ambito_catalogo: ejec[0],
      error: null,
    };
  }
  if (params.obedece === "ambos") {
    if (ejec.length === 0) {
      return {
        ambitos: [],
        ambito_catalogo: "departamentos",
        error: "AMBOS requiere departamento ejecutante (Cap y/o ST).",
      };
    }
    return {
      ambitos: ["departamentos", ...ejec],
      ambito_catalogo: "departamentos",
      error: null,
    };
  }
  return {
    ambitos: [],
    ambito_catalogo: "departamentos",
    error: "Complete OBEDECE A UN SERVICIO.",
  };
}

export function row_has_hueco(row: InvExcelRow): boolean {
  if (!row.obedece) return true;
  if (row.modo_compra === "recurrente" && !row.periodicidad) return true;
  if (row.warning?.includes("Varios matches")) return true;
  if (row.warning?.includes("Suscripción no clara")) return true;
  return false;
}

export function row_is_departamental(row: InvExcelRow): boolean {
  return row.obedece === "no" || row.obedece === "ambos";
}

export function row_needs_ejecutante(row: InvExcelRow): boolean {
  return row.obedece === "si" || row.obedece === "ambos";
}

/**
 * Unidades de conf_clasificadores (id_unidad del catálogo).
 * Inventario casi siempre es «Unidad»; Hora/Sesión/Día/etc. son de servicios/costos.
 */
export type InvUnidadKind = "stock" | "servicio";

export function kind_unidad_inventario(label: string): InvUnidadKind {
  const key = fold(label);
  if (
    key === "unidad" ||
    key === "und" ||
    key === "u" ||
    key === "botella" ||
    key === "caja" ||
    key === "bulto" ||
    key === "paquete" ||
    key === "pack"
  ) {
    return "stock";
  }
  return "servicio";
}

/** Empaque (caja/bulto) vs unidad fina de contenido. */
export function is_unidad_empaque(label: string | null | undefined): boolean {
  const key = fold(label ?? "");
  return (
    key === "caja" ||
    key === "bulto" ||
    key === "paquete" ||
    key === "pack" ||
    key.includes("caja") ||
    key.includes("bulto") ||
    key.includes("paquete")
  );
}

export function pick_unidad_default_id(
  unidades: Array<{ id: number; label: string }>,
): number | null {
  const stock = unidades.find(
    (unit) => kind_unidad_inventario(unit.label) === "stock",
  );
  return stock?.id ?? unidades[0]?.id ?? null;
}

/** Recalcula error/warning tras editar campos en la UI. */
export function revalidate_inv_row(row: InvExcelRow): InvExcelRow {
  let error: string | null = null;
  let warning: string | null = null;
  if (!row.concepto.trim()) error = "Falta el concepto.";
  if (row.modo_compra === "recurrente" && !row.periodicidad) {
    error =
      error ??
      "Suscripción SI requiere periodicidad (mensual, anual o semanal).";
  }
  if (!row.obedece) {
    warning = "Sin OBEDECE A UN SERVICIO: se pedirá en clasificar.";
  }
  if (row.warning?.includes("Varios matches")) {
    warning = [warning, "Varios matches en catálogo"]
      .filter(Boolean)
      .join(" · ");
  }
  if (row.warning?.includes("Suscripción no clara")) {
    warning = [warning, "Suscripción no clara"].filter(Boolean).join(" · ");
  }
  return { ...row, error, warning };
}

export function summarize_inv_excel_rows(rows: InvExcelRow[]) {
  return {
    total: rows.length,
    ok: rows.filter((row) => !row.error).length,
    errors: rows.filter((row) => row.error).length,
    recurrentes: rows.filter((row) => row.modo_compra === "recurrente").length,
    matches: rows.filter((row) => row.id_item_match != null).length,
  };
}
