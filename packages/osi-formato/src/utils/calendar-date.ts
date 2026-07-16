export function parseCalendarDayLocal(value: unknown): Date | null {
  if (value == null) {
    return null;
  }
  const text = String(value).trim();
  if (!text) {
    return null;
  }

  const isoDay = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDay) {
    const year = Number(isoDay[1]);
    const month = Number(isoDay[2]) - 1;
    const day = Number(isoDay[3]);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
      return null;
    }
    const date = new Date(year, month, day);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    date.setHours(0, 0, 0, 0);
    return date;
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

export function formatCalendarDayEsVe(value: unknown): string {
  const date = parseCalendarDayLocal(value);
  if (!date) {
    return "N/A";
  }
  return date.toLocaleDateString("es-VE");
}
