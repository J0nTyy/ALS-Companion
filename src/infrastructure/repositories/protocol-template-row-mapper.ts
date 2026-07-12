import { isTimelineEventCategory } from "@/domain/entities/timeline-event";
import {
  isValidOffsetDays,
  type ProtocolStep,
  type ProtocolTemplate,
} from "@/domain/entities/protocol-template";

/** A row as returned by SQLite for the `protocol_templates` table. */
export interface ProtocolTemplateRow {
  id: string;
  study_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

/** A row as returned by SQLite for the `protocol_steps` table. */
export interface ProtocolStepRow {
  id: string;
  protocol_template_id: string;
  title: string;
  category: string;
  offset_days: number;
  notes: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

/** Map a template row, failing loudly on an empty name. */
export function mapRowToProtocolTemplate(
  row: ProtocolTemplateRow,
): ProtocolTemplate {
  const name = row.name?.trim() ?? "";
  if (name.length === 0) {
    throw new Error(`Protocol template ${row.id} has an empty name`);
  }
  return {
    id: row.id,
    studyId: row.study_id,
    name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Map a step row, failing loudly on an empty title, an unrecognized category, or
 * an invalid offset (must be a non-negative integer).
 */
export function mapRowToProtocolStep(row: ProtocolStepRow): ProtocolStep {
  const title = row.title?.trim() ?? "";
  if (title.length === 0) {
    throw new Error(`Protocol step ${row.id} has an empty title`);
  }
  if (!isTimelineEventCategory(row.category)) {
    throw new Error(
      `Protocol step ${row.id} has an unrecognized category: ${String(row.category)}`,
    );
  }
  if (!isValidOffsetDays(row.offset_days)) {
    throw new Error(
      `Protocol step ${row.id} has an invalid offset: ${String(row.offset_days)}`,
    );
  }

  const notes = row.notes?.trim() ?? "";

  return {
    id: row.id,
    protocolTemplateId: row.protocol_template_id,
    title,
    category: row.category,
    offsetDays: row.offset_days,
    displayOrder: row.display_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(notes.length > 0 ? { notes } : {}),
  };
}
