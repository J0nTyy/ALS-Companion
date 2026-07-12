/** Formatting helpers for presenting stored values to researchers. */

const SHORT_DATE: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
};

/**
 * Format an ISO-8601 timestamp as a short, human date (e.g. "12 Jul 2026").
 * Returns an empty string for missing or invalid input.
 */
export function formatDate(iso: string | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, SHORT_DATE).format(date);
}

/**
 * Format a date-only `YYYY-MM-DD` string (e.g. a date of birth) as "12 Jul 2026"
 * in **local** time. Parsing the parts by hand avoids `new Date("YYYY-MM-DD")`,
 * which is interpreted as UTC midnight and can shift the day in other timezones.
 * Returns an empty string for missing or malformed input.
 */
export function formatDateOnly(value: string | undefined): string {
  if (!value) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return "";
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, SHORT_DATE).format(date);
}
