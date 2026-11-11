import { PNG } from "pngjs";

export type ChartSeries = {
  label: string;
  color: string;
  /** Valores 0–1 o null (mes sin dato). */
  values: Array<number | null>;
};

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function parse_hex(color: string): { r: number; g: number; b: number } {
  const hex = color.replace("#", "");
  const full =
    hex.length === 3
      ? hex
          .split("")
          .map((c) => c + c)
          .join("")
      : hex;
  return {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16),
  };
}

function set_pixel(
  png: PNG,
  x: number,
  y: number,
  rgba: { r: number; g: number; b: number; a?: number },
): void {
  const xi = Math.round(x);
  const yi = Math.round(y);
  if (xi < 0 || yi < 0 || xi >= png.width || yi >= png.height) return;
  const idx = (png.width * yi + xi) << 2;
  const a = rgba.a ?? 255;
  if (a >= 255) {
    png.data[idx] = rgba.r;
    png.data[idx + 1] = rgba.g;
    png.data[idx + 2] = rgba.b;
    png.data[idx + 3] = 255;
    return;
  }
  const inv = 1 - a / 255;
  png.data[idx] = Math.round(rgba.r * (a / 255) + png.data[idx] * inv);
  png.data[idx + 1] = Math.round(rgba.g * (a / 255) + png.data[idx + 1] * inv);
  png.data[idx + 2] = Math.round(rgba.b * (a / 255) + png.data[idx + 2] * inv);
  png.data[idx + 3] = 255;
}

function fill_rect(
  png: PNG,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  rgba: { r: number; g: number; b: number; a?: number },
): void {
  const left = Math.max(0, Math.floor(Math.min(x0, x1)));
  const right = Math.min(png.width - 1, Math.ceil(Math.max(x0, x1)));
  const top = Math.max(0, Math.floor(Math.min(y0, y1)));
  const bottom = Math.min(png.height - 1, Math.ceil(Math.max(y0, y1)));
  for (let y = top; y <= bottom; y++) {
    for (let x = left; x <= right; x++) set_pixel(png, x, y, rgba);
  }
}

function draw_line(
  png: PNG,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  rgba: { r: number; g: number; b: number; a?: number },
  width = 2,
): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy)));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x0 + dx * t;
    const y = y0 + dy * t;
    fill_rect(
      png,
      x - width / 2,
      y - width / 2,
      x + width / 2,
      y + width / 2,
      rgba,
    );
  }
}

function draw_dashed_h(
  png: PNG,
  x0: number,
  x1: number,
  y: number,
  rgba: { r: number; g: number; b: number },
): void {
  for (let x = x0; x <= x1; x += 10) {
    fill_rect(png, x, y - 1, Math.min(x + 5, x1), y + 1, rgba);
  }
}

const GLYPHS: Record<string, number[]> = {
  " ": [0, 0, 0, 0, 0],
  "-": [0, 0, 31, 0, 0],
  ".": [0, 0, 0, 0, 4],
  "%": [17, 8, 4, 2, 17],
  "0": [14, 17, 17, 17, 14],
  "1": [4, 12, 4, 4, 14],
  "2": [14, 1, 14, 16, 31],
  "3": [30, 1, 14, 1, 30],
  "4": [18, 18, 31, 2, 2],
  "5": [31, 16, 30, 1, 30],
  "6": [14, 16, 30, 17, 14],
  "7": [31, 1, 2, 4, 8],
  "8": [14, 17, 14, 17, 14],
  "9": [14, 17, 15, 1, 14],
  A: [14, 17, 31, 17, 17],
  B: [30, 17, 30, 17, 30],
  C: [14, 17, 16, 17, 14],
  D: [30, 17, 17, 17, 30],
  E: [31, 16, 30, 16, 31],
  F: [31, 16, 30, 16, 16],
  G: [14, 16, 19, 17, 14],
  H: [17, 17, 31, 17, 17],
  I: [14, 4, 4, 4, 14],
  J: [1, 1, 1, 17, 14],
  K: [17, 18, 28, 18, 17],
  L: [16, 16, 16, 16, 31],
  M: [17, 27, 21, 17, 17],
  N: [17, 25, 21, 19, 17],
  O: [14, 17, 17, 17, 14],
  P: [30, 17, 30, 16, 16],
  Q: [14, 17, 17, 19, 15],
  R: [30, 17, 30, 18, 17],
  S: [15, 16, 14, 1, 30],
  T: [31, 4, 4, 4, 4],
  U: [17, 17, 17, 17, 14],
  V: [17, 17, 17, 10, 4],
  W: [17, 17, 21, 27, 17],
  X: [17, 10, 4, 10, 17],
  Y: [17, 10, 4, 4, 4],
  Z: [31, 2, 4, 8, 31],
};

function draw_text(
  png: PNG,
  text: string,
  x: number,
  y: number,
  rgba: { r: number; g: number; b: number },
  scale = 2,
): void {
  let cursor = x;
  for (const ch of text.toUpperCase()) {
    const glyph = GLYPHS[ch] ?? GLYPHS[" "];
    for (let row = 0; row < 5; row++) {
      const bits = glyph[row] ?? 0;
      for (let col = 0; col < 5; col++) {
        if (bits & (16 >> col)) {
          fill_rect(
            png,
            cursor + col * scale,
            y + row * scale,
            cursor + (col + 1) * scale - 1,
            y + (row + 1) * scale - 1,
            rgba,
          );
        }
      }
    }
    cursor += 6 * scale;
  }
}

