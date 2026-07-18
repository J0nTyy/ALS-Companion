/**
 * A tiny cross-tree signal for study changes made outside a page's own state. The
 * AI assistant lives in the global app shell, so when it saves a study's report
 * summary (via a confirmed proposal) the Publication Workspace route has no way to
 * know. Rather than thread shared state between two disconnected React trees, the
 * writer emits a window event and interested views subscribe.
 */
export const STUDY_SUMMARY_CHANGED = "als:study-summary-changed";

export interface StudySummaryChangedDetail {
  studyId: string;
  summary: string;
}

/** Announce that a study's report summary was saved (e.g. by the assistant). */
export function emitStudySummaryChanged(detail: StudySummaryChangedDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(STUDY_SUMMARY_CHANGED, { detail }));
}

/** Subscribe to summary-saved events; returns an unsubscribe function. */
export function onStudySummaryChanged(
  handler: (detail: StudySummaryChangedDetail) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<StudySummaryChangedDetail>).detail;
    if (detail) handler(detail);
  };
  window.addEventListener(STUDY_SUMMARY_CHANGED, listener);
  return () => window.removeEventListener(STUDY_SUMMARY_CHANGED, listener);
}
