/**
 * Pure helpers for choosing what to compare and describing it — kept out of the
 * components so session selection and metadata rendering are unit-testable.
 */
import type { ComparableSession } from "@/application/ports/mri-comparison-reader";
import { imageFormatForMime } from "@/domain/entities/stored-file";
import { formatDateOnly } from "@/shared/lib/format";

export interface ComparisonSelection {
  left: ComparableSession | null;
  right: ComparableSession | null;
  /** True when both sides are chosen and can be shown. */
  ready: boolean;
  /** True when both sides are the same session (allowed, but worth noting). */
  sameSession: boolean;
}

/** Resolve chosen ids against the available sessions. */
export function resolveSelection(
  sessions: readonly ComparableSession[],
  leftId: string | null,
  rightId: string | null,
): ComparisonSelection {
  const find = (id: string | null) =>
    id ? (sessions.find((s) => s.sessionId === id) ?? null) : null;
  const left = find(leftId);
  const right = find(rightId);
  return {
    left,
    right,
    ready: left !== null && right !== null,
    sameSession: left !== null && right !== null && left.sessionId === right.sessionId,
  };
}

export interface MetaRow {
  label: string;
  value: string;
  /** True when the value is a "not recorded" placeholder (styled muted). */
  muted?: boolean;
}

/**
 * The per-side metadata rows, in the order the spec lists them, so a researcher
 * always knows exactly what they are comparing.
 */
export function comparisonMetadataRows(session: ComparableSession): MetaRow[] {
  const optional = (
    value: string | undefined,
  ): { value: string; muted: boolean } => {
    const present = value !== undefined && value.trim().length > 0;
    return { value: present ? value : "Not recorded", muted: !present };
  };

  const region = optional(session.region);
  const operator = optional(session.operator);

  return [
    { label: "Study", value: session.studyName },
    { label: "Animal", value: session.animalIdentifier },
    { label: "Timeline event", value: session.timelineEventTitle },
    { label: "Acquisition date", value: formatDateOnly(session.acquisitionDate) },
    { label: "Region", value: region.value, muted: region.muted },
    { label: "Operator", value: operator.value, muted: operator.muted },
    { label: "File", value: session.image.originalName },
    {
      label: "Image type",
      value:
        imageFormatForMime(session.image.mimeType)?.label ??
        session.image.mimeType,
    },
  ];
}

/** A concise one-line label for a session in the picker. */
export function sessionPickerLabel(session: ComparableSession): string {
  const parts = [
    session.animalIdentifier,
    session.title,
    formatDateOnly(session.acquisitionDate),
  ];
  return parts.join(" · ");
}