function text_width(text: string, scale: number): number {
  return text.length * 6 * scale;
}

/**
 * Barras agrupadas por mes (legible en Excel / Sheets; sin sharp).
 */
export async function build_cumplimiento_chart_png(args: {
  title: string;
  categories: string[];
  series: ChartSeries[];
  width?: number;
  height?: number;
}): Promise<Buffer> {
  const width = args.width ?? 960;
  const height = args.height ?? 380;
  const pad_l = 56;
  const pad_r = 28;
  const pad_t = 56;
  const pad_b = 72;
  const plot_w = width - pad_l - pad_r;
  const plot_h = height - pad_t - pad_b;
  const n = Math.max(args.categories.length, 1);

  const png = new PNG({ width, height });
  // Fondo suave
  fill_rect(png, 0, 0, width - 1, height - 1, { r: 248, g: 250, b: 252 });
  fill_rect(png, 8, 8, width - 9, height - 9, { r: 255, g: 255, b: 255 });

  const y_at = (v: number) => pad_t + (1 - clamp01(v)) * plot_h;
  const ink = { r: 30, g: 41, b: 59 };
  const muted = { r: 100, g: 116, b: 139 };
  const grid = { r: 226, g: 232, b: 240 };

  draw_text(png, args.title.slice(0, 42), pad_l, 18, ink, 2);

  // Grid + ejes Y
  for (let g = 0; g <= 4; g++) {
    const y = pad_t + (g / 4) * plot_h;
    draw_line(png, pad_l, y, pad_l + plot_w, y, grid, 1);
    const label = `${Math.round((1 - g / 4) * 100)}%`;
    draw_text(png, label, 10, y - 5, muted, 1);
  }
  draw_line(png, pad_l, pad_t, pad_l, pad_t + plot_h, { r: 148, g: 163, b: 184 }, 2);
  draw_line(
    png,
    pad_l,
    pad_t + plot_h,
    pad_l + plot_w,
    pad_t + plot_h,
    { r: 148, g: 163, b: 184 },
    2,
  );

  // Separar meta (línea) de series de datos (barras)
  const data_series = args.series.filter(
    (s) => !/meta/i.test(s.label),
  );
  const meta_series = args.series.find((s) => /meta/i.test(s.label));
  const bar_series =
    data_series.length > 0 ? data_series : args.series.slice(0, 1);

  if (meta_series) {
    const meta_v = meta_series.values.find((v) => v != null) ?? 0.9;
    const my = y_at(meta_v);
    draw_dashed_h(png, pad_l, pad_l + plot_w, my, { r: 148, g: 163, b: 184 });
    draw_text(
      png,
      `META ${Math.round(clamp01(meta_v) * 100)}%`,
      pad_l + plot_w - text_width(`META ${Math.round(clamp01(meta_v) * 100)}%`, 1) - 4,
      my - 14,
      muted,
      1,
    );
  }

  const group_w = plot_w / n;
  const gap = Math.max(4, group_w * 0.12);
  const inner_w = group_w - gap * 2;
  const bar_gap = 3;
  const bar_w = Math.max(
    6,
    (inner_w - bar_gap * (bar_series.length - 1)) / Math.max(bar_series.length, 1),
  );

  bar_series.forEach((ser, si) => {
    const rgb = parse_hex(ser.color);
    ser.values.forEach((v, mi) => {
      if (v == null) return;
      const gx = pad_l + mi * group_w + gap;
      const x0 = gx + si * (bar_w + bar_gap);
      const y0 = y_at(v);
      const y1 = pad_t + plot_h;
      // sombra suave
      fill_rect(png, x0 + 2, y0 + 2, x0 + bar_w + 1, y1, {
        r: 15,
        g: 23,
        b: 42,
        a: 28,
      });
      fill_rect(png, x0, y0, x0 + bar_w - 1, y1 - 1, rgb);
      // highlight superior
      fill_rect(png, x0, y0, x0 + bar_w - 1, y0 + 3, {
        r: Math.min(255, rgb.r + 40),
        g: Math.min(255, rgb.g + 40),
        b: Math.min(255, rgb.b + 40),
      });
      const pct = `${Math.round(clamp01(v) * 100)}`;
      if (bar_w >= 14) {
        draw_text(
          png,
          pct,
          x0 + Math.max(0, (bar_w - text_width(pct, 1)) / 2),
          y0 - 14,
          ink,
          1,
        );
      }
    });
  });

  args.categories.forEach((c, i) => {
    const label = c.slice(0, 3).toUpperCase();
    const tw = text_width(label, 1);
    draw_text(
      png,
      label,
      pad_l + i * group_w + (group_w - tw) / 2,
      height - 56,
      muted,
      1,
    );
  });

  // Leyenda inferior
  let lx = pad_l;
  const ly = height - 28;
  bar_series.forEach((ser) => {
    const rgb = parse_hex(ser.color);
    fill_rect(png, lx, ly, lx + 12, ly + 12, rgb);
    draw_text(png, ser.label.slice(0, 16), lx + 16, ly + 1, ink, 1);
    lx += 16 + text_width(ser.label.slice(0, 16), 1) + 18;
  });
  if (meta_series) {
    fill_rect(png, lx, ly + 5, lx + 14, ly + 7, { r: 148, g: 163, b: 184 });
    draw_text(png, "META", lx + 18, ly + 1, muted, 1);
  }

  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    png
      .pack()
      .on("data", (chunk: Buffer) => chunks.push(chunk))
      .on("end", () => resolve(Buffer.concat(chunks)))
      .on("error", reject);
  });
}
