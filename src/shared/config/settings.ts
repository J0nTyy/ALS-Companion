/**
 * Application preference types, defaults, and pure helpers. Kept in a plain module
 * (no React component) so the provider file can hot-reload cleanly and any layer can
 * import these without pulling in the provider.
 */
import type { ExportFormat } from "@/application/export/export-types";

export const ACCENT_COLORS = ["teal", "blue", "violet", "rose", "amber"] as const;
export type AccentColor = (typeof ACCENT_COLORS)[number];

export const ACCENT_META: Record<AccentColor, { label: string; swatch: string }> = {
  teal: { label: "Teal", swatch: "hsl(187 92% 31%)" },
  blue: { label: "Blue", swatch: "hsl(221 83% 53%)" },
  violet: { label: "Violet", swatch: "hsl(262 74% 52%)" },
  rose: { label: "Rose", swatch: "hsl(342 72% 48%)" },
  amber: { label: "Amber", swatch: "hsl(32 90% 42%)" },
};

export type Density = "comfortable" | "compact";

export const ANNOTATION_COLORS = [
  "#f59e0b",
  "#38bdf8",
  "#f43f5e",
  "#a78bfa",
  "#34d399",
] as const;
export type AnnotationColor = (typeof ANNOTATION_COLORS)[number];

export type AnnotationSize = "small" | "medium" | "large";
export const ANNOTATION_SIZE_PX: Record<AnnotationSize, number> = {
  small: 2,
  medium: 3,
  large: 5,
};

export type WheelSensitivity = "low" | "medium" | "high";
/** Per wheel-tick zoom factor. Larger = faster zoom. */
export const WHEEL_STEP: Record<WheelSensitivity, number> = {
  low: 1.03,
  medium: 1.05,
  high: 1.1,
};

export type ComparisonSyncDefault = "none" | "zoom" | "pan" | "both";

/** Printable page size for exported reports. */
export type PageSize = "letter" | "a4";
export const PAGE_SIZE_META: Record<PageSize, { label: string }> = {
  letter: { label: "US Letter (8.5 × 11 in)" },
  a4: { label: "A4 (210 × 297 mm)" },
};

export interface AppSettings {
  accentColor: AccentColor;
  density: Density;
  largerText: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
  /** Initial sidebar state on a fresh workspace (before the user toggles it). */
  sidebarDefaultCollapsed: boolean;
  /** When false, low-stakes deletes skip the confirm dialog (whole-study still confirms). */
  confirmBeforeDelete: boolean;
  defaultExportFormat: ExportFormat;
  // --- viewer / annotation (v2.0.2) ---
  annotationColor: AnnotationColor;
  annotationSize: AnnotationSize;
  /** Decimal places for derived measurements in the ROI inspector. */
  measurementPrecision: number;
  wheelSensitivity: WheelSensitivity;
  /** Show the live cursor-coordinate readout in the annotation viewer. */
  showCoordinates: boolean;
  /** Open the ROI / measurement inspector by default in the annotation workspace. */
  showMeasurementPanel: boolean;
  /** Initial synchronization mode for the MRI comparison workspace. */
  comparisonSyncDefault: ComparisonSyncDefault;
  // --- accessibility (v2.1) ---
  /** Enable roving-focus keyboard navigation + visible skip link + shortcuts. */
  enhancedKeyboardNav: boolean;
  // --- workspace memory (v2.0.2) ---
  /** Remember the last opened study/animal and offer to resume it. */
  rememberLastWorkspace: boolean;
  // --- export content preferences (v2.1) ---
  /** Include annotation summaries in exports. */
  exportIncludeAnnotations: boolean;
  /** Include derived measurements in exports. */
  exportIncludeMeasurements: boolean;
  /** Include longitudinal links in exports. */
  exportIncludeLinks: boolean;
  /** Include the image/file-reference appendix in exports. */
  exportIncludeAppendix: boolean;
  // --- report layout (v2.1) ---
  /** Embed images in reports (inline in DOCX; attached alongside a PDF). */
  exportEmbedImages: boolean;
  /** Printable page size for PDF/DOCX reports. */
  exportPageSize: PageSize;
  /** Add a dedicated cover page (title + institution) to reports. */
  exportCoverPage: boolean;
  /** Institution / laboratory name shown on the cover page and header. */
  exportInstitution: string;
  /** Add a header/footer band with page numbering to reports. */
  exportHeaderFooter: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  accentColor: "teal",
  density: "comfortable",
  largerText: false,
  highContrast: false,
  reducedMotion: false,
  sidebarDefaultCollapsed: false,
  confirmBeforeDelete: true,
  defaultExportFormat: "pdf",
  annotationColor: "#f59e0b",
  annotationSize: "medium",
  measurementPrecision: 3,
  wheelSensitivity: "medium",
  showCoordinates: false,
  showMeasurementPanel: true,
  comparisonSyncDefault: "none",
  enhancedKeyboardNav: false,
  rememberLastWorkspace: true,
  exportIncludeAnnotations: true,
  exportIncludeMeasurements: true,
  exportIncludeLinks: true,
  exportIncludeAppendix: true,
  exportEmbedImages: false,
  exportPageSize: "letter",
  exportCoverPage: false,
  exportInstitution: "",
  exportHeaderFooter: false,
};

export const SETTINGS_STORAGE_KEY = "als.settings";

export function readSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    // Merge over defaults so a newer build's added keys get sensible values.
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** Root font-size (px) driving density + larger-text. Everything else is rem-based,
 *  so this scales text AND spacing proportionally without touching each component. */
export function settingsRootFontPx(settings: AppSettings): string {
  const base = settings.density === "compact" ? 15 : 16;
  return `${base + (settings.largerText ? 2 : 0)}px`;
}
