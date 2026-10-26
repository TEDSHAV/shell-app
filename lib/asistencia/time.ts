export const ASISTENCIA_TIMEZONE = "America/Caracas";
export const DEFAULT_CUTOFF_TIME = "08:30:00";
export const DEFAULT_SECOND_CUTOFF_TIME = "14:00:00";
export const MORNING_RESET_TIME = "08:00:00";
export const PRISMA_SESSION_DATE_COOKIE = "prisma_session_date";

/**
 * Returns the current date string in YYYY-MM-DD format in America/Caracas timezone.
 */
export function getCaracasDateString(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ASISTENCIA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((p) => p.type === "year")?.value ?? "1970";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

/**
 * Returns the "operational workday stamp" for session expiration in America/Caracas.
 * The workday starts at 08:00:00 AM Caracas time:
 * - Between 00:00:00 and 07:59:59 AM, a session receives `"YYYY-MM-DD:madrugada"`.
 * - At 08:00:00 AM onwards, the required stamp becomes `"YYYY-MM-DD"`.
 * This ensures anyone who logged in before 8:00 AM is logged out once 8:00 AM arrives
 * and must log in fresh during office hours to be counted as present.
 */
export function getCaracasWorkdaySessionStamp(date: Date = new Date()): string {
  const dateStr = getCaracasDateString(date);
  const timeStr = getCaracasTimeString(date);
  if (timeStr < MORNING_RESET_TIME) {
    return `${dateStr}:madrugada`;
  }
  return dateStr;
}

/**
 * Returns true if the given timestamp is at or after 08:00:00 AM in America/Caracas.
 * Logins before 08:00 AM are not automatically counted as morning office attendance.
 */
export function isAfterMorningReset(
  date: Date = new Date(),
  resetTime: string = MORNING_RESET_TIME,
): boolean {
  return getCaracasTimeString(date) >= normalizeCutoffTime(resetTime);
}

/**
 * Returns the 24-hour time string in HH:MM:SS format in America/Caracas timezone.
 */
export function getCaracasTimeString(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: ASISTENCIA_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  let hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  if (hour === "24") hour = "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  const second = parts.find((p) => p.type === "second")?.value ?? "00";
  return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}:${second.padStart(2, "0")}`;
}

/**
 * Normalizes a cutoff string like "08:30" or "08:30:00" into "HH:MM:SS".
 */
export function normalizeCutoffTime(raw: string | null | undefined): string {
  const trimmed = (raw || "").trim();
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(trimmed);
  if (!match) return DEFAULT_CUTOFF_TIME;
  const hh = Math.min(23, Math.max(0, parseInt(match[1], 10)));
  const mm = Math.min(59, Math.max(0, parseInt(match[2], 10)));
  const ss = match[3] ? Math.min(59, Math.max(0, parseInt(match[3], 10))) : 0;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

/**
 * Formats a cutoff time ("08:30:00") into 12-hour human label ("08:30 AM").
 */
export function formatCutoffLabel(cutoff: string | null | undefined): string {
  const norm = normalizeCutoffTime(cutoff);
  const [hStr, mStr] = norm.split(":");
  const h24 = parseInt(hStr, 10);
  const suffix = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${String(h12).padStart(2, "0")}:${mStr} ${suffix}`;
}

/**
 * Formats an ISO timestamp into a 12-hour time string in America/Caracas ("07:54 AM").
 */
export function formatCaracasTime12h(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(d.getTime())) return "—";
  const time24 = getCaracasTimeString(d);
  const [hStr, mStr] = time24.split(":");
  const h24 = parseInt(hStr, 10);
  const suffix = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${String(h12).padStart(2, "0")}:${mStr} ${suffix}`;
}

/**
 * Returns true if the given ISO timestamp or Date was recorded at or before the cutoff time
 * on its Caracas date.
 */
export function isOnOrBeforeCutoff(
  isoOrDate: string | Date,
  cutoffTime: string = DEFAULT_CUTOFF_TIME,
): boolean {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(d.getTime())) return false;
  const time24 = getCaracasTimeString(d);
  const normCutoff = normalizeCutoffTime(cutoffTime);
  return time24 <= normCutoff;
}

/**
 * Returns true if the given Date (or YYYY-MM-DD date string) is Monday–Friday in America/Caracas.
 */
export function isWeekdayCaracas(dateOrIsoDate: Date | string = new Date()): boolean {
  const dateObj =
    typeof dateOrIsoDate === "string"
      ? new Date(`${dateOrIsoDate}T12:00:00-04:00`)
      : dateOrIsoDate;
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: ASISTENCIA_TIMEZONE,
    weekday: "short",
  }).format(dateObj);
  return weekday !== "Sat" && weekday !== "Sun";
}

/**
 * Formats a YYYY-MM-DD date string into a Spanish long date (e.g. "Viernes, 23 de octubre de 2026").
 */
export function formatSpanishLongDate(yyyyMmDd: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(yyyyMmDd.trim());
  if (!match) return yyyyMmDd;
  const d = new Date(`${yyyyMmDd}T12:00:00-04:00`);
  if (Number.isNaN(d.getTime())) return yyyyMmDd;
  const formatted = new Intl.DateTimeFormat("es-VE", {
    timeZone: ASISTENCIA_TIMEZONE,
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(d);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/**
 * Formats a YYYY-MM-DD date string into DD/MM/YYYY.
 */
export function formatDdMmYyyy(yyyyMmDd: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(yyyyMmDd.trim());
  if (!match) return yyyyMmDd;
  return `${match[3]}/${match[2]}/${match[1]}`;
}
