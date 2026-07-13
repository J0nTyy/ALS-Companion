import type { ResearchAssetOwnerType } from "@/domain/entities/research-asset";
import type { AnimalReader } from "@/application/ports/animal-repository";
import type { StudyReader } from "@/application/ports/study-repository";
import type { TimelineEventReader } from "@/application/ports/timeline-event-repository";
import type { MRISessionReader } from "@/application/ports/mri-session-repository";
import type { HistologySessionReader } from "@/application/ports/histology-session-repository";
import { NotFoundError } from "@/application/errors";
import { loadWritableTimelineEvent } from "./load-writable-timeline-event";

/**
 * Confirm that a research asset's owner exists and can be written to (used before
 * creating or editing an asset). Dispatches on the polymorphic `ownerType`.
 *
 * Both imaging owner types today ("mri_session" and "histology_session") walk the
 * same parent chain `Session → TimelineEvent → Animal → Study`, reusing
 * {@link loadWritableTimelineEvent}: the session must exist, its timeline event and
 * animal must exist, and the animal's study must not be archived.
 *
 * Adding a future owner type is a new `case` here — the rest of the asset use cases
 * are owner-agnostic.
 *
 * @throws NotFoundError if the owner (or any parent in its chain) is missing.
 * @throws StudyArchivedError if the owning study is archived.
 */
export async function loadWritableAssetOwner(
  deps: {
    mriSessions: MRISessionReader;
    histologySessions: HistologySessionReader;
    timelineEvents: TimelineEventReader;
    animals: AnimalReader;
    studies: StudyReader;
  },
  ownerType: ResearchAssetOwnerType,
  ownerId: string,
): Promise<void> {
  switch (ownerType) {
    case "mri_session": {
      const session = await deps.mriSessions.getById(ownerId);
      if (!session) {
        throw new NotFoundError("That MRI session could not be found.");
      }
      await loadWritableTimelineEvent(deps, session.timelineEventId);
      return;
    }
    case "histology_session": {
      const session = await deps.histologySessions.getById(ownerId);
      if (!session) {
        throw new NotFoundError("That histology session could not be found.");
      }
      await loadWritableTimelineEvent(deps, session.timelineEventId);
      return;
    }
  }
}
