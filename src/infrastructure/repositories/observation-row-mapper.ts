import {
  isObservationKind,
  isValidObservationValue,
  type Observation,
} from "@/domain/entities/observation";
import { isValidDateOnly } from "@/domain/value-objects/date-only";

/**
 * A row as returned by SQLite for the `observations` table. Columns are
 * snake_case; `scale_name` and `notes` may be NULL.
 *
 * No Tauri import, so the mapping logic is unit-testable in a plain Node env.
 */
export interface ObservationRow {
  id: string;
  animal_id: string;
  observed_on: string;
  kind: string;
  value: number;
  scale_name: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Map a database row to a domain {@link Observation}, failing loudly on corrupt
 * data: an unrecognized kind, a malformed/impossible observed date, a value that
 * is invalid for the kind, or a motor score missing its required scale name.
 */
export function mapRowToObservation(row: ObservationRow): Observation {
  if (!isObservationKind(row.kind)) {
    throw new Error(
      `Observation ${row.id} has an unrecognized kind: ${String(row.kind)}`,
    );
  }

  const observedOn = row.observed_on?.trim() ?? "";
  if (!isValidDateOnly(observedOn)) {
    throw new Error(
      `Observation ${row.id} has an invalid observed date: ${String(row.observed_on)}`,
    );
  }

  if (!isValidObservationValue(row.kind, row.value)) {
    throw new Error(
      `Observation ${row.id} has an invalid value for ${row.kind}: ${String(row.value)}`,
    );
  }

  const notes = row.notes?.trim() ?? "";

  if (row.kind === "motor_score") {
    const scaleName = row.scale_name?.trim() ?? "";
    if (scaleName.length === 0) {
      throw new Error(
        `Observation ${row.id} is a motor score but has no scale name`,
      );
    }
    return {
      id: row.id,
      animalId: row.animal_id,
      observedOn,
      kind: row.kind,
      value: row.value,
      scaleName,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      ...(notes.length > 0 ? { notes } : {}),
    };
  }

  return {
    id: row.id,
    animalId: row.animal_id,
    observedOn,
    kind: row.kind,
    value: row.value,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(notes.length > 0 ? { notes } : {}),
  };
}
