import type {
  ProtocolStep,
  ProtocolTemplate,
} from "@/domain/entities/protocol-template";
import type { ProtocolTemplateRepository } from "@/application/ports/protocol-template-repository";
import type {
  ProtocolTemplateSearchReader,
  SearchHit,
} from "@/application/ports/search";
import type { SearchQuery } from "@/domain/entities/search";
import { NotFoundError } from "@/application/errors";
import { getDatabase } from "@/infrastructure/db/database";
import { protocolTemplateHit } from "@/application/use-cases/search/search-hit";
import {
  mapRowToProtocolStep,
  mapRowToProtocolTemplate,
  type ProtocolStepRow,
  type ProtocolTemplateRow,
} from "./protocol-template-row-mapper";
import { SearchConditionBuilder, SEARCH_PER_TYPE_LIMIT } from "./search-sql";

const TEMPLATE_COLUMNS = "id, study_id, name, created_at, updated_at";
const STEP_COLUMNS =
  "id, protocol_template_id, title, category, offset_days, notes, display_order, created_at, updated_at";

const TEMPLATE_NOT_FOUND = "That protocol could not be found.";
const STEP_NOT_FOUND = "That protocol step could not be found.";

/**
 * SQLite-backed {@link ProtocolTemplateRepository} using the Tauri SQL plugin.
 *
 * All statements are parameterized. Steps are always returned in `display_order`.
 * `updateTemplate`, `updateStep`, and `deleteStep` inspect `rowsAffected` and
 * throw {@link NotFoundError} when nothing matched.
 */
export class SqliteProtocolTemplateRepository
  implements ProtocolTemplateRepository, ProtocolTemplateSearchReader
{
  async searchProtocolTemplates(query: SearchQuery): Promise<SearchHit[]> {
    const c = new SearchConditionBuilder();
    c.text(["pt.name"], query.text);
    c.eq("pt.study_id", query.filters.studyId);
    if (!c.hasUserConditions()) return [];

    const db = await getDatabase();
    const rows = await db.select<
      Array<{ id: string; study_id: string; name: string; study_name: string }>
    >(
      `SELECT pt.id, pt.study_id, pt.name, s.name AS study_name
       FROM protocol_templates pt
       JOIN studies s ON s.id = pt.study_id
       ${c.whereSql()}
       ORDER BY pt.updated_at DESC LIMIT ${SEARCH_PER_TYPE_LIMIT}`,
      c.params,
    );
    return rows.map((r) =>
      protocolTemplateHit({
        id: r.id,
        studyId: r.study_id,
        name: r.name,
        studyName: r.study_name,
      }),
    );
  }

  async findByStudy(studyId: string): Promise<ProtocolTemplate | null> {
    const db = await getDatabase();
    const rows = await db.select<ProtocolTemplateRow[]>(
      `SELECT ${TEMPLATE_COLUMNS} FROM protocol_templates WHERE study_id = $1`,
      [studyId],
    );
    const row = rows[0];
    return row ? mapRowToProtocolTemplate(row) : null;
  }

  async getTemplateById(id: string): Promise<ProtocolTemplate | null> {
    const db = await getDatabase();
    const rows = await db.select<ProtocolTemplateRow[]>(
      `SELECT ${TEMPLATE_COLUMNS} FROM protocol_templates WHERE id = $1`,
      [id],
    );
    const row = rows[0];
    return row ? mapRowToProtocolTemplate(row) : null;
  }

  async createTemplate(template: ProtocolTemplate): Promise<void> {
    const db = await getDatabase();
    await db.execute(
      `INSERT INTO protocol_templates (id, study_id, name, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        template.id,
        template.studyId,
        template.name,
        template.createdAt,
        template.updatedAt,
      ],
    );
  }

  async updateTemplate(template: ProtocolTemplate): Promise<void> {
    const db = await getDatabase();
    const result = await db.execute(
      `UPDATE protocol_templates SET name = $1, updated_at = $2 WHERE id = $3`,
      [template.name, template.updatedAt, template.id],
    );
    if (result.rowsAffected === 0) {
      throw new NotFoundError(TEMPLATE_NOT_FOUND);
    }
  }

  async listStepsByTemplate(templateId: string): Promise<ProtocolStep[]> {
    const db = await getDatabase();
    const rows = await db.select<ProtocolStepRow[]>(
      `SELECT ${STEP_COLUMNS} FROM protocol_steps
       WHERE protocol_template_id = $1
       ORDER BY display_order ASC, created_at ASC`,
      [templateId],
    );
    return rows.map(mapRowToProtocolStep);
  }

  async listStepsByStudy(studyId: string): Promise<ProtocolStep[]> {
    const db = await getDatabase();
    const rows = await db.select<ProtocolStepRow[]>(
      `SELECT s.* FROM protocol_steps s
       JOIN protocol_templates t ON s.protocol_template_id = t.id
       WHERE t.study_id = $1
       ORDER BY s.display_order ASC, s.created_at ASC`,
      [studyId],
    );
    return rows.map(mapRowToProtocolStep);
  }

  async getStepById(id: string): Promise<ProtocolStep | null> {
    const db = await getDatabase();
    const rows = await db.select<ProtocolStepRow[]>(
      `SELECT ${STEP_COLUMNS} FROM protocol_steps WHERE id = $1`,
      [id],
    );
    const row = rows[0];
    return row ? mapRowToProtocolStep(row) : null;
  }

  async createStep(step: ProtocolStep): Promise<void> {
    const db = await getDatabase();
    await db.execute(
      `INSERT INTO protocol_steps
         (id, protocol_template_id, title, category, offset_days, notes,
          display_order, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        step.id,
        step.protocolTemplateId,
        step.title,
        step.category,
        step.offsetDays,
        step.notes ?? null,
        step.displayOrder,
        step.createdAt,
        step.updatedAt,
      ],
    );
  }

  async updateStep(step: ProtocolStep): Promise<void> {
    const db = await getDatabase();
    const result = await db.execute(
      `UPDATE protocol_steps
         SET title = $1, category = $2, offset_days = $3, notes = $4,
             display_order = $5, updated_at = $6
       WHERE id = $7`,
      [
        step.title,
        step.category,
        step.offsetDays,
        step.notes ?? null,
        step.displayOrder,
        step.updatedAt,
        step.id,
      ],
    );
    if (result.rowsAffected === 0) {
      throw new NotFoundError(STEP_NOT_FOUND);
    }
  }

  async deleteStep(id: string): Promise<void> {
    const db = await getDatabase();
    const result = await db.execute(
      `DELETE FROM protocol_steps WHERE id = $1`,
      [id],
    );
    if (result.rowsAffected === 0) {
      throw new NotFoundError(STEP_NOT_FOUND);
    }
  }

  async deleteTemplate(id: string): Promise<void> {
    const db = await getDatabase();
    await db.execute(`DELETE FROM protocol_templates WHERE id = $1`, [id]);
  }

  async reorderSteps(
    templateId: string,
    orderedStepIds: readonly string[],
    updatedAt: string,
  ): Promise<void> {
    const db = await getDatabase();
    for (let index = 0; index < orderedStepIds.length; index++) {
      await db.execute(
        `UPDATE protocol_steps
           SET display_order = $1, updated_at = $2
         WHERE id = $3 AND protocol_template_id = $4`,
        [index, updatedAt, orderedStepIds[index], templateId],
      );
    }
  }
}
