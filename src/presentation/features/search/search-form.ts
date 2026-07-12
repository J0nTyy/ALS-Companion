import type { SearchEntityType } from "@/domain/entities/search";
import type { TimelineEventCategory } from "@/domain/entities/timeline-event";
import type { ObservationKind } from "@/domain/entities/observation";
import type { MriModality } from "@/domain/entities/mri-session";
import type { ResearchAssetType } from "@/domain/entities/research-asset";

/**
 * The structured (non-text) state of the Search page's form. Enum fields use the
 * empty string to mean "no filter". Kept out of the component files so React Fast
 * Refresh stays happy (component modules should export only components).
 */
export interface SearchFormValues {
  typeScope: SearchEntityType | "all";
  mutation: string;
  treatmentGroup: string;
  timelineCategory: TimelineEventCategory | "";
  observationType: ObservationKind | "";
  mriModality: MriModality | "";
  researchAssetType: ResearchAssetType | "";
  status: string;
  dateFrom: string;
  dateTo: string;
}

export const EMPTY_SEARCH_FORM: SearchFormValues = {
  typeScope: "all",
  mutation: "",
  treatmentGroup: "",
  timelineCategory: "",
  observationType: "",
  mriModality: "",
  researchAssetType: "",
  status: "",
  dateFrom: "",
  dateTo: "",
};
