/**
 * Read model for the MRI Comparison workspace (v1.1). Purely a read over existing
 * tables — NO new entity or table. A "comparable session" is an MRI session that
 * has at least one attached, in-app-viewable image (PNG/JPEG), bundled with the
 * context a researcher needs to know exactly what they're comparing.
 */

/** The representative (most recent viewable) image of a session. */
export interface ComparableSessionImage {
  storedFileId: string;
  relativePath: string;
  originalName: string;
  mimeType: string;
}

/** An MRI session that can be shown in the comparison workspace, with context. */
export interface ComparableSession {
  sessionId: string;
  title: string;
  modality: string;
  acquisitionDate: string;
  region?: string;
  operator?: string;
  studyId: string;
  studyName: string;
  animalId: string;
  animalIdentifier: string;
  timelineEventId: string;
  timelineEventTitle: string;
  image: ComparableSessionImage;
}

/**
 * Port: lists the sessions available to compare. Implemented in infrastructure by
 * a SQL read over mri_sessions → timeline_events → animals → studies and
 * research_assets → stored_files (viewable images only).
 */
export interface MriComparisonReader {
  /** Comparable sessions (each with its most recent viewable image), newest first. */
  listComparableSessions(): Promise<ComparableSession[]>;
}
