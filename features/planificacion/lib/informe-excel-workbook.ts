import ExcelJS from "exceljs";
import type { FiTedMonthRow } from "./informe-fi-ted";
import { MONTH_LABELS_ES, FI_TED_META } from "./informe-fi-ted";
import { build_cumplimiento_chart_png } from "./informe-chart-png";

export type FiTedUserSeries = {
  label: string;
  rows: FiTedMonthRow[];
};

function short_name(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Usuario";
  if (parts.length === 1) return parts[0].slice(0, 14);
  return `${parts[0]} ${parts[1][0]}.`.slice(0, 16);
}

function style_header(cell: ExcelJS.Cell): void {
  cell.font = { bold: true, size: 10, color: { argb: "FF334155" } };
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF1F5F9" },
  };
  cell.alignment = { vertical: "middle", wrapText: true, horizontal: "center" };
  cell.border = {
    bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
  };
}

function paint_pct(cell: ExcelJS.Cell, value: number | null): void {
  cell.value = value;
  cell.numFmt = "0%";
  cell.alignment = { horizontal: "center", vertical: "middle" };
  if (value == null) return;
  if (value >= FI_TED_META) {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFDCFCE7" },
    };
    cell.font = { color: { argb: "FF166534" }, bold: true };
  } else if (value > 0) {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFEF3C7" },
    };
    cell.font = { color: { argb: "FF92400E" } };
  } else {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF1F5F9" },
    };
  }
}

async function add_chart_image(
  workbook: ExcelJS.Workbook,
  sheet: ExcelJS.Worksheet,
  args: {
    title: string;
    series: Array<{ label: string; color: string; values: Array<number | null> }>;
    tl_row: number;
    tl_col: number;
  },
): Promise<void> {
  const png = await build_cumplimiento_chart_png({
    title: args.title,
    categories: MONTH_LABELS_ES.map((m) => m.slice(0, 3)),
    series: args.series,
  });
  const image_id = workbook.addImage({
    buffer: png as unknown as ExcelJS.Buffer,
    extension: "png",
  });
  sheet.addImage(image_id, {
    tl: { col: args.tl_col, row: args.tl_row },
    ext: { width: 780, height: 300 },
  });
}

function write_fi_header(
  sheet: ExcelJS.Worksheet,
  title: string,
  anio: number,
): void {
  sheet.getCell("A1").value = "INDICADOR DE GESTIÓN:";
  sheet.getCell("A1").font = { bold: true, size: 11 };
  sheet.getCell("C1").value = title;
  sheet.getCell("C1").font = {
    bold: true,
    size: 13,
    color: { argb: "FF5B21B6" },
  };

  sheet.getCell("A3").value = "FÓRMULA:";
  sheet.getCell("A3").font = { bold: true };
  sheet.getCell("C3").value =
    "(OBJETIVOS CUMPLIDOS) / (OBJETIVOS PLANTEADOS) × 100";

  sheet.getCell("A5").value = "AÑO:";
  sheet.getCell("B5").value = anio;
  sheet.getCell("D5").value = "META:";
  sheet.getCell("E5").value = FI_TED_META;
  sheet.getCell("E5").numFmt = "0%";
  sheet.getCell("G5").value = "FRECUENCIA:";
  sheet.getCell("H5").value = "MENSUAL";
}

function write_reporter(
  sheet: ExcelJS.Worksheet,
  row: number,
  reportado_por: string,
  cargo?: string,
): void {
  sheet.getCell(row, 1).value = "REPORTADO POR:";
  sheet.getCell(row, 1).font = { bold: true };
  sheet.getCell(row + 1, 1).value = "NOMBRE Y APELLIDO:";
  sheet.getCell(row + 1, 3).value = reportado_por;
  sheet.getCell(row + 2, 1).value = "CARGO:";
  sheet.getCell(row + 2, 3).value = cargo ?? "ANALISTA TED";
  sheet.getCell(row + 3, 1).value = "ÚLT. FECHA DE ACTUALIZ.:";
  sheet.getCell(row + 3, 3).value = new Date();
  sheet.getCell(row + 3, 3).numFmt = "dd/mm/yyyy";
}

function month_has_data(r: FiTedMonthRow | undefined): boolean {
  if (!r) return false;
  return (
    r.objetivos_planteados > 0 ||
    r.extras_ticket > 0 ||
    r.extras_requerimiento > 0 ||
    (r.cumplimiento != null && r.cumplimiento > 0)
  );
}

/**
 * Tablero scorecard (meses × analistas) + detalle vertical por persona.
 * Más legible que columnas intercaladas.
 */
