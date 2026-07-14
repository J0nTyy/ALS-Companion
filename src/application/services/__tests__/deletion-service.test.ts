import { beforeEach, describe, expect, it } from "vitest";

import {
  createDeletionService,
  type DeletionDeps,
  type DeletionService,
} from "../deletion-service";
import type { StudyRepository } from "@/application/ports/study-repository";
import type { AnimalRepository } from "@/application/ports/animal-repository";
import type { ObservationRepository } from "@/application/ports/observation-repository";
import type { TimelineEventRepository } from "@/application/ports/timeline-event-repository";
import type { MRISessionRepository } from "@/application/ports/mri-session-repository";
import type { HistologySessionRepository } from "@/application/ports/histology-session-repository";
import type { BiomarkerSampleRepository } from "@/application/ports/biomarker-sample-repository";
import type { BiomarkerResultRepository } from "@/application/ports/biomarker-result-repository";
import type { ResearchAssetRepository } from "@/application/ports/research-asset-repository";
import type { StorageRepository } from "@/application/ports/storage-repository";
import type { ProtocolTemplateRepository } from "@/application/ports/protocol-template-repository";
import type { AnnotationRepository } from "@/application/ports/annotation-repository";
import type { FileStore } from "@/application/ports/file-storage";
import type { Study } from "@/domain/entities/study";
import type { Animal } from "@/domain/entities/animal";
import type { Observation } from "@/domain/entities/observation";
import type { TimelineEvent } from "@/domain/entities/timeline-event";
import type { MRISession } from "@/domain/entities/mri-session";
import type { HistologySession } from "@/domain/entities/histology-session";
import type { BiomarkerSample } from "@/domain/entities/biomarker-sample";
import type { BiomarkerResult } from "@/domain/entities/biomarker-result";
import type {
  ResearchAsset,
  ResearchAssetOwnerType,
} from "@/domain/entities/research-asset";
import type { StoredFile } from "@/domain/entities/stored-file";
import type {
  ProtocolStep,
  ProtocolTemplate,
} from "@/domain/entities/protocol-template";
import type { Annotation } from "@/domain/entities/annotation";
import type { AnnotationLink } from "@/domain/entities/annotation-link";
import type { AnnotationLinkRepository } from "@/application/ports/annotation-link-repository";

/**
 * A single shared in-memory dataset the fake repositories all read from and write
 * to — so the cascade behaves like a real relational graph. Deletes remove rows;
 * lists filter by parent id, exactly like the SQLite adapters.
 */
class MemoryDb {
  studies = new Map<string, Study>();
  animals = new Map<string, Animal>();
  observations = new Map<string, Observation>();
  events = new Map<string, TimelineEvent>();
  sessions = new Map<string, MRISession>();
  histologySessions = new Map<string, HistologySession>();
  biomarkerSamples = new Map<string, BiomarkerSample>();
  biomarkerResults = new Map<string, BiomarkerResult>();
  assets = new Map<string, ResearchAsset>();
  files = new Map<string, StoredFile>();
  annotations = new Map<string, Annotation>();
  annotationLinks = new Map<string, AnnotationLink>();
  templates = new Map<string, ProtocolTemplate>();
  steps = new Map<string, ProtocolStep>();
}

const T = "2026-07-13T00:00:00.000Z";

function makeStudyRepo(db: MemoryDb): StudyRepository {
  return {
    async list() {
      return [...db.studies.values()];
    },
    async getById(id) {
      return db.studies.get(id) ?? null;
    },
    async create(study) {
      db.studies.set(study.id, study);
    },
    async update(study) {
      db.studies.set(study.id, study);
    },
    async archive(id, updatedAt) {
      const s = db.studies.get(id);
      if (s) db.studies.set(id, { ...s, status: "archived", updatedAt });
    },
    async delete(id) {
      db.studies.delete(id);
    },
  };
}

function makeAnimalRepo(db: MemoryDb): AnimalRepository {
  return {
    async listByStudy(studyId) {
      return [...db.animals.values()].filter((a) => a.studyId === studyId);
    },
    async getById(id) {
      return db.animals.get(id) ?? null;
    },
    async findByIdentifier(studyId, animalIdentifier) {
      return (
        [...db.animals.values()].find(
          (a) =>
            a.studyId === studyId && a.animalIdentifier === animalIdentifier,
        ) ?? null
      );
    },
    async create(animal) {
      db.animals.set(animal.id, animal);
    },
    async update(animal) {
      db.animals.set(animal.id, animal);
    },
    async delete(id) {
      db.animals.delete(id);
    },
  };
}

