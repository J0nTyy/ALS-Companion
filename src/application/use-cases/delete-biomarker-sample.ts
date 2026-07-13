import { NotFoundError } from "@/application/errors";
import type { BiomarkerUseCaseDeps } from "./deps";
import { loadWritableTimelineEvent } from "./load-writable-timeline-event";

/**
 * Permanently delete a biomarker sample and all of its results.
 *
 * Confirms the sample exists and its study is not archived (archived studies are
 * read-only), then removes the sample's results FIRST (they FK-reference the sample)
 * and finally the sample row. Idempotent at the repository level.
 */
export async function deleteBiomarkerSample(
  deps: BiomarkerUseCaseDeps,
  id: string,
): Promise<void> {
  const existing = await deps.samples.getById(id);
  if (!existing) {
    throw new NotFoundError("That biomarker sample could not be found.");
  }

  await loadWritableTimelineEvent(deps, existing.timelineEventId);

  const results = await deps.results.listBySample(id);
  for (const result of results) {
    await deps.results.delete(result.id);
  }
  await deps.samples.delete(id);
}
