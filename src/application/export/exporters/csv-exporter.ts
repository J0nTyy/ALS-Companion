import { serializeAnnotationGeometry } from "@/domain/entities/annotation";
import type { Measurement } from "@/domain/measurements/measurement-engine";
import type { PublicationPackage } from "@/application/use-cases/publication/publication-package";
import { toCsv, type CsvValue } from "../csv";
import { textFile, type ExportFile } from "../export-types";

/** Normalized measurement flattened to CSV columns (point vs rectangle → blanks). */
function measurementRow(
  annotationId: string,
  m: Measurement,
): CsvValue[] {
  if (m.kind === "point") {
    return [annotationId, "point", m.normalized.x, m.normalized.y, "", "", "", ""];
  }
  const n = m.normalized;
  return [
    annotationId,
    "rectangle",
    "",
    "",
    n.width,
    n.height,
    n.width * n.height,
    m.aspectRatio,
  ];
}

/**
 * CSV exporter — one file per tabular dataset (analysis-friendly). Foreign keys are
 * kept so the files can be joined; measurements are the derived, normalized values.
 */
export function csvExporter(pkg: PublicationPackage): ExportFile[] {
  const fileName = new Map(pkg.storedFiles.map((f) => [f.id, f.originalName]));

  const animals = toCsv(
    ["id", "animal_identifier", "sex", "date_of_birth", "mutation", "treatment_group", "created_at"],
    pkg.animals.map((a) => [
      a.id,
      a.animalIdentifier,
      a.sex,
      a.dateOfBirth ?? "",
      a.mutation ?? "",
      a.treatmentGroup ?? "",
      a.createdAt,
    ]),
  );

  const observations = toCsv(
    ["id", "animal_id", "kind", "value", "scale_name", "observed_on", "notes"],
    pkg.observations.map((o) => [
      o.id,
      o.animalId,
      o.kind,
      o.value,
      o.scaleName ?? "",
      o.observedOn,
      o.notes ?? "",
    ]),
  );

  const timeline = toCsv(
    ["id", "animal_id", "title", "category", "status", "planned_date", "completed_date", "notes"],
    pkg.timelineEvents.map((e) => [
      e.id,
      e.animalId,
      e.title,
      e.category,
      e.status,
      e.plannedDate ?? "",
      e.completedDate ?? "",
      e.notes ?? "",
    ]),
  );

  const annotations = toCsv(
    ["id", "stored_file_id", "stored_file_name", "annotation_type", "label", "notes", "geometry"],
    pkg.annotations.map((a) => [
      a.id,
      a.storedFileId,
      fileName.get(a.storedFileId) ?? "",
      a.annotationType,
      a.label ?? "",
      a.notes ?? "",
      serializeAnnotationGeometry(a.geometry),
    ]),
  );

  const measurements = toCsv(
    ["annotation_id", "type", "x", "y", "width", "height", "area", "aspect_ratio"],
    pkg.measurements.map((m) => measurementRow(m.annotationId, m.measurement)),
  );

  const annotationLinks = toCsv(
    ["id", "source_annotation_id", "target_annotation_id", "relationship_type", "notes", "created_at"],
    pkg.annotationLinks.map((l) => [
      l.id,
      l.sourceAnnotationId,
      l.targetAnnotationId,
      l.relationshipType,
      l.notes ?? "",
      l.createdAt,
    ]),
  );

  return [
    textFile("animals.csv", animals),
    textFile("observations.csv", observations),
    textFile("timeline.csv", timeline),
    textFile("annotations.csv", annotations),
    textFile("measurements.csv", measurements),
    textFile("annotation_links.csv", annotationLinks),
  ];
}
