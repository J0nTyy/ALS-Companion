import type { ProtocolTemplate } from "@/domain/entities/protocol-template";
import type { ProtocolTemplateRepository } from "@/application/ports/protocol-template-repository";
import type { StudyReader } from "@/application/ports/study-repository";
import { NotFoundError } from "@/application/errors";
import { assertStudyWritable } from "./assert-study-writable";

/**
 * Load a protocol template and confirm its study can be written to (used before
 * any protocol mutation).
 *
 * @throws NotFoundError if the template is missing.
 * @throws StudyArchivedError if the template's study is archived — archived
 *   studies keep a read-only protocol, consistent with the rest of the app.
 */
export async function loadWritableTemplate(
  deps: { repository: ProtocolTemplateRepository; studies: StudyReader },
  templateId: string,
): Promise<ProtocolTemplate> {
  const template = await deps.repository.getTemplateById(templateId);
  if (!template) {
    throw new NotFoundError("That protocol could not be found.");
  }
  await assertStudyWritable(deps.studies, template.studyId);
  return template;
}
