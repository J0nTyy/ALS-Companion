/**
 * A format-agnostic, in-memory REPORT MODEL built once from a PublicationPackage
 * and rendered by both the PDF and DOCX exporters — so the two documents contain
 * exactly the same information and the "what to include" logic lives in one place
 * (never duplicated). Pure and framework-free.
 */
import {
  ANNOTATION_TYPE_META,
  type Annotation,
} from "@/domain/entities/annotation";
import { ANNOTATION_RELATIONSHIP_TYPE_META } from "@/domain/entities/annotation-link";
import { MRI_MODALITY_META } from "@/domain/entities/mri-session";
import { HISTOLOGY_STAIN_META } from "@/domain/entities/histology-session";
import { BIOMARKER_SAMPLE_TYPE_META } from "@/domain/entities/biomarker-sample";
import { ANIMAL_SEX_META } from "@/domain/entities/animal";
import { OBSERVATION_KIND_META } from "@/domain/entities/observation";
import {
  RESEARCH_ASSET_STATUS_META,
  RESEARCH_ASSET_TYPE_META,
} from "@/domain/entities/research-asset";
import { STUDY_STATUS_META } from "@/domain/entities/study";
import { TIMELINE_EVENT_CATEGORY_META } from "@/domain/entities/timeline-event";
import type { Measurement } from "@/domain/measurements/measurement-engine";
import type { PublicationPackage } from "@/application/use-cases/publication/publication-package";

export interface ReportField {
  label: string;
  value: string;
}

export type ReportBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "fields"; fields: ReportField[] }
  | { kind: "table"; columns: string[]; rows: string[][] }
  | { kind: "note"; text: string }
  | {
      /**
       * A reference to a study image. The renderer embeds the image when its bytes
       * are supplied (DOCX); otherwise it renders the caption only. Bytes never live
       * in the model — they are passed to the renderer separately, keyed by
       * `relativePath`.
       */
      kind: "image";
      relativePath: string;
      mimeType: string;
      caption: string;
    };

export interface ReportSection {
  heading: string;
  blocks: ReportBlock[];
}

export interface ReportDocument {
  title: string;
  subtitle: string;
  sections: ReportSection[];
}

const DASH = "—";
const dateOnly = (iso: string | undefined): string =>
  iso ? iso.slice(0, 10) : DASH;
const opt = (value: string | undefined | null): string =>
  value && value.length > 0 ? value : DASH;

function measurementSummary(m: Measurement): string {
  if (m.kind === "point") {
    return `x ${m.normalized.x.toFixed(3)}, y ${m.normalized.y.toFixed(3)}`;
  }
  const n = m.normalized;
  return `w ${n.width.toFixed(3)} · h ${n.height.toFixed(3)} · area ${(n.width * n.height).toFixed(3)} · aspect ${m.aspectRatio.toFixed(2)}`;
}