export async function build_fi_ted_comparativo_workbook(args: {
  anio: number;
  users: FiTedUserSeries[];
  reportado_por: string;
  cargo?: string;
}): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Tablero KPI", {
    views: [{ showGridLines: false }],
  });

  const users = args.users.slice(0, 4);
  const names = users.map((u) => short_name(u.label));
  const colors = ["#7C3AED", "#0EA5E9", "#10B981", "#F59E0B"];

  write_fi_header(
    sheet,
    "ÍNDICE DE CUMPLIMIENTO DE OBJETIVOS TED · TABLERO COMPARATIVO",
    args.anio,
  );

  // —— Scorecard: filas = analistas, columnas = meses ——
  sheet.getCell("A7").value = "1. TABLERO DE CUMPLIMIENTO (% vs meta)";
  sheet.getCell("A7").font = { bold: true, size: 12 };

  const score_header = 8;
  sheet.getCell(score_header, 1).value = "ANALISTA";
  style_header(sheet.getCell(score_header, 1));
  MONTH_LABELS_ES.forEach((mes, idx) => {
    const cell = sheet.getCell(score_header, 2 + idx);
    cell.value = mes.slice(0, 3);
    style_header(cell);
  });
  const prom_col = 14;
  sheet.getCell(score_header, prom_col).value = "PROM.";
  style_header(sheet.getCell(score_header, prom_col));

  users.forEach((user, ui) => {
    const row = score_header + 1 + ui;
    sheet.getCell(row, 1).value = names[ui];
    sheet.getCell(row, 1).font = { bold: true };
    let sum = 0;
    let count = 0;
    user.rows.forEach((r, mi) => {
      paint_pct(sheet.getCell(row, 2 + mi), r.cumplimiento);
      if (r.cumplimiento != null && month_has_data(r)) {
        sum += r.cumplimiento;
        count += 1;
      }
    });
    paint_pct(sheet.getCell(row, prom_col), count ? sum / count : null);
  });

  const meta_row = score_header + 1 + users.length;
  sheet.getCell(meta_row, 1).value = "META";
  sheet.getCell(meta_row, 1).font = { bold: true, color: { argb: "FF64748B" } };
  for (let i = 0; i < 12; i++) {
    const cell = sheet.getCell(meta_row, 2 + i);
    cell.value = FI_TED_META;
    cell.numFmt = "0%";
    cell.font = { color: { argb: "FF64748B" } };
    cell.alignment = { horizontal: "center" };
  }
  sheet.getCell(meta_row, prom_col).value = FI_TED_META;
  sheet.getCell(meta_row, prom_col).numFmt = "0%";

  sheet.getCell(meta_row + 2, 1).value =
    "Verde ≥ meta · Amarillo bajo meta · Gris sin dato / 0%";
  sheet.getCell(meta_row + 2, 1).font = {
    italic: true,
    size: 9,
    color: { argb: "FF94A3B8" },
  };

  await add_chart_image(workbook, sheet, {
    title: "Cumplimiento mensual por analista",
    series: [
      ...users.map((u, i) => ({
        label: names[i],
        color: colors[i % colors.length],
        values: u.rows.map((r) => r.cumplimiento),
      })),
      {
        label: "Meta 90%",
        color: "#94A3B8",
        values: MONTH_LABELS_ES.map(() => FI_TED_META),
      },
    ],
    tl_row: meta_row + 3,
    tl_col: 0,
  });

  // —— Análisis: un bloque por analista (matriz simple) ——
  let cursor = meta_row + 22;
  sheet.getCell(cursor, 1).value = "2. ANÁLISIS Y EVALUACIÓN DE DATOS";
  sheet.getCell(cursor, 1).font = { bold: true, size: 12 };
  cursor += 2;

  for (let ui = 0; ui < users.length; ui++) {
    const user = users[ui];
    sheet.getCell(cursor, 1).value = names[ui];
    sheet.getCell(cursor, 1).font = {
      bold: true,
      size: 11,
      color: { argb: "FF5B21B6" },
    };
    sheet.getCell(cursor, 2).value = user.label;
    sheet.getCell(cursor, 2).font = { color: { argb: "FF64748B" }, size: 9 };
    cursor += 1;

    const headers = [
      "MES",
      "CUMPLIDOS",
      "PLANTEADOS",
      "EXT. TICKET",
      "EXT. REQ.",
      "%",
      "OBSERVACIONES",
    ];
    headers.forEach((h, i) => {
      const cell = sheet.getCell(cursor, i + 1);
      cell.value = h;
      style_header(cell);
    });
    cursor += 1;

    user.rows.forEach((r) => {
      const has = month_has_data(r);
      sheet.getCell(cursor, 1).value = r.mes_label;
      sheet.getCell(cursor, 2).value = has ? r.objetivos_cumplidos : null;
      sheet.getCell(cursor, 3).value = has ? r.objetivos_planteados : null;
      sheet.getCell(cursor, 4).value = has ? r.extras_ticket : null;
      sheet.getCell(cursor, 5).value = has ? r.extras_requerimiento : null;
      paint_pct(sheet.getCell(cursor, 6), r.cumplimiento);
      sheet.getCell(cursor, 7).value = r.observaciones || null;
      sheet.getCell(cursor, 7).alignment = { wrapText: true, vertical: "top" };
      if (r.observaciones) sheet.getRow(cursor).height = 48;
      cursor += 1;
    });
    cursor += 2;
  }

  write_reporter(sheet, cursor, args.reportado_por, args.cargo);

  sheet.getColumn(1).width = 16;
  for (let i = 2; i <= 13; i++) sheet.getColumn(i).width = 8;
  sheet.getColumn(14).width = 9;
  sheet.getColumn(2).width = 12;
  sheet.getColumn(3).width = 12;
  sheet.getColumn(4).width = 11;
  sheet.getColumn(5).width = 10;
  sheet.getColumn(6).width = 8;
  sheet.getColumn(7).width = 48;

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

