/**
 * Pure preview + validation for the publication package. Produces the section
 * counts shown in the live preview and the honest warnings — no study selected, no
 * animals selected, or an empty package. Never fabricates content.
 */
import type {
  PackagePreview,
  PublicationPackage,
} from "./publication-package";

/** Selectable content only (excludes always-included study/protocol/derived files). */
function selectableCount(pkg: PublicationPackage): number {
  return (
    pkg.animals.length +
    pkg.timelineEvents.length +
    pkg.observations.length +
    pkg.mriSessions.length +
    pkg.histologySessions.length +
    pkg.biomarkerSamples.length +
    pkg.researchAssets.length
  );
}

/**
 * Summarize a package for the preview panel. Passing `null` (no study loaded yet)
 * yields the "select a study" warning, so the preview always has something honest
 * to show.
 */
export function previewPackage(
  pkg: PublicationPackage | null,
): PackagePreview {
  if (!pkg) {
    return {
      studyName: "",
      sections: [],
      totalItems: 0,
      warnings: ["Select a study to start building a package."],
      isEmpty: true,
    };
  }

  const sections = [
    { key: "animals", label: "Animals", count: pkg.animals.length },
    {
      key: "protocol",
      label: "Protocol steps",
      count: pkg.protocol ? pkg.protocol.steps.length : 0,
    },
    { key: "timelineEvents", label: "Timeline events", count: pkg.timelineEvents.length },
    { key: "observations", label: "Observations", count: pkg.observations.length },
    { key: "mriSessions", label: "MRI sessions", count: pkg.mriSessions.length },
    { key: "histologySessions", label: "Histology sessions", count: pkg.histologySessions.length },
    { key: "biomarkerSamples", label: "Biomarker samples", count: pkg.biomarkerSamples.length },
    { key: "biomarkerResults", label: "Biomarker results", count: pkg.biomarkerResults.length },
    { key: "researchAssets", label: "Research assets", count: pkg.researchAssets.length },
    { key: "storedFiles", label: "Stored files", count: pkg.storedFiles.length },
    { key: "annotations", label: "Annotations", count: pkg.annotations.length },
    { key: "annotationLinks", label: "Longitudinal links", count: pkg.annotationLinks.length },
  ];

  const totalItems = sections.reduce((sum, s) => sum + s.count, 0);
  const isEmpty = selectableCount(pkg) === 0;

  const warnings: string[] = [];
  if (pkg.animals.length === 0) {
    warnings.push("No animals selected — choose at least one animal to include.");
  }
  if (isEmpty) {
    warnings.push("The package is empty — select items to include.");
  }

  return { studyName: pkg.study.name, sections, totalItems, warnings, isEmpty };
}