function makeObservationRepo(db: MemoryDb): ObservationRepository {
  return {
    async listByAnimal(animalId) {
      return [...db.observations.values()].filter(
        (o) => o.animalId === animalId,
      );
    },
    async getById(id) {
      return db.observations.get(id) ?? null;
    },
    async create(observation) {
      db.observations.set(observation.id, observation);
    },
    async update(observation) {
      db.observations.set(observation.id, observation);
    },
    async delete(id) {
      db.observations.delete(id);
    },
  };
}

function makeTimelineRepo(db: MemoryDb): TimelineEventRepository {
  return {
    async listByAnimal(animalId) {
      return [...db.events.values()].filter((e) => e.animalId === animalId);
    },
    async getById(id) {
      return db.events.get(id) ?? null;
    },
    async create(event) {
      db.events.set(event.id, event);
    },
    async update(event) {
      db.events.set(event.id, event);
    },
    async delete(id) {
      db.events.delete(id);
    },
  };
}

function makeSessionRepo(db: MemoryDb): MRISessionRepository {
  return {
    async listByTimelineEvent(timelineEventId) {
      return [...db.sessions.values()].filter(
        (s) => s.timelineEventId === timelineEventId,
      );
    },
    async getById(id) {
      return db.sessions.get(id) ?? null;
    },
    async create(session) {
      db.sessions.set(session.id, session);
    },
    async update(session) {
      db.sessions.set(session.id, session);
    },
    async delete(id) {
      db.sessions.delete(id);
    },
  };
}

function makeHistologyRepo(db: MemoryDb): HistologySessionRepository {
  return {
    async listByTimelineEvent(timelineEventId) {
      return [...db.histologySessions.values()].filter(
        (s) => s.timelineEventId === timelineEventId,
      );
    },
    async getById(id) {
      return db.histologySessions.get(id) ?? null;
    },
    async create(session) {
      db.histologySessions.set(session.id, session);
    },
    async update(session) {
      db.histologySessions.set(session.id, session);
    },
    async delete(id) {
      db.histologySessions.delete(id);
    },
  };
}

function makeBiomarkerSampleRepo(db: MemoryDb): BiomarkerSampleRepository {
  return {
    async listByTimelineEvent(timelineEventId) {
      return [...db.biomarkerSamples.values()].filter(
        (s) => s.timelineEventId === timelineEventId,
      );
    },
    async getById(id) {
      return db.biomarkerSamples.get(id) ?? null;
    },
    async create(sample) {
      db.biomarkerSamples.set(sample.id, sample);
    },
    async update(sample) {
      db.biomarkerSamples.set(sample.id, sample);
    },
    async delete(id) {
      db.biomarkerSamples.delete(id);
    },
  };
}

function makeBiomarkerResultRepo(db: MemoryDb): BiomarkerResultRepository {
  return {
    async listBySample(biomarkerSampleId) {
      return [...db.biomarkerResults.values()].filter(
        (r) => r.biomarkerSampleId === biomarkerSampleId,
      );
    },
    async getById(id) {
      return db.biomarkerResults.get(id) ?? null;
    },
    async create(result) {
      db.biomarkerResults.set(result.id, result);
    },
    async update(result) {
      db.biomarkerResults.set(result.id, result);
    },
    async delete(id) {
      db.biomarkerResults.delete(id);
    },
  };
}

function makeAssetRepo(db: MemoryDb): ResearchAssetRepository {
  return {
    async listByOwner(ownerType: ResearchAssetOwnerType, ownerId) {
      return [...db.assets.values()].filter(
        (a) => a.ownerType === ownerType && a.ownerId === ownerId,
      );
    },
    async getById(id) {
      return db.assets.get(id) ?? null;
    },
    async create(asset) {
      db.assets.set(asset.id, asset);
    },
    async update(asset) {
      db.assets.set(asset.id, asset);
    },
    async delete(id) {
      db.assets.delete(id);
    },
  };
}

