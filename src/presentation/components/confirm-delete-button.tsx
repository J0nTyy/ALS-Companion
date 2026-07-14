import {
  forwardRef,
  useCallback,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/presentation/components/ui/button";
import { Input } from "@/presentation/components/ui/input";
import { Modal } from "@/presentation/components/ui/modal";
import { toUserMessage } from "@/presentation/lib/error-message";
import { useSettings } from "@/shared/hooks/use-settings";

/** Imperative handle so a parent (e.g. a context-menu "Delete") can open the same
 *  confirmation dialog this button already owns — reusing one delete flow. */
export interface ConfirmDeleteHandle {
  open(): void;
}

interface ConfirmDeleteButtonProps {
  onConfirm: () => Promise<void>;
  title: string;
  description: ReactNode;
  confirmPhrase?: string;
  triggerLabel?: string;
  triggerAriaLabel?: string;
  iconOnly?: boolean;
  size?: "sm" | "icon";
}

/**
 * A reusable destructive-action control. Renders a Delete trigger; clicking (or a
 * parent calling `ref.open()`) opens a focus-trapped confirmation {@link Modal} that
 * runs `onConfirm`. For high-stakes deletes (e.g. a whole study), pass `confirmPhrase`
 * to require the user to type it exactly before Delete enables. Deletes are permanent,
 * so the copy is explicit. Respects the "confirm before delete" setting for low-stakes
 * deletes; a `confirmPhrase` delete always confirms.
 */
export const ConfirmDeleteButton = forwardRef<
  ConfirmDeleteHandle,
  ConfirmDeleteButtonProps
>(function ConfirmDeleteButton(
  {
    onConfirm,
    title,
    description,
    confirmPhrase,
    triggerLabel,
    triggerAriaLabel,
    iconOnly = false,
    size = "sm",
  },
  ref,
) {
  const { settings } = useSettings();
  const titleId = useId();
  const descId = useId();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Keep an always-current confirm() for the trigger/imperative paths without
  // re-creating the handle on every render.
  const confirmRef = useRef<() => Promise<void>>(async () => {});

  // Low-stakes deletes may skip the dialog when the researcher has turned off
  // "confirm before delete". High-stakes deletes (a typed confirmPhrase, e.g. a
  // whole study) ALWAYS confirm, regardless of the setting.
  const skipConfirm = !settings.confirmBeforeDelete && !confirmPhrase;

  const requestDelete = useCallback(() => {
    if (skipConfirm) void confirmRef.current();
    else setOpen(true);
  }, [skipConfirm]);

  useImperativeHandle(ref, () => ({ open: requestDelete }), [requestDelete]);

  function close() {
    if (busy) return;
    setOpen(false);
    setTyped("");
    setError(null);
  }

  const phraseOk = !confirmPhrase || typed.trim() === confirmPhrase.trim();

  async function confirm() {
    if (!phraseOk || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      // On success the parent typically navigates/reloads; leave the dialog closed.
      setOpen(false);
      setTyped("");
    } catch (e) {
      setError(toUserMessage(e, "We couldn't delete that. Please try again."));
      setBusy(false);
      // Surface the failure even when the delete ran without the dialog open.
      setOpen(true);
    }
  }
  confirmRef.current = confirm;

  return (
    <>
      <Button
        type="button"
        variant={iconOnly ? "ghost" : "outline"}
        size={size}
        onClick={requestDelete}
        aria-label={triggerAriaLabel ?? triggerLabel ?? "Delete"}
        className={
          iconOnly
            ? "text-muted-foreground hover:text-destructive"
            : "text-destructive hover:bg-destructive/10"
        }
      >
        <Trash2 />
        {iconOnly ? null : (triggerLabel ?? "Delete")}
      </Button>

      <Modal
        open={open}
        onClose={close}
        labelledById={titleId}
        describedById={descId}
      >
        <div className="space-y-1.5">
          <h2 id={titleId} className="text-base font-semibold text-foreground">
            {title}
          </h2>
          <div id={descId} className="text-sm text-muted-foreground">
            {description}
          </div>
        </div>

        {confirmPhrase ? (
          <div className="space-y-1.5">
            <label htmlFor={`${descId}-phrase`} className="text-sm text-foreground">
              Type{" "}
              <span className="font-semibold text-foreground">{confirmPhrase}</span>{" "}
              to confirm:
            </label>
            <Input
              id={`${descId}-phrase`}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              disabled={busy}
              aria-label="Confirmation text"
            />
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={close} disabled={busy}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => void confirm()}
            disabled={busy || !phraseOk}
          >
            {busy ? "Deleting…" : "Delete permanently"}
          </Button>
        </div>
      </Modal>
    </>
  );
});
