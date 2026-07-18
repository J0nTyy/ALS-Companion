import { useState } from "react";
import { Sparkles } from "lucide-react";

import { STUDY_STATUS_META } from "@/domain/entities/study";
import { TIMELINE_EVENT_CATEGORY_META } from "@/domain/entities/timeline-event";
import { OBSERVATION_KIND_META } from "@/domain/entities/observation";
import { HISTOLOGY_STAIN_META } from "@/domain/entities/histology-session";
import { BIOMARKER_SAMPLE_TYPE_META } from "@/domain/entities/biomarker-sample";
import {
  RESEARCH_ASSET_STATUS_META,
  RESEARCH_ASSET_TYPE_META,
} from "@/domain/entities/research-asset";
import type { WorkspaceStudyContents } from "@/application/use-cases/publication/publication-package";
import { Button } from "@/presentation/components/ui/button";
import { Label } from "@/presentation/components/ui/label";
import { Select } from "@/presentation/components/ui/select";
import { Textarea } from "@/presentation/components/ui/textarea";
import { HelpHint } from "@/presentation/features/help/help-hint";
import { HELP } from "@/presentation/features/help/help-sections";
import { formatDateOnly } from "@/shared/lib/format";
import { toUserMessage } from "@/presentation/lib/error-message";
import {
  useAssistant,
  useDeclareAssistantContext,
} from "@/presentation/features/assistant/assistant-context";
import { usePublicationWorkspace } from "./use-publication-workspace";
import {
  ChecklistSection,
  type ChecklistItem,
} from "./components/checklist-section";
import { PackagePreviewPanel } from "./components/package-preview-panel";
import { ExportPanel } from "./components/export-panel";

/**
 * The Publication Workspace — pick a study, choose what to include on the left, and
 * watch the in-memory package preview update on the right. It only aggregates
 * existing data; nothing is exported or fabricated (see PublicationWorkspaceService).
 */
