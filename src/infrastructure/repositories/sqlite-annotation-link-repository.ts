import type { AnnotationLink } from "@/domain/entities/annotation-link";
import type { AnnotationLinkRepository } from "@/application/ports/annotation-link-repository";
import { getDatabase } from "@/infrastructure/db/database";
import {
  mapRowToAnnotationLink,
  type AnnotationLinkRow,
} from "./annotation-link-row-mapper";

const COLUMNS =
  "id, source_annotation_id, target_annotation_id, relationship_type, notes, created_at";

/**
 * SQLite-backed {@link AnnotationLinkRepository}. Parameterized statements only;
 * links are researcher-created rows (no inference). `delete` is idempotent.
 */
export class SqliteAnnotationLinkRepository implements AnnotationLinkRepository {
  async listByAnnotation(annotationId: string): Promise<AnnotationLink[]> {
    const db = await getDatabase();
    const rows = await db.select<AnnotationLinkRow[]>(
      `SELECT ${COLUMNS} FROM annotation_links
       WHERE source_annotation_id = $1 OR target_annotation_id = $1
       ORDER BY created_at ASC`,
      [annotationId],
    );
    return rows.map(mapRowToAnnotationLink);
  }

  async listForAnnotations(
    annotationIds: readonly string[],
  ): Promise<AnnotationLink[]> {
    if (annotationIds.length === 0) return [];
    const db = await getDatabase();
    const placeholders = annotationIds.map((_, i) => `$${i + 1}`).join(", ");
    const rows = await db.select<AnnotationLinkRow[]>(
      `SELECT ${COLUMNS} FROM annotation_links
       WHERE source_annotation_id IN (${placeholders})
          OR target_annotation_id IN (${placeholders})
       ORDER BY created_at ASC`,
      [...annotationIds, ...annotationIds],
    );
    return rows.map(mapRowToAnnotationLink);
  }

  async findBetween(
    annotationIdA: string,
    annotationIdB: string,
  ): Promise<AnnotationLink | null> {
    const db = await getDatabase();
    const rows = await db.select<AnnotationLinkRow[]>(
      `SELECT ${COLUMNS} FROM annotation_links
       WHERE (source_annotation_id = $1 AND target_annotation_id = $2)
          OR (source_annotation_id = $2 AND target_annotation_id = $1)
       LIMIT 1`,
      [annotationIdA, annotationIdB],
    );
    const row = rows[0];
    return row ? mapRowToAnnotationLink(row) : null;
  }

  async getById(id: string): Promise<AnnotationLink | null> {
    const db = await getDatabase();
    const rows = await db.select<AnnotationLinkRow[]>(
      `SELECT ${COLUMNS} FROM annotation_links WHERE id = $1`,
      [id],
    );
    const row = rows[0];
    return row ? mapRowToAnnotationLink(row) : null;
  }

  async create(link: AnnotationLink): Promise<void> {
    const db = await getDatabase();
    await db.execute(
      `INSERT INTO annotation_links
         (id, source_annotation_id, target_annotation_id, relationship_type,
          notes, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        link.id,
        link.sourceAnnotationId,
        link.targetAnnotationId,
        link.relationshipType,
        link.notes ?? null,
        link.createdAt,
      ],
    );
  }

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.execute(`DELETE FROM annotation_links WHERE id = $1`, [id]);
  }

  async deleteForAnnotation(annotationId: string): Promise<void> {
    const db = await getDatabase();
    await db.execute(
      `DELETE FROM annotation_links
       WHERE source_annotation_id = $1 OR target_annotation_id = $1`,
      [annotationId],
    );
  }
}
