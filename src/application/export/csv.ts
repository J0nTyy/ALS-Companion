/**
 * Minimal RFC-4180-style CSV serialization (pure). A field is quoted only when it
 * contains a comma, quote, or newline; embedded quotes are doubled.
 */

export type CsvValue = string | number | null | undefined;

function escapeField(value: CsvValue): string {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/** Build CSV text from a header row and data rows. Lines are LF-terminated. */
export function toCsv(header: readonly string[], rows: readonly CsvValue[][]): string {
  const lines = [header.map(escapeField).join(",")];
  for (const row of rows) lines.push(row.map(escapeField).join(","));
  return `${lines.join("\n")}\n`;
}
