import type { StudyRepository } from "@/application/ports/study-repository";
import type { AnimalRepository } from "@/application/ports/animal-repository";
import type { ObservationRepository } from "@/application/ports/observation-repository";
import type { TimelineEventRepository } from "@/application/ports/timeline-event-repository";
import type { MRISessionRepository } from "@/application/ports/mri-session-repository";
import type { ResearchAssetRepository } from "@/application/ports/research-asset-repository";
import type { StorageRepository } from "@/application/ports/storage-repository";
import type { ProtocolTemplateRepository } from "@/application/ports/protocol-template-repository";
import type { AnnotationRepository } from "@/application/ports/annotation-repository";
import type { AnnotationLinkRepository } from "@/application/ports/annotation-link-repository";
import type { FileStore } from "@/application/ports/file-storage";

/**
 * Collaborators for cascading deletes (v1.4). Foreign keys are enforced at runtime
 * (no `ON DELETE CASCADE` in the frozen schema), so deletions must run **bottom-up**
 * in the application layer. All are existing repository ports plus the FileStore
 * (to remove attached image files from disk after their rows are gone).
 */
export interface DeletionDeps {
  studies: StudyRepository;
  animals: AnimalRepository;
  observations: ObservationRepository;
  timelineEvents: TimelineEventRepository;
  mriSessions: MRISessionRepository;
  researchAssets: ResearchAssetRepository;
  storage: StorageRepository;
  annotations: AnnotationRepository;
  annotationLinks: AnnotationLinkRepository;
  protocols: ProtocolTemplateRepository;
  fileStore: FileStore;
}

/**
 * Permanently deletes a study or any part of one, cascading to descendants and
 * removing attached image files from disk.
 *
 * This is the owner-authorized reversal (v1.4) of the app's former "research
 * records are never deleted" rule. Presentation gates every call behind an explicit
 * confirmation. Deletes run children-first so runtime foreign keys stay satisfied;
 * image-file removal is best-effort and runs only after the database rows are gone.
 */
export interface DeletionService {
  deleteStudy(id: string): Promise<void>;
  deleteAnimal(id: string): Promise<void>;
  deleteTimelineEvent(id: string): Promise<void>;
  deleteMriSession(id: string): Promise<void>;
  deleteResearchAsset(id: string): Promise<void>;
  deleteObservation(id: string): Promise<void>;
}

export function createDeletionService(deps: DeletionDeps): DeletionService {
  /**
   * Delete an asset's stored-file rows (and each file's annotations first, since
   * annotations FK-reference a stored file); return their relative paths for disk
   * cleanup.
   */
  async function purgeAsset(assetId: string): Promise<string[]> {
    const files = await deps.storage.listByAsset(assetId);
    for (const f of files) {
      const annotations = await deps.annotations.listByStoredFile(f.id);
      for (const a of annotations) {
        // Links FK-reference the annotation — remove them before the annotation.
        await deps.annotationLinks.deleteForAnnotation(a.id);
        await deps.annotations.delete(a.id);
      }
      await deps.storage.delete(f.id);
    }
    await deps.researchAssets.delete(assetId);
    return files.map((f) => f.relativePath);
  }

  async function purgeSession(sessionId: string): Promise<string[]> {
    const assets = await deps.researchAssets.listByOwner(
      "mri_session",
      sessionId,
    );
    const paths: string[] = [];
    for (const a of assets) paths.push(...(await purgeAsset(a.id)));
    await deps.mriSessions.delete(sessionId);
    return paths;
  }

  async function purgeEvent(eventId: string): Promise<string[]> {
    const sessions = await deps.mriSessions.listByTimelineEvent(eventId);
    const paths: string[] = [];
    for (const s of sessions) paths.push(...(await purgeSession(s.id)));
    await deps.timelineEvents.delete(eventId);
    return paths;
  }

  async function purgeAnimal(animalId: string): Promise<string[]> {
    const [events, observations] = await Promise.all([
      deps.timelineEvents.listByAnimal(animalId),
      deps.observations.listByAnimal(animalId),
    ]);
    const paths: string[] = [];
    for (const e of events) paths.push(...(await purgeEvent(e.id)));
    for (const o of observations) await deps.observations.delete(o.id);
    await deps.animals.delete(animalId);
    return paths;
  }

  async function purgeStudy(studyId: string): Promise<string[]> {
    const animals = await deps.animals.listByStudy(studyId);
    const paths: string[] = [];
    for (const a of animals) paths.push(...(await purgeAnimal(a.id)));

    const template = await deps.protocols.findByStudy(studyId);
    if (template) {
      const steps = await deps.protocols.listStepsByTemplate(template.id);
      for (const step of steps) await deps.protocols.deleteStep(step.id);
      await deps.protocols.deleteTemplate(template.id);
    }

    await deps.studies.delete(studyId);
    return paths;
  }

  /** Remove image files after their rows are gone — best-effort, never fails the delete. */
  async function removeFiles(paths: string[]): Promise<void> {
    if (paths.length === 0) return;
    try {
      await deps.fileStore.remove(paths);
    } catch {
      // The rows are already deleted; leaving an orphaned file is acceptable.
    }
  }

  return {
    async deleteStudy(id) {
      await removeFiles(await purgeStudy(id));
    },
    async deleteAnimal(id) {
      await removeFiles(await purgeAnimal(id));
    },
    async deleteTimelineEvent(id) {
      await removeFiles(await purgeEvent(id));
    },
    async deleteMriSession(id) {
      await removeFiles(await purgeSession(id));
    },
    async deleteResearchAsset(id) {
      await removeFiles(await purgeAsset(id));
    },
    async deleteObservation(id) {
      await deps.observations.delete(id);
    },
  };
}
