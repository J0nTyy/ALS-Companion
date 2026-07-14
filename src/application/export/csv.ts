/**
 * CSV serialization via **papaparse** (`unparse`) — RFC-4180 quoting/escaping is
 * handled by the library. Kept behind this small `toCsv` helper so the exporters
 * stay unchanged. Lines are LF-terminated with a trailing newline.
 */
import Papa from "papaparse";

export type CsvValue = string | number | null | undefined;

/** Build CSV text from a header row and data rows. */
export function toCsv(header: readonly string[], rows: readonly CsvValue[][]): string {
  const data = rows.map((row) => row.map((v) => (v === null || v === undefined ? "" : v)));
  const body = Papa.unparse({ fields: [...header], data }, { newline: "\n" });
  return `${body}\n`;
}