function makeStorageRepo(db: MemoryDb): StorageRepository {
  return {
    async listByAsset(researchAssetId) {
      return [...db.files.values()].filter(
        (f) => f.researchAssetId === researchAssetId,
      );
    },
    async getLatestByAsset(researchAssetId) {
      return (
        [...db.files.values()].find(
          (f) => f.researchAssetId === researchAssetId,
        ) ?? null
      );
    },
    async getById(id) {
      return db.files.get(id) ?? null;
    },
    async create(file) {
      db.files.set(file.id, file);
    },
    async delete(id) {
      db.files.delete(id);
    },
  };
}

function makeAnnotationRepo(db: MemoryDb): AnnotationRepository {
  return {
    async listByStoredFile(storedFileId) {
      return [...db.annotations.values()].filter(
        (a) => a.storedFileId === storedFileId,
      );
    },
    async getById(id) {
      return db.annotations.get(id) ?? null;
    },
    async create(annotation) {
      db.annotations.set(annotation.id, annotation);
    },
    async update(annotation) {
      db.annotations.set(annotation.id, annotation);
    },
    async delete(id) {
      db.annotations.delete(id);
    },
  };
}

function makeAnnotationLinkRepo(db: MemoryDb): AnnotationLinkRepository {
  const touches = (link: AnnotationLink, id: string) =>
    link.sourceAnnotationId === id || link.targetAnnotationId === id;
  return {
    async listByAnnotation(id) {
      return [...db.annotationLinks.values()].filter((l) => touches(l, id));
    },
    async listForAnnotations(ids) {
      return [...db.annotationLinks.values()].filter((l) =>
        ids.some((id) => touches(l, id)),
      );
    },
    async findBetween(a, b) {
      return (
        [...db.annotationLinks.values()].find(
          (l) => touches(l, a) && touches(l, b),
        ) ?? null
      );
    },
    async getById(id) {
      return db.annotationLinks.get(id) ?? null;
    },
    async create(link) {
      db.annotationLinks.set(link.id, link);
    },
    async delete(id) {
      db.annotationLinks.delete(id);
    },
    async deleteForAnnotation(id) {
      for (const [linkId, link] of db.annotationLinks) {
        if (touches(link, id)) db.annotationLinks.delete(linkId);
      }
    },
  };
}

function makeProtocolRepo(db: MemoryDb): ProtocolTemplateRepository {
  return {
    async listStepsByStudy(studyId) {
      const template = [...db.templates.values()].find(
        (t) => t.studyId === studyId,
      );
      if (!template) return [];
      return [...db.steps.values()].filter(
        (s) => s.protocolTemplateId === template.id,
      );
    },
    async findByStudy(studyId) {
      return (
        [...db.templates.values()].find((t) => t.studyId === studyId) ?? null
      );
    },
    async getTemplateById(id) {
      return db.templates.get(id) ?? null;
    },
    async createTemplate(template) {
      db.templates.set(template.id, template);
    },
    async updateTemplate(template) {
      db.templates.set(template.id, template);
    },
    async deleteTemplate(id) {
      db.templates.delete(id);
    },
    async listStepsByTemplate(templateId) {
      return [...db.steps.values()].filter(
        (s) => s.protocolTemplateId === templateId,
      );
    },
    async getStepById(id) {
      return db.steps.get(id) ?? null;
    },
    async createStep(step) {
      db.steps.set(step.id, step);
    },
    async updateStep(step) {
      db.steps.set(step.id, step);
    },
    async deleteStep(id) {
      db.steps.delete(id);
    },
    async reorderSteps() {
      // Not exercised by deletion.
    },
  };
}

/** Records what the file store was asked to remove, and the DB state at that moment. */
interface RecordingFileStore extends FileStore {
  readonly removed: string[];
  readonly filesInDbAtRemoveTime: number[];
  shouldThrow: boolean;
}

