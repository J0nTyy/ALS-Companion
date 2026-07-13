import type { Study } from "@/domain/entities/study";
import type { Animal } from "@/domain/entities/animal";
import type { Observation } from "@/domain/entities/observation";
import type { TimelineEvent } from "@/domain/entities/timeline-event";
import type { MRISession } from "@/domain/entities/mri-session";
import type { ResearchAsset } from "@/domain/entities/research-asset";
import type { StoredFile } from "@/domain/entities/stored-file";
import type {
  ProtocolStep,
  ProtocolWithSteps,
} from "@/domain/entities/protocol-template";
import type { Annotation } from "@/domain/entities/annotation";
import type { AnnotationLink } from "@/domain/entities/annotation-link";
import type { WorkspaceStudyContents } from "@/application/use-cases/publication/publication-package";

const T = "2026-07-13T00:00:00.000Z";

export const study = (over: Partial<Study> = {}): Study => ({
  id: "s1",
  name: "Study A",
  strain: "SOD1-G93A",
  status: "active",
  createdAt: T,
  updatedAt: T,
  ...over,
});

export const animal = (id: string, over: Partial<Animal> = {}): Animal => ({
  id,
  studyId: "s1",
  animalIdentifier: id.toUpperCase(),
  sex: "unknown",
  createdAt: T,
  updatedAt: T,
  ...over,
});

export const observation = (
  id: string,
  animalId: string,
  over: Partial<Observation> = {},
): Observation => ({
  id,
  animalId,
  observedOn: "2026-07-10",
  kind: "body_weight",
  value: 24,
  createdAt: T,
  updatedAt: T,
  ...over,
});

export const event = (
  id: string,
  animalId: string,
  over: Partial<TimelineEvent> = {},
): TimelineEvent => ({
  id,
  animalId,
  title: "Event",
  category: "mri",
  status: "completed",
  createdAt: T,
  updatedAt: T,
  ...over,
});

export const session = (
  id: string,
  timelineEventId: string,
  over: Partial<MRISession> = {},
): MRISession => ({
  id,
  timelineEventId,
  title: "MRI",
  modality: "mri",
  acquisitionDate: "2026-07-10",
  createdAt: T,
  updatedAt: T,
  ...over,
});

export const asset = (
  id: string,
  ownerId: string,
  over: Partial<ResearchAsset> = {},
): ResearchAsset => ({
  id,
  ownerType: "mri_session",
  ownerId,
  assetType: "mri_image",
  title: "Asset",
  status: "attached",
  createdAt: T,
  updatedAt: T,
  ...over,
});

export const file = (
  id: string,
  researchAssetId: string,
  over: Partial<StoredFile> = {},
): StoredFile => ({
  id,
  researchAssetId,
  storageType: "local_managed",
  relativePath: `images/${id}.png`,
  originalName: `${id}.png`,
  mimeType: "image/png",
  createdAt: T,
  ...over,
});

export const step = (id: string): ProtocolStep => ({
  id,
  protocolTemplateId: "pt1",
  title: "Step",
  category: "mri",
  offsetDays: 0,
  displayOrder: 0,
  createdAt: T,
  updatedAt: T,
});

export const protocol = (): ProtocolWithSteps => ({
  template: { id: "pt1", studyId: "s1", name: "Protocol", createdAt: T, updatedAt: T },
  steps: [step("st1"), step("st2")],
});

export const annotation = (
  id: string,
  storedFileId: string,
  over: Partial<Annotation> = {},
): Annotation => ({
  id,
  storedFileId,
  annotationType: "point",
  geometry: { kind: "point", x: 0.5, y: 0.5 },
  createdAt: T,
  updatedAt: T,
  ...over,
});

export const annotationLink = (
  id: string,
  source: string,
  target: string,
): AnnotationLink => ({
  id,
  sourceAnnotationId: source,
  targetAnnotationId: target,
  relationshipType: "follow_up",
  createdAt: T,
});

/** A study with two animals and one of each descendant, for selection/assembly tests. */
export function sampleContents(): WorkspaceStudyContents {
  return {
    study: study(),
    protocol: protocol(),
    animals: [animal("a1"), animal("a2")],
    timelineEvents: [event("e1", "a1"), event("e2", "a2")],
    observations: [observation("o1", "a1"), observation("o2", "a2")],
    mriSessions: [session("m1", "e1")],
    researchAssets: [asset("r1", "m1"), asset("r2", "m1")],
    storedFiles: [file("f1", "r1"), file("f2", "r2")],
    // an1 on f1 (asset r1), an2 on f2 (asset r2); linked to each other.
    annotations: [annotation("an1", "f1"), annotation("an2", "f2")],
    annotationLinks: [annotationLink("ln1", "an1", "an2")],
  };
}