/** Build the shared report model from a package. Deterministic — no timestamps. */
export function buildReportModel(pkg: PublicationPackage): ReportDocument {
  const animalName = new Map(pkg.animals.map((a) => [a.id, a.animalIdentifier]));
  const eventAnimal = new Map(
    pkg.timelineEvents.map((e) => [e.id, animalName.get(e.animalId) ?? DASH]),
  );
  const fileName = new Map(pkg.storedFiles.map((f) => [f.id, f.originalName]));
  const sampleLabel = new Map(
    pkg.biomarkerSamples.map((s) => [
      s.id,
      `${BIOMARKER_SAMPLE_TYPE_META[s.sampleType].label} · ${dateOnly(s.collectionDate)}`,
    ]),
  );
  const annotationById = new Map<string, Annotation>(
    pkg.annotations.map((a) => [a.id, a]),
  );
  const annotationLabel = (id: string): string => {
    const a = annotationById.get(id);
    if (!a) return id;
    const kind = ANNOTATION_TYPE_META[a.annotationType].label;
    return a.label ? `${a.label} (${kind})` : kind;
  };

  const sections: ReportSection[] = [];

  // Study information
  sections.push({
    heading: "Study information",
    blocks: [
      {
        kind: "fields",
        fields: [
          { label: "Name", value: pkg.study.name },
          { label: "Strain / line", value: pkg.study.strain },
          { label: "Status", value: STUDY_STATUS_META[pkg.study.status].label },
          { label: "Description", value: opt(pkg.study.description) },
          { label: "Created", value: dateOnly(pkg.study.createdAt) },
          { label: "Last updated", value: dateOnly(pkg.study.updatedAt) },
        ],
      },
    ],
  });

  // Protocol
  sections.push({
    heading: "Protocol",
    blocks: pkg.protocol
      ? [
          {
            kind: "table",
            columns: ["#", "Step", "Category", "Offset (days)", "Notes"],
            rows: pkg.protocol.steps.map((s, i) => [
              String(i + 1),
              s.title,
              TIMELINE_EVENT_CATEGORY_META[s.category].label,
              String(s.offsetDays),
              opt(s.notes),
            ]),
          },
        ]
      : [{ kind: "note", text: "No protocol defined for this study." }],
  });

  // Animals
  sections.push({
    heading: "Animals",
    blocks: [
      table(
        ["Animal ID", "Sex", "Date of birth", "Mutation", "Treatment group"],
        pkg.animals.map((a) => [
          a.animalIdentifier,
          ANIMAL_SEX_META[a.sex].label,
          dateOnly(a.dateOfBirth),
          opt(a.mutation),
          opt(a.treatmentGroup),
        ]),
        "No animals included.",
      ),
    ],
  });

  // Timeline
  sections.push({
    heading: "Experiment timeline",
    blocks: [
      table(
        ["Animal", "Event", "Category", "Status", "Planned", "Completed"],
        pkg.timelineEvents.map((e) => [
          eventAnimal.get(e.id) ?? DASH,
          e.title,
          TIMELINE_EVENT_CATEGORY_META[e.category].label,
          e.status === "completed" ? "Completed" : "Planned",
          dateOnly(e.plannedDate),
          dateOnly(e.completedDate),
        ]),
        "No timeline events included.",
      ),
    ],
  });

  // Observations
  sections.push({
    heading: "Observations",
    blocks: [
      table(
        ["Animal", "Type", "Value", "Scale", "Date"],
        pkg.observations.map((o) => [
          animalName.get(o.animalId) ?? DASH,
          OBSERVATION_KIND_META[o.kind].label,
          o.kind === "body_weight" ? `${o.value} g` : String(o.value),
          opt(o.scaleName),
          dateOnly(o.observedOn),
        ]),
        "No observations included.",
      ),
    ],
  });

  // MRI sessions
  sections.push({
    heading: "MRI sessions",
    blocks: [
      table(
        ["Session", "Modality", "Region", "Acquired", "Operator"],
        pkg.mriSessions.map((m) => [
          m.title,
          MRI_MODALITY_META[m.modality].label,
          opt(m.anatomicalRegion),
          dateOnly(m.acquisitionDate),
          opt(m.operator),
        ]),
        "No MRI sessions included.",
      ),
    ],
  });

  // Histology sessions
  sections.push({
    heading: "Histology sessions",
    blocks: [
      table(
        ["Stain", "Tissue", "Magnification", "Acquired", "Operator"],
        pkg.histologySessions.map((h) => [
          HISTOLOGY_STAIN_META[h.stain].label,
          opt(h.tissue),
          opt(h.magnification),
          dateOnly(h.acquisitionDate),
          opt(h.operator),
        ]),
        "No histology sessions included.",
      ),
    ],
  });

  // Biomarker samples
  sections.push({
    heading: "Biomarker samples",
    blocks: [
      table(
        ["Sample type", "Collected", "Operator", "Notes"],
        pkg.biomarkerSamples.map((s) => [
          BIOMARKER_SAMPLE_TYPE_META[s.sampleType].label,
          dateOnly(s.collectionDate),
          opt(s.operator),
          opt(s.notes),
        ]),
        "No biomarker samples included.",
      ),
    ],
  });

  // Biomarker results (laboratory values — captured, not analyzed)
  sections.push({
    heading: "Biomarker results",
    blocks: [
      {
        kind: "note",
        text: "Laboratory values recorded verbatim — not normalized or analyzed.",
      },
      table(
        ["Sample", "Biomarker", "Value", "Unit", "Method", "Notes"],
        pkg.biomarkerResults.map((r) => [
          sampleLabel.get(r.biomarkerSampleId) ?? DASH,
          r.biomarkerName,
          r.value,
          opt(r.unit),
          opt(r.method),
          opt(r.notes),
        ]),
        "No biomarker results included.",
      ),
    ],
  });

  // Research assets
  sections.push({
    heading: "Research assets",
    blocks: [
      table(
        ["Title", "Type", "Status", "Description"],
        pkg.researchAssets.map((r) => [
          r.title,
          RESEARCH_ASSET_TYPE_META[r.assetType].label,
          RESEARCH_ASSET_STATUS_META[r.status].label,
          opt(r.description),
        ]),
        "No research assets included.",
      ),
    ],
  });

  // Annotation summaries
  sections.push({
    heading: "Annotations",
    blocks: [
      table(
        ["Image", "Type", "Label", "Notes"],
        pkg.annotations.map((a) => [
          opt(fileName.get(a.storedFileId)),
          ANNOTATION_TYPE_META[a.annotationType].label,
          opt(a.label),
          opt(a.notes),
        ]),
        "No annotations included.",
      ),
    ],
  });

  // Measurements (derived, normalized)
  sections.push({
    heading: "Measurements",
    blocks: [
      { kind: "note", text: "Derived from annotation geometry (normalized 0–1 units)." },
      table(
        ["Annotation", "Type", "Measurement"],
        pkg.measurements.map((m) => {
          const a = annotationById.get(m.annotationId);
          return [
            a ? annotationLabel(m.annotationId) : m.annotationId,
            a ? ANNOTATION_TYPE_META[a.annotationType].label : DASH,
            measurementSummary(m.measurement),
          ];
        }),
        "No measurements (no annotations included).",
      ),
    ],
  });

  // Longitudinal links
  sections.push({
    heading: "Longitudinal links",
    blocks: [
      table(
        ["Source", "Relationship", "Target", "Notes"],
        pkg.annotationLinks.map((l) => [
          annotationLabel(l.sourceAnnotationId),
          ANNOTATION_RELATIONSHIP_TYPE_META[l.relationshipType].label,
          annotationLabel(l.targetAnnotationId),
          opt(l.notes),
        ]),
        "No longitudinal links included.",
      ),
    ],
  });

  // Image references + embedded images. Word (.docx) reports embed each raster
  // image inline; PDF reports list them here and write the files alongside the report.
  const assetTitle = new Map(pkg.researchAssets.map((a) => [a.id, a.title]));
  const embeddableFiles = pkg.storedFiles.filter(
    (f) => f.mimeType === "image/png" || f.mimeType === "image/jpeg",
  );
  const imageBlocks: ReportBlock[] = embeddableFiles.map((f) => {
    const asset = assetTitle.get(f.researchAssetId);
    return {
      kind: "image",
      relativePath: f.relativePath,
      mimeType: f.mimeType,
      caption: asset ? `${f.originalName} — ${asset}` : f.originalName,
    };
  });
  sections.push({
    heading: "Image references",
    blocks: [
      {
        kind: "note",
        text: "Study images are embedded inline below (when image embedding is enabled in Settings → Reports & export).",
      },
      ...imageBlocks,
      table(
        ["File", "Format", "Attached"],
        pkg.storedFiles.map((f) => [
          f.originalName,
          f.mimeType,
          dateOnly(f.createdAt),
        ]),
        "No image files included.",
      ),
    ],
  });

  return {
    title: `${pkg.study.name} — Research Package`,
    subtitle: `Strain / line: ${pkg.study.strain}`,
    sections,
  };
}

function table(
  columns: string[],
  rows: string[][],
  emptyText: string,
): ReportBlock {
  if (rows.length === 0) return { kind: "note", text: emptyText };
  return { kind: "table", columns, rows };
}
