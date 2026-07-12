/**
 * Value-object rules for date-only (`YYYY-MM-DD`) values.
 * ----------------------------------------------------------------------------
 * Pure, framework-free. Shared by application validation and by infrastructure
 * row mapping so that "what counts as a valid stored date" is defined once.
 */

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * True when `value` is a strict `YYYY-MM-DD` string denoting a real calendar
 * date. Rejects malformed input (e.g. "2026/01/01") and impossible dates
 * (e.g. "2026-02-30") by confirming the parts round-trip.
 */
export function isValidDateOnly(value: string): boolean {
  const match = DATE_ONLY.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/**
 * Add a whole number of days to a `YYYY-MM-DD` date, returning a `YYYY-MM-DD`
 * string. Calendar arithmetic on local date parts (handles month/year rollover);
 * no timezone conversion, so the result never drifts. Throws on invalid input.
 */
export function addDaysToDateOnly(base: string, days: number): string {
  const match = DATE_ONLY.exec(base);
  if (!match || !isValidDateOnly(base)) {
    throw new Error(`Invalid base date: ${base}`);
  }
  if (!Number.isInteger(days)) {
    throw new Error(`Day offset must be an integer: ${days}`);
  }
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