function makeFileStore(db: MemoryDb): RecordingFileStore {
  const removed: string[] = [];
  const filesInDbAtRemoveTime: number[] = [];
  return {
    removed,
    filesInDbAtRemoveTime,
    shouldThrow: false,
    async save() {},
    async readManagedBytes() {
      return new Uint8Array();
    },
    async resolveDisplayUrl(relativePath) {
      return `asset://${relativePath}`;
    },
    async remove(relativePaths) {
      filesInDbAtRemoveTime.push(db.files.size);
      if (this.shouldThrow) throw new Error("disk error");
      removed.push(...relativePaths);
    },
    async writeExportFiles() {},
  };
}

// ---------- entity factories ----------

function study(id: string): Study {
  return {
    id,
    name: `Study ${id}`,
    strain: "B6",
    status: "active",
    createdAt: T,
    updatedAt: T,
  };
}
function animal(id: string, studyId: string): Animal {
  return {
    id,
    studyId,
    animalIdentifier: id,
    sex: "unknown",
    createdAt: T,
    updatedAt: T,
  };
}
function observation(id: string, animalId: string): Observation {
  return {
    id,
    animalId,
    kind: "body_weight",
    observedOn: "2026-07-10",
    value: 20,
    createdAt: T,
    updatedAt: T,
  };
}
function event(
  id: string,
  animalId: string,
  category: TimelineEvent["category"] = "mri",
): TimelineEvent {
  return {
    id,
    animalId,
    title: `Event ${id}`,
    category,
    status: "planned",
    createdAt: T,
    updatedAt: T,
  };
}
function session(id: string, timelineEventId: string): MRISession {
  return {
    id,
    timelineEventId,
    title: `Session ${id}`,
    modality: "mri",
    acquisitionDate: "2026-07-10",
    createdAt: T,
    updatedAt: T,
  };
}
function asset(id: string, ownerId: string): ResearchAsset {
  return {
    id,
    ownerType: "mri_session",
    ownerId,
    assetType: "mri_image",
    title: `Asset ${id}`,
    status: "attached",
    createdAt: T,
    updatedAt: T,
  };
}
function histologySession(
  id: string,
  timelineEventId: string,
): HistologySession {
  return {
    id,
    timelineEventId,
    stain: "he",
    acquisitionDate: "2026-07-11",
    createdAt: T,
    updatedAt: T,
  };
}
function histologyAsset(id: string, ownerId: string): ResearchAsset {
  return {
    id,
    ownerType: "histology_session",
    ownerId,
    assetType: "histology_image",
    title: `Asset ${id}`,
    status: "attached",
    createdAt: T,
    updatedAt: T,
  };
}
function biomarkerSample(
  id: string,
  timelineEventId: string,
): BiomarkerSample {
  return {
    id,
    timelineEventId,
    sampleType: "blood",
    collectionDate: "2026-07-11",
    createdAt: T,
    updatedAt: T,
  };
}
function biomarkerResult(
  id: string,
  biomarkerSampleId: string,
): BiomarkerResult {
  return {
    id,
    biomarkerSampleId,
    biomarkerName: "NfL",
    value: "45.2",
    createdAt: T,
  };
}
function file(id: string, researchAssetId: string): StoredFile {
  return {
    id,
    researchAssetId,
    storageType: "local_managed",
    relativePath: `images/${id}.png`,
    originalName: `${id}.png`,
    mimeType: "image/png",
    createdAt: T,
  };
}
function annotation(id: string, storedFileId: string): Annotation {
  return {
    id,
    storedFileId,
    annotationType: "point",
    geometry: { kind: "point", x: 0.5, y: 0.5 },
    createdAt: T,
    updatedAt: T,
  };
}
function template(id: string, studyId: string): ProtocolTemplate {
  return { id, studyId, name: "Protocol", createdAt: T, updatedAt: T };
}
function step(id: string, protocolTemplateId: string): ProtocolStep {
  return {
    id,
    protocolTemplateId,
    title: `Step ${id}`,
    category: "mri",
    offsetDays: 0,
    displayOrder: 0,
    createdAt: T,
    updatedAt: T,
  };
}

// ---------- fixture graph ----------
//
// S1 ── protocol T1 (steps P1, P2)
//    ├─ A1 ── obs O1
//    │        ├─ E1 (mri) ── M1 ── AS1 ── F1, F2
//    │        │             └─ M2 ── AS2 ── F3
//    │        └─ E2 (non-mri, no sessions)
//    └─ A2 ── obs O2
//             └─ E3 (mri) ── M3 ── AS3 ── F4
//
// S2 ── A3 ── E4 (mri) ── M4 ── AS4 ── F5   (unrelated; must survive)

