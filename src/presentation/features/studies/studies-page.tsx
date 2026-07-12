import { useNavigate } from "react-router-dom";
import { AlertTriangle, FlaskConical, Plus } from "lucide-react";

import { PageHeader } from "@/presentation/components/page-header";
import { EmptyState } from "@/presentation/components/empty-state";
import { LoadingState } from "@/presentation/components/loading-state";
import { Button } from "@/presentation/components/ui/button";
import { DesktopOnlyNotice } from "./components/desktop-only-notice";
import { StudyListItem } from "./components/study-list-item";
import { useStudies } from "./use-studies";

/**
 * Studies list — the researcher's workspace. Handles every real state honestly:
 * browser preview (saving unavailable), loading, error, empty, and a populated
 * list. Archived studies are hidden until the researcher asks to see them.
 */
export function StudiesPage() {
  const navigate = useNavigate();
  const { state, includeArchived, setIncludeArchived, reload } = useStudies();

  const newStudyButton = (
    <Button onClick={() => navigate("/studies/new")}>
      <Plus />
      New study
    </Button>
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Studies"
        description="Each study holds a cohort of animals, its protocol, and the observations you record over time."
        actions={
          state.status === "ready" && state.studies.length > 0
            ? newStudyButton
            : undefined
        }
      />

      {state.status === "unavailable" ? <DesktopOnlyNotice /> : null}

      {state.status === "loading" ? (
        <LoadingState label="Opening your studies…" />
      ) : null}

      {state.status === "error" ? (
        <EmptyState
          icon={AlertTriangle}
          title="We couldn't open your studies"
          description={state.message}
          action={
            <Button variant="outline" onClick={() => void reload()}>
              Try again
            </Button>
          }
        />
      ) : null}

      {state.status === "ready" ? (
        <div className="space-y-5">
          <ArchivedToggle
            checked={includeArchived}
            onChange={setIncludeArchived}
          />

          {state.studies.length === 0 ? (
            <EmptyState
              icon={FlaskConical}
              title={includeArchived ? "No studies yet" : "No active studies"}
              description={
                includeArchived
                  ? "A study is the starting point for your research. Create one to begin adding animals and recording observations."
                  : "You have no active studies. Create one, or switch on “Show archived” to see archived studies."
              }
              action={newStudyButton}
            />
          ) : (
            <ul className="space-y-3">
              {state.studies.map((study) => (
                <li key={study.id}>
                  <StudyListItem study={study} />
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

function ArchivedToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-end">
      <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="h-4 w-4 rounded border-input accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        />
        Show archived
      </label>
    </div>
  );
}
