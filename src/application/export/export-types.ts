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

/** Raw bytes + intrinsic dimensions of one image, loaded for embedding in a report. */
export interface ReportImage {
  bytes: Uint8Array;
  mimeType: string;
  /** Intrinsic pixel width/height (0 when unknown). */
  width: number;
  height: number;
}

/**
 * Images loaded from managed storage for a report, keyed by their stored relative
 * path. Supplied to the report exporters so they can embed the images (DOCX). The
 * pure exporters never read the filesystem — the service loads the bytes and passes
 * them in.
 */
export type ReportImages = ReadonlyMap<string, ReportImage>;

/** Printable page size for reports. */
export type ReportPageSize = "letter" | "a4";

/** Page dimensions in PDF points (72 per inch) for each supported page size. */
export const PAGE_DIMENSIONS: Record<
  ReportPageSize,
  { width: number; height: number }
> = {
  letter: { width: 612, height: 792 },
  a4: { width: 595, height: 842 },
};

/** Layout options for the PDF/DOCX report writers (from the researcher's settings). */
export interface ReportOptions {
  pageSize: ReportPageSize;
  /** Prepend a dedicated cover page (title + institution). */
  coverPage: boolean;
  /** Institution / laboratory name for the cover page and running header (""=none). */
  institution: string;
  /** Add a running header/footer band with page numbering. */
  headerFooter: boolean;
}

export const DEFAULT_REPORT_OPTIONS: ReportOptions = {
  pageSize: "letter",
  coverPage: false,
  institution: "",
  headerFooter: false,
};

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
