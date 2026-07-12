/**
 * Composition root for the MRI Comparison workspace (v1.1).
 * ----------------------------------------------------------------------------
 * Builds the SQLite read model and injects it into the service. No new
 * persistence — it reads over the existing imaging tables. Safe to import in the
 * browser preview (the reader connects to SQLite lazily). Image URLs are resolved
 * by the existing StorageService, wired separately.
 */
import {
  createMriComparisonService,
  type MriComparisonService,
} from "@/application/services/mri-comparison-service";
import { SqliteMriComparisonReader } from "@/infrastructure/repositories/sqlite-mri-comparison-reader";

export const mriComparisonService: MriComparisonService =
  createMriComparisonService({
    reader: new SqliteMriComparisonReader(),
  });
