const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const UTC_MIDNIGHT_REGEX = /^(\d{4}-\d{2}-\d{2})T00:00:00(?:\.000)?Z$/;

export function parseAppDate(value: string | Date) {
  if (value instanceof Date) {
    return new Date(value);
  }

  if (DATE_ONLY_REGEX.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }

  const utcMidnightMatch = value.match(UTC_MIDNIGHT_REGEX);
  if (utcMidnightMatch) {
    const [year, month, day] = utcMidnightMatch[1].split("-").map(Number);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }

  return new Date(value);
}

export function formatAppDate(
  value?: string | Date | null,
  locale = "es-CO",
  options?: Intl.DateTimeFormatOptions,
) {
  if (!value) return "—";

  const date = parseAppDate(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(locale, options).format(date);
}

export function startOfAppDay(value: string | Date) {
  const date = parseAppDate(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function getTodayDateInputValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
