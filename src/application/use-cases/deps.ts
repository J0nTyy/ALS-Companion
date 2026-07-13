import type {
  StudyReader,
  StudyRepository,
} from "@/application/ports/study-repository";
import type {
  AnimalReader,
  AnimalRepository,
} from "@/application/ports/animal-repository";
import type { ObservationRepository } from "@/application/ports/observation-repository";
import type {
  TimelineEventReader,
  TimelineEventRepository,
} from "@/application/ports/timeline-event-repository";
import type {
  ProtocolTemplateReader,
  ProtocolTemplateRepository,
} from "@/application/ports/protocol-template-repository";
import type {
  MRISessionReader,
  MRISessionRepository,
} from "@/application/ports/mri-session-repository";
import type { ResearchAssetRepository } from "@/application/ports/research-asset-repository";
import type { StorageRepository } from "@/application/ports/storage-repository";
import type { AnnotationRepository } from "@/application/ports/annotation-repository";
import type { AnnotationLinkRepository } from "@/application/ports/annotation-link-repository";
import type { AnnotationContextReader } from "@/application/ports/annotation-context-reader";
import type {
  FilePicker,
  FileStore,
} from "@/application/ports/file-storage";
import type {
  AnimalSearchReader,
  MriSessionSearchReader,
  ObservationSearchReader,
  ProtocolTemplateSearchReader,
  ResearchAssetSearchReader,
  StudySearchReader,
  TimelineEventSearchReader,
} from "@/application/ports/search";
import type { CalendarDate } from "@/application/ports/calendar";
import type { Clock, IdGenerator } from "@/application/ports/system";

/**
 * The collaborators every study use case needs. Bundling them keeps use-case
 * signatures small and makes wiring (and test doubles) explicit.
 */
export interface StudyUseCaseDeps {
  repository: StudyRepository;
  clock: Clock;
  ids: IdGenerator;
}

/**
 * The collaborators every animal use case needs. Reuses Clock and IdGenerator,
 * plus a read-only view of studies (to check the parent exists and is active)
 * and the local calendar (for future-date validation).
 */
export interface AnimalUseCaseDeps {
  repository: AnimalRepository;
  studies: StudyReader;
  calendar: CalendarDate;
  clock: Clock;
  ids: IdGenerator;
}

/**
 * Animal creation additionally seeds the new animal's timeline from the study's
 * protocol. It reads protocol steps and writes timeline events, so it needs those
 * two extra collaborators on top of the base animal deps.
 */
export interface AnimalCreationDeps extends AnimalUseCaseDeps {
  protocols: ProtocolTemplateReader;
  timelineEvents: TimelineEventRepository;
}

/**
 * The collaborators every protocol-template use case needs. Reuses Clock and
 * IdGenerator, plus a read-only view of studies to keep an archived study's
 * protocol read-only (consistent with the rest of the app).
 */
export interface ProtocolTemplateUseCaseDeps {
  repository: ProtocolTemplateRepository;
  studies: StudyReader;
  clock: Clock;
  ids: IdGenerator;
}

/**
 * The collaborators every MRI-session use case needs. A session hangs off a
 * timeline event, so writable-parent checks walk the chain
 * `TimelineEvent → Animal → Study` through narrow read-only ports: the event must
 * exist, its animal must exist, and its study must not be archived.
 */
export interface MriSessionUseCaseDeps {
  repository: MRISessionRepository;
  timelineEvents: TimelineEventReader;
  animals: AnimalReader;
  studies: StudyReader;
  clock: Clock;
  ids: IdGenerator;
}

/**
 * The collaborators every research-asset use case needs. An asset is metadata
 * describing a scientific file (never the file itself) and hangs off a
 * polymorphic owner. For the only owner type today ("mri_session") the
 * writable-parent check walks the chain
 * `MRISession → TimelineEvent → Animal → Study` through narrow read-only ports:
 * the owner must exist and its study must not be archived.
 */