let db: MemoryDb;
let fileStore: RecordingFileStore;
let deps: DeletionDeps;
let svc: DeletionService;

beforeEach(() => {
  db = new MemoryDb();
  fileStore = makeFileStore(db);
  deps = {
    studies: makeStudyRepo(db),
    animals: makeAnimalRepo(db),
    observations: makeObservationRepo(db),
    timelineEvents: makeTimelineRepo(db),
    mriSessions: makeSessionRepo(db),
    histologySessions: makeHistologyRepo(db),
    biomarkerSamples: makeBiomarkerSampleRepo(db),
    biomarkerResults: makeBiomarkerResultRepo(db),
    researchAssets: makeAssetRepo(db),
    storage: makeStorageRepo(db),
    annotations: makeAnnotationRepo(db),
    annotationLinks: makeAnnotationLinkRepo(db),
    protocols: makeProtocolRepo(db),
    fileStore,
  };
  svc = createDeletionService(deps);

  db.studies.set("S1", study("S1"));
  db.templates.set("T1", template("T1", "S1"));
  db.steps.set("P1", step("P1", "T1"));
  db.steps.set("P2", step("P2", "T1"));

  db.animals.set("A1", animal("A1", "S1"));
  db.observations.set("O1", observation("O1", "A1"));
  db.events.set("E1", event("E1", "A1", "mri"));
  db.events.set("E2", event("E2", "A1", "gene_confirmation"));
  db.sessions.set("M1", session("M1", "E1"));
  db.sessions.set("M2", session("M2", "E1"));
  db.assets.set("AS1", asset("AS1", "M1"));
  db.assets.set("AS2", asset("AS2", "M2"));
  db.files.set("F1", file("F1", "AS1"));
  db.files.set("F2", file("F2", "AS1"));
  db.files.set("F3", file("F3", "AS2"));
  // Annotations hang off stored files (F1 has two, F3 has one).
  db.annotations.set("AN1", annotation("AN1", "F1"));
  db.annotations.set("AN2", annotation("AN2", "F1"));
  db.annotations.set("AN3", annotation("AN3", "F3"));
  // A longitudinal link between two of S1's annotations (must be purged with them).
  db.annotationLinks.set("LN1", {
    id: "LN1",
    sourceAnnotationId: "AN1",
    targetAnnotationId: "AN3",
    relationshipType: "follow_up",
    createdAt: T,
  });

  db.animals.set("A2", animal("A2", "S1"));
  db.observations.set("O2", observation("O2", "A2"));
  db.events.set("E3", event("E3", "A2", "mri"));
  db.sessions.set("M3", session("M3", "E3"));
  db.assets.set("AS3", asset("AS3", "M3"));
  db.files.set("F4", file("F4", "AS3"));

  db.studies.set("S2", study("S2"));
  db.animals.set("A3", animal("A3", "S2"));
  db.events.set("E4", event("E4", "A3", "mri"));
  db.sessions.set("M4", session("M4", "E4"));
  db.assets.set("AS4", asset("AS4", "M4"));
  db.files.set("F5", file("F5", "AS4"));
  db.annotations.set("AN4", annotation("AN4", "F5"));
});

