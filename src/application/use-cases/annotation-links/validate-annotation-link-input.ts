import {
  isAnnotationRelationshipType,
  type AnnotationRelationshipType,
} from "@/domain/entities/annotation-link";
import { ValidationError } from "@/application/errors";

export interface AnnotationLinkFieldsInput {
  relationshipType?: string;
  notes?: string;
}

export interface ValidatedAnnotationLinkFields {
  relationshipType: AnnotationRelationshipType;
  notes?: string;
}

/**
 * Validate a link's editable fields: the relationship type must be known, and
 * notes are trimmed (a blank is dropped). Identity/duplicate/existence checks live
 * in the create use case (they need the repository + context reader).
 */
export function validateAnnotationLinkFields(
  input: AnnotationLinkFieldsInput,
): ValidatedAnnotationLinkFields {
  const relationshipType = input.relationshipType ?? "";
  if (!isAnnotationRelationshipType(relationshipType)) {
    throw new ValidationError(
      "Please choose how these annotations are related.",
      "relationshipType",
    );
  }
  const notes = (input.notes ?? "").trim();
  return {
    relationshipType,
    ...(notes.length > 0 ? { notes } : {}),
  };
}
