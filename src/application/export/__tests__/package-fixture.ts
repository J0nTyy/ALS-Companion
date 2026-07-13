import { assemblePackage } from "@/application/use-cases/publication/assemble-package";
import { fullSelection } from "@/application/use-cases/publication/workspace-selection";
import {
  annotation,
  sampleContents,
} from "@/application/use-cases/publication/__tests__/fixtures";
import type { PublicationPackage } from "@/application/use-cases/publication/publication-package";

/**
 * A realistic package for export tests: the shared sample study plus a rectangle
 * annotation and comma-containing text (to exercise measurement + CSV escaping).
 * Built through the real assembler so it also covers the v1.8 package extension.
 */
export function samplePackage(): PublicationPackage {
  const contents = sampleContents();
  contents.study = { ...contents.study, name: "Study A, cohort 1" };
  contents.annotations = [
    ...contents.annotations,
    annotation("an3", "f1", {
      annotationType: "rectangle",
      geometry: { kind: "rectangle", x: 0.1, y: 0.2, width: 0.4, height: 0.3 },
      label: "Lesion, left",
    }),
  ];
  return assemblePackage(contents, fullSelection(contents));
}
