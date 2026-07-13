/**
 * Decides where the *native* browser context menu is allowed. The app suppresses
 * the browser menu everywhere so it can show its own desktop-style menu — except
 * in editable text fields, where researchers still need native copy/paste/select.
 */

/** The minimal element shape this predicate inspects (a real DOM element has both). */
export interface EditableTargetInfo {
  tagName: string;
  isContentEditable: boolean;
}

/**
 * True when the event target is itself an editable field (an `<input>`,
 * `<textarea>`, `<select>`, or a `contenteditable` element). The provider also
 * checks `closest(...)` for editable *ancestors* (a rich contenteditable region),
 * but this covers the common case and is the unit-tested core of the rule.
 */
export function isEditableTarget(
  target: EditableTargetInfo | null | undefined,
): boolean {
  if (!target) return false;
  if (target.isContentEditable) return true;
  const tag = typeof target.tagName === "string" ? target.tagName.toUpperCase() : "";
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}
