import type {
  ComparableSession,
  MriComparisonReader,
} from "@/application/ports/mri-comparison-reader";

/**
 * Facade the presentation layer depends on for the MRI Comparison workspace. It
 * exposes only the read the workspace needs; image URLs are resolved through the
 * existing StorageService, so no file logic is duplicated here.
 */
export interface MriComparisonService {
  listComparableSessions(): Promise<ComparableSession[]>;
}

export function createMriComparisonService(deps: {
  reader: MriComparisonReader;
}): MriComparisonService {
  return {
    listComparableSessions: () => deps.reader.listComparableSessions(),
  };
}
