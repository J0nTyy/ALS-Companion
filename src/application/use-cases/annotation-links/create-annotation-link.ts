import type {
  AnnotationLink,
  NewAnnotationLinkInput,
} from "@/domain/entities/annotation-link";
import {
  ConflictError,
  NotFoundError,
  StudyArchivedError,
  ValidationError,
} from "@/application/errors";
import type { AnnotationLinkUseCaseDeps } from "../deps";
import { validateAnnotationLinkFields } from "./validate-annotation-link-input";

/**
 * Create a directional longitudinal link between two annotations.
 *
 * Validates the relationship type/notes, then enforces the link rules: an
 * annotation can't link to itself, both annotations must exist, the source
 * annotation's study must not be archived, and the pair must not already be linked
 * (in either direction). Researcher-created only — nothing is inferred.
 */
export async function createAnnotationLink(
  deps: AnnotationLinkUseCaseDeps,
  input: NewAnnotationLinkInput,
): Promise<AnnotationLink> {
  const fields = validateAnnotationLinkFields(input);

  if (input.sourceAnnotationId === input.targetAnnotationId) {
    throw new ValidationError(
      "An annotation can't be linked to itself.",
      "targetAnnotationId",
    );
  }

  const source = await deps.context.getContext(input.sourceAnnotationId);
  if (!source) {
    throw new NotFoundError("The source annotation could not be found.");
  }
  const target = await deps.context.getContext(input.targetAnnotationId);
  if (!target) {
    throw new NotFoundError("The annotation to link could not be found.");
  }

  if (source.studyStatus === "archived") {
    throw new StudyArchivedError(
      "Restore this study before linking its annotations.",
    );
  }

  const existing = await deps.repository.findBetween(
    input.sourceAnnotationId,
    input.targetAnnotationId,
  );
  if (existing) {
    throw new ConflictError("These annotations are already linked.");
  }

  const now = deps.clock.now();
  const link: AnnotationLink = {
    id: deps.ids.next(),
    sourceAnnotationId: input.sourceAnnotationId,
    targetAnnotationId: input.targetAnnotationId,
    relationshipType: fields.relationshipType,
    createdAt: now,
    ...(fields.notes !== undefined ? { notes: fields.notes } : {}),
  };

  await deps.repository.create(link);
  return link;
}
