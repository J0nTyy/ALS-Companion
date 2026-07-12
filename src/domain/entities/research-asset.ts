/**
 * Domain entity: ResearchAsset
 * ----------------------------------------------------------------------------
 * A ResearchAsset is **metadata describing a scientific file** — it is the single,
 * permanent metadata layer that every future file-based feature reuses (MRI
 * images, histology/microscopy images, PDFs, spreadsheets, documents, videos,
 * analysis outputs). Framework-free: no React, SQLite, or Tauri.
 *
 * IMPORTANT — this milestone stores metadata ONLY. A ResearchAsset never holds a
 * file path, blob, or binary data, and nothing here loads/reads/uploads files.
 * Actual attachment (file storage + viewer) is gated behind the CSP security
 * milestone and lands in a later version.
 *
 * PROJECT RULE (v0.8): no future feature stores raw files directly. Every future
 * image/PDF/spreadsheet/report first exists as a ResearchAsset; the eventual
 * storage mechanism lives behind an abstraction the rest of the app never sees.
 *
 * The asset is polymorphic via (`ownerType`, `ownerId`). Only "mri_session" is
 * supported today, but adding an owner type later is a one-line change — no
 * redesign — because everything keys off the derived union types.
 */

export const RESEARCH_ASSET_OWNER_TYPES = ["mri_session"] as const;

export type ResearchAssetOwnerType =
  (typeof RESEARCH_ASSET_OWNER_TYPES)[number];

export const RESEARCH_ASSET_TYPES = [
  "mri_image",
  "histology_image",
  "microscopy_image",
  "pdf",
  "spreadsheet",
  "document",
  "video",
  "other",
] as const;

export type ResearchAssetType = (typeof RESEARCH_ASSET_TYPES)[number];

export const RESEARCH_ASSET_STATUSES = [
  "planned",
  "pending_attachment",
  "attached",
] as const;

export type ResearchAssetStatus = (typeof RESEARCH_ASSET_STATUSES)[number];

/**
 * Statuses a researcher may set today. "attached" is reserved — it is set
 * automatically by the future attachment subsystem once a real file is attached,
 * so it must not be chosen manually (that would imply a file exists when it does
 * not).
 */
export const SELECTABLE_RESEARCH_ASSET_STATUSES = [
  "planned",
  "pending_attachment",
] as const;

export interface ResearchAsset {
  /** Stable unique identifier (UUID v4). */
  readonly id: string;
  /** What kind of entity owns this asset (polymorphic). */
  readonly ownerType: ResearchAssetOwnerType;
  /** The owning entity's id (e.g. an MRI session id). */
  readonly ownerId: string;
  /** What kind of file this metadata describes. */
  assetType: ResearchAssetType;
  /** Short researcher-facing title. */
  title: string;
  /** Optional free-text description. */
  description?: string;
  /** Lifecycle status of the (future) attachment. */
  status: ResearchAssetStatus;
  /** ISO-8601 creation timestamp. */
  readonly createdAt: string;
  /** ISO-8601 timestamp of the last modification. */
  updatedAt: string;
}

/** Fields a researcher provides when creating an asset placeholder. */
export type NewResearchAssetInput = Pick<
  ResearchAsset,
  "ownerType" | "ownerId" | "assetType" | "title"
> &
  Partial<Pick<ResearchAsset, "status" | "description">>;

/** Fields a researcher can change when editing asset metadata. */
export type UpdateResearchAssetInput = Pick<
  ResearchAsset,
  "id" | "assetType" | "title"
> &
  Partial<Pick<ResearchAsset, "status" | "description">>;

/** User-facing labels for each owner type. */
export const RESEARCH_ASSET_OWNER_TYPE_META: Record<
  ResearchAssetOwnerType,
  { label: string }
> = {
  mri_session: { label: "MRI Session" },
};

/** User-facing labels for each asset type. */
export const RESEARCH_ASSET_TYPE_META: Record<
  ResearchAssetType,
  { label: string }
> = {
  mri_image: { label: "MRI Image" },
  histology_image: { label: "Histology Image" },
  microscopy_image: { label: "Microscopy Image" },
  pdf: { label: "PDF" },
  spreadsheet: { label: "Spreadsheet" },
  document: { label: "Document" },
  video: { label: "Video" },
  other: { label: "Other" },
};

/** User-facing presentation metadata for each status. */
export const RESEARCH_ASSET_STATUS_META: Record<
  ResearchAssetStatus,
  { label: string; tone: "secondary" | "warning" | "success" }
> = {
  planned: { label: "Planned", tone: "secondary" },
  pending_attachment: { label: "Pending attachment", tone: "warning" },
  attached: { label: "Attached", tone: "success" },
};

export function isResearchAssetOwnerType(
  value: unknown,
): value is ResearchAssetOwnerType {
  return (
    typeof value === "string" &&
    (RESEARCH_ASSET_OWNER_TYPES as readonly string[]).includes(value)
  );
}

export function isResearchAssetType(
  value: unknown,
): value is ResearchAssetType {
  return (
    typeof value === "string" &&
    (RESEARCH_ASSET_TYPES as readonly string[]).includes(value)
  );
}

export function isResearchAssetStatus(
  value: unknown,
): value is ResearchAssetStatus {
  return (
    typeof value === "string" &&
    (RESEARCH_ASSET_STATUSES as readonly string[]).includes(value)
  );
}
