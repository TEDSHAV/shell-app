/** Grilla mensual (lunes primero) y helpers de fecha. Puro, sin BD. Basado en Administración `periodo-calendario.ts`. */

export const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function pad(n: number, size = 2): string {
  return String(n).padStart(size, "0");
}

export function iso(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parse(fecha: string): Date {
  return new Date(`${fecha.slice(0, 10)}T12:00:00`);
}

export function sumar_dias(fecha: string, dias: number): string {
  const d = parse(fecha);
  d.setDate(d.getDate() + dias);
  return iso(d);
}

/** Todas las fechas del rango, inclusive. */
export function fechas_entre(fecha_inicio: string, fecha_fin: string): string[] {
  const out: string[] = [];
  const end = parse(fecha_fin);
  for (const d = parse(fecha_inicio); d <= end; d.setDate(d.getDate() + 1)) {
    out.push(iso(d));
  }
  return out;
}

export function es_fin_de_semana(fecha: string): boolean {
  const dow = parse(fecha).getDay();
  return dow === 0 || dow === 6;
}

/** 'YYYY-MM' válido o el mes de `hoy`. */
export function normalizar_mes(mes: string | null | undefined, hoy: string): string {
  if (mes && /^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) return mes;
  return hoy.slice(0, 7);
}

export function mover_mes(mes: string, delta: number): string {
  const [y, m] = mes.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function etiqueta_mes(mes: string): string {
  const [y, m] = mes.split("-").map(Number);
  return `${MESES[m - 1]} ${y}`;
}

/** Lunes de la semana de `fecha`. */
export function inicio_semana(fecha: string): string {
  const dow = (parse(fecha).getDay() + 6) % 7;
  return sumar_dias(fecha, -dow);
}

/**
 * Semanas completas (lunes a domingo) que cubren el mes. Los días de los meses vecinos
 * se incluyen para que la grilla no tenga huecos; `en_mes` los distingue.
 */
export function semanas_del_mes(mes: string): Array<Array<{ fecha: string; en_mes: boolean }>> {
  const [y, m] = mes.split("-").map(Number);
  const primero = `${mes}-01`;
  const ultimo = `${mes}-${pad(new Date(y, m, 0).getDate())}`;
  const desde = inicio_semana(primero);
  const hasta = sumar_dias(inicio_semana(ultimo), 6);
  const dias = fechas_entre(desde, hasta).map((fecha) => ({ fecha, en_mes: fecha.startsWith(mes) }));
  const semanas: Array<Array<{ fecha: string; en_mes: boolean }>> = [];
  for (let i = 0; i < dias.length; i += 7) semanas.push(dias.slice(i, i + 7));
  return semanas;
}

/** Rango [desde, hasta] de la grilla del mes, para pedir los eventos de una sola vez. */
export function rango_grilla(mes: string): { desde: string; hasta: string } {
  const semanas = semanas_del_mes(mes);
  return { desde: semanas[0][0].fecha, hasta: semanas[semanas.length - 1][6].fecha };
}

/** 'HH:MM' → minutos desde medianoche; null si no hay hora. */
export function minutos(hora: string | null | undefined): number | null {
  if (!hora) return null;
  const [h, m] = hora.split(":").map(Number);
  if (!Number.isFinite(h)) return null;
  return h * 60 + (Number.isFinite(m) ? m : 0);
}

/** '08:00:00' → '8:00 a. m.' */
export function hora_corta(hora: string | null | undefined): string | null {
  if (!hora) return null;
  const total = minutos(hora);
  if (total == null) return null;
  const h = Math.floor(total / 60);
  const m = total % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(m)} ${h >= 12 ? "p. m." : "a. m."}`;
}

/** 'jue 8 oct' */
export function fecha_corta(fecha: string): string {
  const d = parse(fecha);
  return `${["dom", "lun", "mar", "mié", "jue", "vie", "sáb"][d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)}`;
}

export function fecha_larga(fecha: string): string {
  const d = parse(fecha);
  const dia = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"][d.getDay()];
  return `${dia} ${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
}

/** Fecha de hoy (YYYY-MM-DD) en Venezuela. */
export function hoy_caracas(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Caracas",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
