import { isStudyStatus, type Study } from "@/domain/entities/study";

/**
 * A row as returned by SQLite for the `studies` table. Columns are snake_case
 * and `description` may be NULL.
 *
 * This module deliberately has **no** Tauri import so the mapping logic can be
 * unit-tested in a plain Node environment.
 */
export interface StudyRow {
  id: string;
  name: string;
  description: string | null;
  strain: string;
  status: string;
  created_at: string;
  updated_at: string;
}

/**
 * Map a database row to a domain {@link Study}.
 *
 * - snake_case columns become camelCase fields.
 * - a NULL/empty description is omitted (not stored as an empty string).
 * - an unrecognized status throws, so corrupt data surfaces loudly rather than
 *   being silently coerced.
 */
export function mapRowToStudy(row: StudyRow): Study {
  if (!isStudyStatus(row.status)) {
    throw new Error(
      `Study ${row.id} has an unrecognized status: ${String(row.status)}`,
    );
  }

  const description = row.description?.trim() ?? "";

  return {
    id: row.id,
    name: row.name,
    strain: row.strain,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(description.length > 0 ? { description } : {}),
  };
}