export interface ResearchAssetUseCaseDeps {
  repository: ResearchAssetRepository;
  mriSessions: MRISessionReader;
  timelineEvents: TimelineEventReader;
  animals: AnimalReader;
  studies: StudyReader;
  clock: Clock;
  ids: IdGenerator;
}

/**
 * The collaborators the image-storage use cases need. Attaching a file copies it
 * into managed storage (`fileStore`), records a {@link StoredFile} row
 * (`storage`), and flips the owning research asset to "attached" (`researchAssets`,
 * a SYSTEM-controlled transition done only after a successful copy). The
 * MRISession → TimelineEvent → Animal → Study readers back the writable-owner
 * check (archived studies stay read-only), reusing `loadWritableAssetOwner`.
 */
export interface StorageUseCaseDeps {
  storage: StorageRepository;
  fileStore: FileStore;
  filePicker: FilePicker;
  researchAssets: ResearchAssetRepository;
  mriSessions: MRISessionReader;
  timelineEvents: TimelineEventReader;
  animals: AnimalReader;
  studies: StudyReader;
  clock: Clock;
  ids: IdGenerator;
}

/**
 * The collaborators every annotation use case needs. An annotation is drawn on a
 * {@link StoredFile}, so the writable-parent check walks the chain
 * `StoredFile → ResearchAsset → MRISession → TimelineEvent → Animal → Study`
 * through narrow read-only ports: the stored file and its research asset must
 * exist, and (reusing `loadWritableAssetOwner`) the owning study must not be
 * archived. `storage` and `researchAssets` resolve the first two hops.
 */
export interface AnnotationUseCaseDeps {
  repository: AnnotationRepository;
  storage: StorageRepository;
  researchAssets: ResearchAssetRepository;
  mriSessions: MRISessionReader;
  timelineEvents: TimelineEventReader;
  animals: AnimalReader;
  studies: StudyReader;
  /** Links FK-reference annotations, so deleting an annotation removes its links first. */
  annotationLinks: AnnotationLinkRepository;
  clock: Clock;
  ids: IdGenerator;
}

/**
 * The collaborators every annotation-LINK use case needs (v1.7). Longitudinal links
 * are researcher-created relationships between annotations; the context reader
 * resolves each annotation's study/animal/session/date (for display, ordering, and
 * the archived-study read-only check) without a new table.
 */
export interface AnnotationLinkUseCaseDeps {
  repository: AnnotationLinkRepository;
  context: AnnotationContextReader;
  clock: Clock;
  ids: IdGenerator;
}

/**
 * The collaborators the global search needs: one narrow read-only search reader
 * per searchable entity (Interface Segregation). The SearchService composes these
 * to fan a query out across the whole workspace. Registering a new searchable
 * entity means adding its reader here — no other deps bundle changes.
 */
export interface SearchUseCaseDeps {
  studies: StudySearchReader;
  animals: AnimalSearchReader;
  protocols: ProtocolTemplateSearchReader;
  timelineEvents: TimelineEventSearchReader;
  mriSessions: MriSessionSearchReader;
  observations: ObservationSearchReader;
  researchAssets: ResearchAssetSearchReader;
}

/**
 * The collaborators every observation use case needs. Reads through narrow
 * animal/study views to verify the parent animal exists, belongs to the expected
 * study, and that the study is not archived, before writing.
 */
export interface ObservationUseCaseDeps {
  repository: ObservationRepository;
  animals: AnimalReader;
  studies: StudyReader;
  calendar: CalendarDate;
  clock: Clock;
  ids: IdGenerator;
}

/**
 * The collaborators every timeline-event use case needs. Like observations, it
 * verifies the parent animal exists, belongs to the expected study, and that the
 * study is not archived, before writing. No calendar: planned events are
 * legitimately future-dated, so timeline dates are not checked against "today".
 */
export interface TimelineEventUseCaseDeps {
  repository: TimelineEventRepository;
  animals: AnimalReader;
  studies: StudyReader;
  clock: Clock;
  ids: IdGenerator;
}