describe("DeletionService.deleteStudy", () => {
  it("cascades to every descendant and removes all attached files", async () => {
    await svc.deleteStudy("S1");

    // Everything under S1 is gone.
    expect(db.studies.has("S1")).toBe(false);
    expect(db.templates.size).toBe(0);
    expect(db.steps.size).toBe(0);
    for (const id of ["A1", "A2"]) expect(db.animals.has(id)).toBe(false);
    for (const id of ["O1", "O2"]) expect(db.observations.has(id)).toBe(false);
    for (const id of ["E1", "E2", "E3"]) expect(db.events.has(id)).toBe(false);
    for (const id of ["M1", "M2", "M3"]) expect(db.sessions.has(id)).toBe(false);
    for (const id of ["AS1", "AS2", "AS3"]) expect(db.assets.has(id)).toBe(false);
    for (const id of ["F1", "F2", "F3", "F4"]) expect(db.files.has(id)).toBe(false);
    // Annotations on S1's stored files are gone too (they FK-reference the files).
    for (const id of ["AN1", "AN2", "AN3"])
      expect(db.annotations.has(id)).toBe(false);
    // And their longitudinal link (which FK-references the annotations).
    expect(db.annotationLinks.has("LN1")).toBe(false);

    // The unrelated study S2 is untouched.
    expect(db.studies.has("S2")).toBe(true);
    expect(db.animals.has("A3")).toBe(true);
    expect(db.sessions.has("M4")).toBe(true);
    expect(db.files.has("F5")).toBe(true);
    expect(db.annotations.has("AN4")).toBe(true);
  });

  it("removes exactly the four managed files of S1 (and not S2's)", async () => {
    await svc.deleteStudy("S1");
    expect([...fileStore.removed].sort()).toEqual(
      [
        "images/F1.png",
        "images/F2.png",
        "images/F3.png",
        "images/F4.png",
      ].sort(),
    );
    expect(fileStore.removed).not.toContain("images/F5.png");
  });

  it("removes files only after their database rows are gone", async () => {
    await svc.deleteStudy("S1");
    // The single remove() call happens after every file row was deleted, so only
    // S2's one surviving file remains in the DB at that moment.
    expect(fileStore.filesInDbAtRemoveTime).toEqual([1]);
  });
});

describe("DeletionService — partial deletes", () => {
  it("deleteResearchAsset removes the asset, its files, and their annotations only", async () => {
    await svc.deleteResearchAsset("AS1");
    expect(db.assets.has("AS1")).toBe(false);
    expect(db.files.has("F1")).toBe(false);
    expect(db.files.has("F2")).toBe(false);
    // F1's annotations are gone; F3's (a sibling asset's) survives.
    expect(db.annotations.has("AN1")).toBe(false);
    expect(db.annotations.has("AN2")).toBe(false);
    expect(db.annotations.has("AN3")).toBe(true);
    // Siblings survive.
    expect(db.assets.has("AS2")).toBe(true);
    expect(db.files.has("F3")).toBe(true);
    expect(db.sessions.has("M1")).toBe(true);
    expect([...fileStore.removed].sort()).toEqual([
      "images/F1.png",
      "images/F2.png",
    ]);
  });

  it("deleteMriSession removes its assets and files but leaves the event", async () => {
    await svc.deleteMriSession("M1");
    expect(db.sessions.has("M1")).toBe(false);
    expect(db.assets.has("AS1")).toBe(false);
    expect(db.files.has("F1")).toBe(false);
    expect(db.files.has("F2")).toBe(false);
    expect(db.events.has("E1")).toBe(true);
    expect(db.sessions.has("M2")).toBe(true);
  });

  it("deleteTimelineEvent cascades its sessions/assets/files", async () => {
    await svc.deleteTimelineEvent("E1");
    expect(db.events.has("E1")).toBe(false);
    for (const id of ["M1", "M2"]) expect(db.sessions.has(id)).toBe(false);
    for (const id of ["AS1", "AS2"]) expect(db.assets.has(id)).toBe(false);
    for (const id of ["F1", "F2", "F3"]) expect(db.files.has(id)).toBe(false);
    // The animal and its other event survive.
    expect(db.animals.has("A1")).toBe(true);
    expect(db.events.has("E2")).toBe(true);
  });

  it("deleteAnimal cascades observations, events, sessions, assets, files", async () => {
    await svc.deleteAnimal("A1");
    expect(db.animals.has("A1")).toBe(false);
    expect(db.observations.has("O1")).toBe(false);
    for (const id of ["E1", "E2"]) expect(db.events.has(id)).toBe(false);
    for (const id of ["M1", "M2"]) expect(db.sessions.has(id)).toBe(false);
    for (const id of ["F1", "F2", "F3"]) expect(db.files.has(id)).toBe(false);
    // Sibling animal A2 and the study survive.
    expect(db.animals.has("A2")).toBe(true);
    expect(db.studies.has("S1")).toBe(true);
  });

  it("deleteObservation removes only that row and touches no files", async () => {
    await svc.deleteObservation("O1");
    expect(db.observations.has("O1")).toBe(false);
    expect(db.observations.has("O2")).toBe(true);
    expect(fileStore.removed).toHaveLength(0);
  });
});

