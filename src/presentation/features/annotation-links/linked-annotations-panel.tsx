import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Link2, Plus, X } from "lucide-react";

import { ANNOTATION_RELATIONSHIP_TYPE_META } from "@/domain/entities/annotation-link";
import type {
  AnnotationRelationshipType,
} from "@/domain/entities/annotation-link";
import { ANNOTATION_TYPE_META } from "@/domain/entities/annotation";
import type { AnnotatedContext } from "@/application/ports/annotation-context-reader";
import type { LinkedAnnotationEntry } from "@/application/services/annotation-link-service";
import { isTauri } from "@/infrastructure/platform/environment";
import { Button } from "@/presentation/components/ui/button";
import { Select } from "@/presentation/components/ui/select";
import { Textarea } from "@/presentation/components/ui/textarea";
import { Label } from "@/presentation/components/ui/label";
import { toUserMessage } from "@/presentation/lib/error-message";
import { formatDateOnly } from "@/shared/lib/format";
import { useAnnotationLinkService } from "./annotation-link-service-context";

const RELATIONSHIP_ORDER: AnnotationRelationshipType[] = [
  "baseline",
  "follow_up",
  "related",
];

function contextLabel(context: AnnotatedContext): string {
  const kind = ANNOTATION_TYPE_META[context.annotationType].label;
  return context.label ? `${context.label} (${kind})` : kind;
}

/**
 * Shows the longitudinal links of the selected annotation — the same structure
 * tracked across other MRI sessions — with their session/date/animal/study, and
 * lets the researcher create, open, or remove links. Read-only for archived
 * studies. Researcher-created only: nothing is inferred.
 */
export function LinkedAnnotationsPanel({
  annotationId,
  readOnly,
  onOpen,
}: {
  annotationId: string;
  readOnly: boolean;
  onOpen: (context: AnnotatedContext) => void;
}) {
  const service = useAnnotationLinkService();
  const [entries, setEntries] = useState<LinkedAnnotationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const available = isTauri();

  const reload = useCallback(async () => {
    if (!available) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setEntries(await service.getLinkedTimeline(annotationId));
    } catch (e) {
      setError(toUserMessage(e, "We couldn't load the links. Please try again."));
    } finally {
      setLoading(false);
    }
  }, [service, annotationId, available]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function handleRemove(linkId: string) {
    try {
      await service.delete(linkId);
      await reload();
    } catch (e) {
      setError(toUserMessage(e, "We couldn't remove that link. Please try again."));
    }
  }

  if (!available) return null;

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Link2 className="h-4 w-4 text-primary" />
          Linked annotations
          {entries.length > 0 ? (
            <span className="text-muted-foreground">({entries.length})</span>
          ) : null}
        </div>
        {readOnly ? null : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setCreating(true)}
          >
            <Plus />
            Create link
          </Button>
        )}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading links…</p>
      ) : entries.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {readOnly
            ? "This annotation has no links."
            : "Not linked yet. Link this to the same structure in another MRI session to track it over time."}
        </p>
      ) : (
        <ul className="space-y-2">
          {entries.map((entry) => (
            <li
              key={entry.link.id}
              className="rounded-md border border-border bg-muted/30 px-3 py-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 space-y-0.5">
                  <p className="text-xs font-medium text-primary">
                    {entry.direction === "outgoing" ? (
                      <>
                        {ANNOTATION_RELATIONSHIP_TYPE_META[entry.link.relationshipType].label}{" "}
                        <ArrowRight className="inline h-3 w-3" />
                      </>
                    ) : (
                      <>
                        <ArrowRight className="inline h-3 w-3 rotate-180" />{" "}
                        {ANNOTATION_RELATIONSHIP_TYPE_META[entry.link.relationshipType].label}
                      </>
                    )}
                  </p>
                  <p className="truncate text-sm text-foreground">
                    {contextLabel(entry.context)}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {entry.context.animalIdentifier} ·{" "}
                    {entry.context.mriSessionTitle} ·{" "}
                    {formatDateOnly(entry.context.acquisitionDate)}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {entry.context.studyName}
                  </p>
                  {entry.link.notes ? (
                    <p className="text-xs text-muted-foreground">
                      {entry.link.notes}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onOpen(entry.context)}
                  >
                    Open
                  </Button>
                  {readOnly ? null : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Remove link"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => void handleRemove(entry.link.id)}
                    >
                      <X />
                    </Button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {creating ? (
        <CreateLinkDialog
          annotationId={annotationId}
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            void reload();
          }}
        />
      ) : null}
    </div>
  );
}

/** Dialog to link the annotation to a sibling (same animal, another session). */
function CreateLinkDialog({
  annotationId,
  onClose,
  onCreated,
}: {
  annotationId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const service = useAnnotationLinkService();
  const [candidates, setCandidates] = useState<AnnotatedContext[] | null>(null);
  const [targetId, setTargetId] = useState("");
  const [relationshipType, setRelationshipType] =
    useState<AnnotationRelationshipType>("follow_up");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    service
      .getLinkCandidates(annotationId)
      .then((list) => {
        if (!active) return;
        setCandidates(list);
        setTargetId(list[0]?.annotationId ?? "");
      })
      .catch((e) => {
        if (active)
          setError(
            toUserMessage(e, "We couldn't load annotations to link to."),
          );
      });
    return () => {
      active = false;
    };
  }, [service, annotationId]);

  async function create() {
    if (!targetId || busy) return;
    setBusy(true);
    setError(null);
    try {
      await service.create({
        sourceAnnotationId: annotationId,
        targetAnnotationId: targetId,
        relationshipType,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      onCreated();
    } catch (e) {
      setError(
        toUserMessage(e, "We couldn't create that link. Please try again."),
      );
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Create annotation link"
      onClick={() => !busy && onClose()}
    >
      <div
        className="w-full max-w-md space-y-4 rounded-lg border border-border bg-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-foreground">
            Link to another session
          </h2>
          <p className="text-sm text-muted-foreground">
            Connect this mark to the same structure on another of this animal's MRI
            sessions.
          </p>
        </div>

        {candidates === null ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : candidates.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            There are no other annotations on this animal to link to yet. Add an
            annotation to another MRI session first.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="link-target">Annotation</Label>
              <Select
                id="link-target"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                disabled={busy}
              >
                {candidates.map((c) => (
                  <option key={c.annotationId} value={c.annotationId}>
                    {c.animalIdentifier} · {c.mriSessionTitle} ·{" "}
                    {formatDateOnly(c.acquisitionDate)}
                    {c.label ? ` · ${c.label}` : ""}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="link-type">Relationship</Label>
              <Select
                id="link-type"
                value={relationshipType}
                onChange={(e) =>
                  setRelationshipType(
                    e.target.value as AnnotationRelationshipType,
                  )
                }
                disabled={busy}
              >
                {RELATIONSHIP_ORDER.map((type) => (
                  <option key={type} value={type}>
                    {ANNOTATION_RELATIONSHIP_TYPE_META[type].label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="link-notes">Notes</Label>
              <Textarea
                id="link-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional — e.g. same lesion, larger at follow-up."
                disabled={busy}
              />
            </div>
          </div>
        )}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => void create()}
            disabled={busy || !targetId || (candidates?.length ?? 0) === 0}
          >
            {busy ? "Linking…" : "Create link"}
          </Button>
        </div>
      </div>
    </div>
  );
}
