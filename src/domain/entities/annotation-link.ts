/**
 * Domain entity: AnnotationLink (v1.7)
 * ----------------------------------------------------------------------------
 * A researcher-created, DIRECTIONAL relationship between two {@link Annotation}s
 * that represent the same biological structure across different MRI sessions — the
 * basis for studying progression over time. Framework-free: no React, SQLite, Tauri.
 *
 * Links are KNOWLEDGE the researcher enters explicitly. There is no automatic
 * matching, image analysis, or AI — a human decides that two marks correspond.
 * Future modules (disease progression, growth analysis, statistics, AI) must
 * CONSUME these links rather than infer correspondence themselves.
 */

export const ANNOTATION_RELATIONSHIP_TYPES = [
  "baseline",
  "follow_up",
  "related",
] as const;

export type AnnotationRelationshipType =
  (typeof ANNOTATION_RELATIONSHIP_TYPES)[number];

export interface AnnotationLink {
  /** Stable unique identifier (UUID v4). */
  readonly id: string;
  /** The "from" annotation (the link is directional: source → target). */
  readonly sourceAnnotationId: string;
  /** The "to" annotation. */
  readonly targetAnnotationId: string;
  relationshipType: AnnotationRelationshipType;
  /** Optional free-text note about the relationship. */
  notes?: string;
  /** ISO-8601 creation timestamp. */
  readonly createdAt: string;
}

/** Fields a researcher provides when creating a link. */
export type NewAnnotationLinkInput = {
  sourceAnnotationId: string;
  targetAnnotationId: string;
  relationshipType: AnnotationRelationshipType;
  notes?: string;
};

/** User-facing labels for each relationship type. */
export const ANNOTATION_RELATIONSHIP_TYPE_META: Record<
  AnnotationRelationshipType,
  { label: string }
> = {
  baseline: { label: "Baseline" },
  follow_up: { label: "Follow-up" },
  related: { label: "Related" },
};

export function isAnnotationRelationshipType(
  value: unknown,
): value is AnnotationRelationshipType {
  return (
    typeof value === "string" &&
    (ANNOTATION_RELATIONSHIP_TYPES as readonly string[]).includes(value)
  );
}

// --- pure link-graph helpers (used by comparison highlighting + navigation) ---

/** The other annotation a link connects to `annotationId`, or null if unrelated. */
export function linkPartnerId(
  link: AnnotationLink,
  annotationId: string,
): string | null {
  if (link.sourceAnnotationId === annotationId) return link.targetAnnotationId;
  if (link.targetAnnotationId === annotationId) return link.sourceAnnotationId;
  return null;
}

/** All annotation ids directly linked to `annotationId` (both directions). */
export function partnersOf(
  links: readonly AnnotationLink[],
  annotationId: string,
): string[] {
  const partners: string[] = [];
  for (const link of links) {
    const partner = linkPartnerId(link, annotationId);
    if (partner !== null && !partners.includes(partner)) partners.push(partner);
  }
  return partners;
}

/**
 * The ids (drawn from `idsA ∪ idsB`) that are linked to a partner in the *other*
 * set — i.e. the marks that should show a persistent "linked across sessions"
 * indicator when two sessions are compared side by side.
 */
export function crossLinkedIds(
  links: readonly AnnotationLink[],
  idsA: ReadonlySet<string>,
  idsB: ReadonlySet<string>,
): Set<string> {
  const result = new Set<string>();
  for (const link of links) {
    const { sourceAnnotationId: s, targetAnnotationId: t } = link;
    if ((idsA.has(s) && idsB.has(t)) || (idsA.has(t) && idsB.has(s))) {
      result.add(s);
      result.add(t);
    }
  }
  return result;
}