describe("DeletionService — histology sessions", () => {
  // A histopathology event on A2 with a histology session, asset, file, and
  // annotation. Added per-test (not in the shared graph) so the MRI-centric
  // counts elsewhere stay stable.
  function seedHistology() {
    db.events.set("EH", event("EH", "A2", "histopathology"));
    db.histologySessions.set("H1", histologySession("H1", "EH"));
    db.assets.set("HAS1", histologyAsset("HAS1", "H1"));
    db.files.set("HF1", file("HF1", "HAS1"));
    db.annotations.set("HAN1", annotation("HAN1", "HF1"));
  }

  it("deleteHistologySession cascades its assets, files, and annotations", async () => {
    seedHistology();
    await svc.deleteHistologySession("H1");
    expect(db.histologySessions.has("H1")).toBe(false);
    expect(db.assets.has("HAS1")).toBe(false);
    expect(db.files.has("HF1")).toBe(false);
    expect(db.annotations.has("HAN1")).toBe(false);
    // The parent histopathology event survives (session delete leaves the event).
    expect(db.events.has("EH")).toBe(true);
    expect([...fileStore.removed]).toEqual(["images/HF1.png"]);
  });

  it("deleteTimelineEvent purges an event's histology session too", async () => {
    seedHistology();
    await svc.deleteTimelineEvent("EH");
    expect(db.events.has("EH")).toBe(false);
    expect(db.histologySessions.has("H1")).toBe(false);
    expect(db.assets.has("HAS1")).toBe(false);
    expect(db.files.has("HF1")).toBe(false);
  });

  it("deleteStudy cascades histology sessions along with everything else", async () => {
    seedHistology();
    await svc.deleteStudy("S1");
    expect(db.histologySessions.has("H1")).toBe(false);
    expect(db.assets.has("HAS1")).toBe(false);
    expect(db.files.has("HF1")).toBe(false);
    expect(db.annotations.has("HAN1")).toBe(false);
  });
});

describe("DeletionService — biomarker samples & results", () => {
  // A biochemical-analysis event on A2 with a biomarker sample + two results.
  // Added per-test (not in the shared graph) so other counts stay stable.
  function seedBiomarkers() {
    db.events.set("EB", event("EB", "A2", "biochemical_analysis"));
    db.biomarkerSamples.set("BS1", biomarkerSample("BS1", "EB"));
    db.biomarkerResults.set("BR1", biomarkerResult("BR1", "BS1"));
    db.biomarkerResults.set("BR2", biomarkerResult("BR2", "BS1"));
  }

  it("deleteTimelineEvent purges an event's biomarker samples and their results", async () => {
    seedBiomarkers();
    await svc.deleteTimelineEvent("EB");
    expect(db.events.has("EB")).toBe(false);
    expect(db.biomarkerSamples.has("BS1")).toBe(false);
    expect(db.biomarkerResults.has("BR1")).toBe(false);
    expect(db.biomarkerResults.has("BR2")).toBe(false);
  });

  it("deleteStudy cascades biomarker samples + results along with everything else", async () => {
    seedBiomarkers();
    await svc.deleteStudy("S1");
    expect(db.biomarkerSamples.has("BS1")).toBe(false);
    expect(db.biomarkerResults.has("BR1")).toBe(false);
    expect(db.biomarkerResults.has("BR2")).toBe(false);
  });
});

describe("DeletionService — resilience", () => {
  it("still deletes the rows when file removal fails (best-effort)", async () => {
    fileStore.shouldThrow = true;
    await expect(svc.deleteResearchAsset("AS1")).resolves.toBeUndefined();
    // Rows are gone even though the disk removal threw.
    expect(db.assets.has("AS1")).toBe(false);
    expect(db.files.has("F1")).toBe(false);
    expect(db.files.has("F2")).toBe(false);
  });

  it("is idempotent — deleting a missing id does not throw", async () => {
    await expect(svc.deleteStudy("does-not-exist")).resolves.toBeUndefined();
    await expect(svc.deleteObservation("nope")).resolves.toBeUndefined();
  });
});
