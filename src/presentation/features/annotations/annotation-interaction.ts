/**
 * Pure interaction logic for the annotation overlay — no React, no DOM — so the
 * selection lifecycle can be unit-tested directly.
 */

/** Which tool the viewer's pointer is currently bound to. */
export type AnnotationMode = "select" | "point" | "rectangle";

/** A press that began on the overlay *background* (not on an annotation mark). */
export interface BackgroundPress {
  /** True once the pointer moved beyond the click threshold (a drag/pan). */
  moved: boolean;
}

/**
 * Decide whether a pointer-up should clear the current selection.
 *
 * Selection is only cleared by an **intentional click on empty space**: the press
 * must have begun on the overlay background (`backgroundPress` is non-null) and must
 * not have turned into a drag/pan (`moved === false`). A press on an annotation mark
 * stops propagation, so no background press is recorded — meaning a click *on a mark*
 * never clears the selection. (Regression guard for the "selection immediately
 * clears" bug.)
 */
export function shouldClearSelection(
  mode: AnnotationMode,
  backgroundPress: BackgroundPress | null,
): boolean {
  return mode === "select" && backgroundPress !== null && !backgroundPress.moved;
}
