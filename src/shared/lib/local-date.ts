/**
 * Format a `Date` as a `YYYY-MM-DD` string using its **local** calendar parts.
 *
 * Deliberately does NOT use `toISOString()`, which is UTC and can yield the
 * previous/next day near midnight in non-UTC timezones. Shared by the calendar
 * adapter and the form's date `max` so both use identical local-day semantics.
 */
export function localDateOnly(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