export function PublicationPage() {
  const ws = usePublicationWorkspace();

  // Let the assistant know which study is selected here, so a request to "draft a
  // summary" or "analyse this" resolves to the right study without being told.
  useDeclareAssistantContext(
    ws.contents.status === "ready"
      ? `The study "${ws.contents.contents.study.name}" (id ${ws.contents.contents.study.id}) is selected in the Publication workspace; they may be assembling an export package or drafting the study's report summary.`
      : "No study is selected in the Publication workspace yet.",
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-foreground">
          Publication workspace
          <HelpHint section={HELP.publication} label="publication workspace" className="h-6 w-6" />
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Assemble a research package from an existing study. Choose what to
          include; the preview updates live.
        </p>
      </div>

      {ws.studies.status === "unavailable" ? (
        <Message>
          The publication workspace is available in the installed desktop app.
        </Message>
      ) : null}

      {ws.studies.status === "loading" ? (
        <Message>Loading studies…</Message>
      ) : null}

      {ws.studies.status === "error" ? (
        <div className="space-y-2">
          <p className="text-sm text-destructive">{ws.studies.message}</p>
          <Button variant="outline" size="sm" onClick={() => void ws.reloadStudies()}>
            Try again
          </Button>
        </div>
      ) : null}

      {ws.studies.status === "ready" ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.6fr_1fr]">
          {/* Left: selection */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="publication-study">Study</Label>
              <Select
                id="publication-study"
                value={ws.studyId ?? ""}
                onChange={(e) => void ws.selectStudy(e.target.value || null)}
              >
                <option value="">Select a study…</option>
                {ws.studies.studies.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {STUDY_STATUS_META[s.status].label}
                  </option>
                ))}
              </Select>
            </div>

            {ws.contents.status === "loading" ? (
              <Message>Loading study contents…</Message>
            ) : null}
            {ws.contents.status === "error" ? (
              <p className="text-sm text-destructive">{ws.contents.message}</p>
            ) : null}
            {ws.contents.status === "idle" ? (
              <Message>Choose a study above to select what to include.</Message>
            ) : null}
            {ws.contents.status === "ready" ? (
              <>
                <SummaryEditor
                  key={ws.contents.contents.study.id}
                  studyName={ws.contents.contents.study.name}
                  studyId={ws.contents.contents.study.id}
                  draft={ws.draftSummary}
                  onDraftChange={ws.setDraftSummary}
                  onSave={ws.saveDraftSummary}
                  savedSummary={ws.savedSummary}
                  savedSummaryAt={ws.savedSummaryAt}
                />
                <SelectionSections contents={ws.contents.contents} ws={ws} />
              </>
            ) : null}
          </div>

          {/* Right: live preview + export */}
          <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
            <PackagePreviewPanel preview={ws.preview} />
            <ExportPanel
              pkg={ws.package}
              disabled={ws.contents.status !== "ready" || ws.preview.isEmpty}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SelectionSections({
  contents,
  ws,
}: {
  contents: WorkspaceStudyContents;
  ws: ReturnType<typeof usePublicationWorkspace>;
}) {
  const animalName = new Map(
    contents.animals.map((a) => [a.id, a.animalIdentifier]),
  );
  const optional = (...parts: Array<string | undefined>) =>
    parts.filter((p): p is string => !!p && p.length > 0).join(" · ") ||
    undefined;

  const animalItems: ChecklistItem[] = contents.animals.map((a) => {
    const subtitle = optional(a.mutation, a.treatmentGroup);
    return {
      id: a.id,
      label: a.animalIdentifier,
      ...(subtitle ? { subtitle } : {}),
    };
  });
  const eventItems: ChecklistItem[] = contents.timelineEvents.map((e) => ({
    id: e.id,
    label: e.title,
    subtitle: `${TIMELINE_EVENT_CATEGORY_META[e.category].label} · ${
      animalName.get(e.animalId) ?? "—"
    }`,
  }));
  const observationItems: ChecklistItem[] = contents.observations.map((o) => ({
    id: o.id,
    label: OBSERVATION_KIND_META[o.kind].label,
    subtitle: `${formatDateOnly(o.observedOn)} · ${animalName.get(o.animalId) ?? "—"}`,
  }));
  const sessionItems: ChecklistItem[] = contents.mriSessions.map((m) => ({
    id: m.id,
    label: m.title,
    subtitle: `${m.anatomicalRegion ?? "—"} · ${formatDateOnly(m.acquisitionDate)}`,
  }));
  const histologyItems: ChecklistItem[] = contents.histologySessions.map(
    (h) => ({
      id: h.id,
      label: HISTOLOGY_STAIN_META[h.stain].label,
      subtitle: `${h.tissue ?? "—"} · ${formatDateOnly(h.acquisitionDate)}`,
    }),
  );
  const biomarkerItems: ChecklistItem[] = contents.biomarkerSamples.map(
    (s) => {
      const count = contents.biomarkerResults.filter(
        (r) => r.biomarkerSampleId === s.id,
      ).length;
      return {
        id: s.id,
        label: BIOMARKER_SAMPLE_TYPE_META[s.sampleType].label,
        subtitle: `${formatDateOnly(s.collectionDate)} · ${count} result${count === 1 ? "" : "s"}`,
      };
    },
  );
  const assetItems: ChecklistItem[] = contents.researchAssets.map((r) => ({
    id: r.id,
    label: r.title,
    subtitle: `${RESEARCH_ASSET_TYPE_META[r.assetType].label} · ${RESEARCH_ASSET_STATUS_META[r.status].label}`,
  }));

  const section = (
    title: string,
    key: Parameters<typeof ws.toggleItem>[0],
    items: ChecklistItem[],
  ) => (
    <ChecklistSection
      title={title}
      items={items}
      selectedIds={ws.selection[key]}
      onToggle={(id) => ws.toggleItem(key, id)}
      onAll={() => ws.setSection(key, items.map((i) => i.id))}
      onNone={() => ws.setSection(key, [])}
    />
  );

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Study metadata and the protocol are always included. Everything is selected
        by default — clear anything you don't want.
      </p>
      {section("Animals", "animalIds", animalItems)}
      {section("Timeline events", "timelineEventIds", eventItems)}
      {section("Observations", "observationIds", observationItems)}
      {section("MRI sessions", "mriSessionIds", sessionItems)}
      {section("Histology sessions", "histologySessionIds", histologyItems)}
      {section("Biomarker samples", "biomarkerSampleIds", biomarkerItems)}
      {section("Research assets", "researchAssetIds", assetItems)}
    </div>
  );
}

