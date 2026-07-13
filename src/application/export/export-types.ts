/**
 * Shared types for the Export & Report Engine (v1.8). The engine turns an existing
 * {@link PublicationPackage} into one or more files; it never queries repositories
 * or duplicates publication logic. Writing the files to disk is a separate concern
 * (the FileStore abstraction).
 */

export const EXPORT_FORMATS = ["pdf", "docx", "csv", "json"] as const;

export type ExportFormat = (typeof EXPORT_FORMATS)[number];

/** One output file produced by an exporter — raw bytes + a filename. */
export interface ExportFile {
  name: string;
  /** UTF-8 (text formats) or binary (pdf/docx) content. */
  bytes: Uint8Array;
}

/** The full set of files an exporter produced for a chosen format. */
export interface ExportBundle {
  format: ExportFormat;
  files: ExportFile[];
}

export const EXPORT_FORMAT_META: Record<
  ExportFormat,
  { label: string; description: string; multiFile: boolean }
> = {
  pdf: {
    label: "PDF report",
    description: "A professional, print-ready report.",
    multiFile: false,
  },
  docx: {
    label: "Word document (.docx)",
    description: "An editable report with headings and tables.",
    multiFile: false,
  },
  csv: {
    label: "CSV datasets",
    description:
      "Tabular data as separate files (animals, observations, timeline, …).",
    multiFile: true,
  },
  json: {
    label: "JSON",
    description: "The complete package as structured data (for analysis / AI).",
    multiFile: false,
  },
};

export function isExportFormat(value: unknown): value is ExportFormat {
  return (
    typeof value === "string" && (EXPORT_FORMATS as readonly string[]).includes(value)
  );
}

const TEXT_ENCODER = new TextEncoder();

/** Build a text {@link ExportFile} (UTF-8). */
export function textFile(name: string, text: string): ExportFile {
  return { name, bytes: TEXT_ENCODER.encode(text) };
}

/** A filesystem-safe slug of a study name, for filenames. */
export function studySlug(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.length > 0 ? slug : "study";
}