/** Indicador SIG (departamento) en una hoja + gráfica PNG. */
export async function build_fi_ted_sig_workbook(args: {
  anio: number;
  rows: FiTedMonthRow[];
  reportado_por: string;
  cargo?: string;
}): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("SIG", {
    views: [{ showGridLines: false }],
  });

  write_fi_header(
    sheet,
    "ÍNDICE DE CUMPLIMIENTO DE OBJETIVOS TED · INDICADOR SIG",
    args.anio,
  );

  sheet.getCell("A7").value = "1. RESULTADO MENSUAL";
  sheet.getCell("A7").font = { bold: true, size: 12 };

  MONTH_LABELS_ES.forEach((mes, idx) => {
    sheet.getCell(8, 2 + idx).value = mes.slice(0, 3);
    style_header(sheet.getCell(8, 2 + idx));
    paint_pct(sheet.getCell(9, 2 + idx), args.rows[idx]?.cumplimiento ?? null);
  });
  sheet.getCell(8, 1).value = "%";
  style_header(sheet.getCell(8, 1));
  sheet.getCell(9, 1).value = "SIG";
  sheet.getCell(9, 1).font = { bold: true };

  await add_chart_image(workbook, sheet, {
    title: "Cumplimiento SIG vs meta",
    series: [
      {
        label: "SIG",
        color: "#7C3AED",
        values: args.rows.map((r) => r.cumplimiento),
      },
      {
        label: "Meta 90%",
        color: "#94A3B8",
        values: MONTH_LABELS_ES.map(() => FI_TED_META),
      },
    ],
    tl_row: 11,
    tl_col: 0,
  });

  sheet.getCell("A28").value = "2. ANÁLISIS Y EVALUACIÓN DE DATOS";
  sheet.getCell("A28").font = { bold: true, size: 12 };

  const headers = [
    "MES",
    "OBJETIVOS CUMPLIDOS",
    "OBJETIVOS PLANTEADOS",
    "EXTRAS TICKET",
    "EXTRAS REQUERIMIENTO",
    "META",
    "% CUMPLIMIENTO",
    "OBSERVACIONES",
  ];
  headers.forEach((h, i) => {
    const cell = sheet.getCell(30, i + 1);
    cell.value = h;
    style_header(cell);
  });

  args.rows.forEach((row, idx) => {
    const r = 31 + idx;
    const has = month_has_data(row);
    sheet.getCell(r, 1).value = row.mes_label;
    sheet.getCell(r, 2).value = has ? row.objetivos_cumplidos : null;
    sheet.getCell(r, 3).value = has ? row.objetivos_planteados : null;
    sheet.getCell(r, 4).value = has ? row.extras_ticket : null;
    sheet.getCell(r, 5).value = has ? row.extras_requerimiento : null;
    sheet.getCell(r, 6).value = row.meta;
    sheet.getCell(r, 6).numFmt = "0%";
    paint_pct(sheet.getCell(r, 7), row.cumplimiento);
    sheet.getCell(r, 8).value = row.observaciones || null;
    sheet.getCell(r, 8).alignment = { wrapText: true, vertical: "top" };
  });

  write_reporter(sheet, 45, args.reportado_por, args.cargo);

  sheet.getColumn(1).width = 14;
  sheet.getColumn(2).width = 14;
  sheet.getColumn(3).width = 14;
  sheet.getColumn(4).width = 12;
  sheet.getColumn(5).width = 14;
  sheet.getColumn(6).width = 10;
  sheet.getColumn(7).width = 12;
  sheet.getColumn(8).width = 48;
  for (let i = 2; i <= 13; i++) {
    if (!sheet.getColumn(i).width || (sheet.getColumn(i).width ?? 0) < 8) {
      sheet.getColumn(i).width = 8;
    }
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
