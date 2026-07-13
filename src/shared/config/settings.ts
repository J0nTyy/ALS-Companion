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