/**
 * Edit the study's narrative report summary — what shows up in the PDF/Word/JSON
 * exports. The box starts EMPTY on each study (and each app launch): only what's in
 * it exports. The last saved summary is kept separately — "Load into editor" pulls
 * it back in — and the assistant can draft one from scratch or update it against
 * what's changed since the last save. Remounted per study via a `key`.
 */
function SummaryEditor({
  studyName,
  studyId,
  draft,
  onDraftChange,
  onSave,
  savedSummary,
  savedSummaryAt,
}: {
  studyName: string;
  studyId: string;
  draft: string;
  onDraftChange: (text: string) => void;
  onSave: () => Promise<void>;
  savedSummary: string | null;
  savedSummaryAt: string | null;
}) {
  const { ask, available } = useAssistant();
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");

  const trimmed = draft.trim();
  // Save only when there's new, non-empty text — so an empty box on open can't wipe
  // the saved summary, and re-saving the loaded one is a no-op.
  const canSave = trimmed.length > 0 && trimmed !== (savedSummary ?? "");

  const save = async () => {
    setStatus("saving");
    try {
      await onSave();
      setStatus("saved");
    } catch (error) {
      setStatus("error");
      setMessage(toUserMessage(error, "We couldn't save the summary."));
    }
  };

  // Open the assistant with a ready-made prompt; it gathers the data and proposes a
  // summary the researcher confirms straight into this box.
  const draftFull = () =>
    ask(
      `Draft a report summary for the study "${studyName}" (id ${studyId}). Review its animals, observation trends, timeline milestones, and biomarker results, then propose a substantive summary I can review and add.`,
    );

  const draftUpdate = () =>
    ask(
      `Update the report summary for the study "${studyName}" (id ${studyId}). ` +
        `Its last report was saved on ${savedSummaryAt ? formatDateOnly(savedSummaryAt) : "an earlier date"}. ` +
        `Review what has been added or changed in the study since then (new observations, timeline events, biomarker results) ` +
        `and propose a revised summary that builds on the previous one. Previous summary:\n\n${savedSummary ?? ""}`,
    );

  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor="study-summary">Report summary</Label>
        <span className="text-xs text-muted-foreground">
          Included in PDF, Word &amp; JSON exports
        </span>
      </div>

      {savedSummary ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground">
          <span>
            A saved summary exists
            {savedSummaryAt ? ` (last saved ${formatDateOnly(savedSummaryAt)})` : ""}.
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2"
            onClick={() => {
              onDraftChange(savedSummary);
              setStatus("idle");
            }}
          >
            Load into editor
          </Button>
        </div>
      ) : null}

      <Textarea
        id="study-summary"
        value={draft}
        onChange={(e) => {
          onDraftChange(e.target.value);
          if (status !== "idle") setStatus("idle");
        }}
        rows={4}
        placeholder="Write a summary, load the last one, or ask the assistant to draft one…"
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => void save()} disabled={!canSave || status === "saving"}>
          {status === "saving" ? "Saving…" : "Save summary"}
        </Button>
        {available ? (
          <Button size="sm" variant="outline" onClick={draftFull}>
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Draft with assistant
          </Button>
        ) : null}
        {available && savedSummary ? (
          <Button size="sm" variant="outline" onClick={draftUpdate}>
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Update since last report
          </Button>
        ) : null}
        {status === "saved" && !canSave ? (
          <span className="text-xs text-primary">Saved</span>
        ) : null}
        {status === "error" ? (
          <span className="text-xs text-destructive">{message}</span>
        ) : null}
      </div>
    </div>
  );
}

function Message({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}
