import {
  serializeAnnotationGeometry,
  type Annotation,
} from "@/domain/entities/annotation";
import type { AnnotationRepository } from "@/application/ports/annotation-repository";
import { NotFoundError } from "@/application/errors";
import { getDatabase } from "@/infrastructure/db/database";
import {
  mapRowToAnnotation,
  type AnnotationRow,
} from "./annotation-row-mapper";

const COLUMNS =
  "id, stored_file_id, annotation_type, label, geometry, notes, created_at, updated_at";

const ANNOTATION_NOT_FOUND = "That annotation could not be found.";

/**
 * SQLite-backed {@link AnnotationRepository} using the Tauri SQL plugin.
 *
 * `geometry` is stored as one serialized string column, so new annotation shapes
 * need no schema change. All statements are parameterized. Listing is oldest-first
 * (stable draw order). `update` inspects `rowsAffected` and throws
 * {@link NotFoundError} when nothing changed; `delete` is idempotent.
 */
export class SqliteAnnotationRepository implements AnnotationRepository {
  async listByStoredFile(storedFileId: string): Promise<Annotation[]> {
    const db = await getDatabase();
    const rows = await db.select<AnnotationRow[]>(
      `SELECT ${COLUMNS} FROM annotations
       WHERE stored_file_id = $1
       ORDER BY created_at ASC`,
      [storedFileId],
    );
    return rows.map(mapRowToAnnotation);
  }

  async getById(id: string): Promise<Annotation | null> {
    const db = await getDatabase();
    const rows = await db.select<AnnotationRow[]>(
      `SELECT ${COLUMNS} FROM annotations WHERE id = $1`,
      [id],
    );
    const row = rows[0];
    return row ? mapRowToAnnotation(row) : null;
  }

  async create(annotation: Annotation): Promise<void> {
    const db = await getDatabase();
    await db.execute(
      `INSERT INTO annotations
         (id, stored_file_id, annotation_type, label, geometry, notes,
          created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        annotation.id,
        annotation.storedFileId,
        annotation.annotationType,
        annotation.label ?? null,
        serializeAnnotationGeometry(annotation.geometry),
        annotation.notes ?? null,
        annotation.createdAt,
        annotation.updatedAt,
      ],
    );
  }

  async update(annotation: Annotation): Promise<void> {
    const db = await getDatabase();
    const result = await db.execute(
      `UPDATE annotations
         SET annotation_type = $1, label = $2, geometry = $3, notes = $4,
             updated_at = $5
       WHERE id = $6`,
      [
        annotation.annotationType,
        annotation.label ?? null,
        serializeAnnotationGeometry(annotation.geometry),
        annotation.notes ?? null,
        annotation.updatedAt,
        annotation.id,
      ],
    );
    if (result.rowsAffected === 0) {
      throw new NotFoundError(ANNOTATION_NOT_FOUND);
    }
  }

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.execute(`DELETE FROM annotations WHERE id = $1`, [id]);
  }
}
