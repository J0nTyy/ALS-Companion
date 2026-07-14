import { useCallback, useEffect, useState } from "react";
import { BarChart3, Check, X } from "lucide-react";

import type { Study } from "@/domain/entities/study";
import type {
  AnalyticsFilters,
  OverviewAnalytics,
  StudyAnalytics,
} from "@/application/analytics/analytics";
import type { StudyAnalyticsResult } from "@/application/services/analytics-service";
import { PageHeader } from "@/presentation/components/page-header";
import { HELP } from "@/presentation/features/help/help-sections";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/presentation/components/ui/card";
import { Label } from "@/presentation/components/ui/label";
import { Select } from "@/presentation/components/ui/select";
import { Input } from "@/presentation/components/ui/input";
import { Button } from "@/presentation/components/ui/button";
import { isTauri } from "@/infrastructure/platform/environment";
import { toUserMessage } from "@/presentation/lib/error-message";
import { useAnalyticsService } from "./analytics-service-context";
import { BarList } from "./components/bar-list";

type Mode = { kind: "overview" } | { kind: "study"; studyId: string };

/**
 * Read-only cohort Analytics Workspace. Computes deterministic statistics from
 * existing data (no persistence, no AI, no prediction). "All studies" shows a
 * cohort overview; selecting a study shows detailed, filterable statistics.
 */
export function AnalyticsPage() {
  const service = useAnalyticsService();
  const [studies, setStudies] = useState<Study[] | null>(null);
  const [mode, setMode] = useState<Mode>({ kind: "overview" });
  const [filters, setFilters] = useState<AnalyticsFilters>({});
  const [overview, setOverview] = useState<OverviewAnalytics | null>(null);
  const [study, setStudy] = useState<StudyAnalyticsResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const available = isTauri();

  useEffect(() => {
    if (!available) return;
    service.listStudies().then(setStudies).catch(() => setStudies([]));
  }, [service, available]);

  const load = useCallback(async () => {
    if (!available) return;
    setError(null);
    try {
      if (mode.kind === "overview") {
        setOverview(await service.overview());
      } else {
        setStudy(await service.forStudy(mode.studyId, filters));
      }
    } catch (e) {
      setError(toUserMessage(e, "We couldn't compute analytics."));
    }
  }, [service, available, mode, filters]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        help={HELP.dashboard}
        description="Read-only cohort statistics computed from your data. Nothing here is saved or predicted."
      />

      {!available ? (
        <Message>Analytics are available in the installed desktop app.</Message>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="analytics-study">Scope</Label>
              <Select
                id="analytics-study"
                value={mode.kind === "overview" ? "" : mode.studyId}
                onChange={(e) => {
                  setFilters({});
                  setMode(e.target.value ? { kind: "study", studyId: e.target.value } : { kind: "overview" });
                }}
              >
                <option value="">All studies (cohort overview)</option>
                {(studies ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>

            {mode.kind === "study" && study ? (
              <StudyFilters
                options={study.options}
                filters={filters}
                onChange={setFilters}
              />
            ) : null}
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          {mode.kind === "overview" && overview ? (
            <OverviewView data={overview} studyCount={studies?.length ?? 0} />
          ) : null}
          {mode.kind === "study" && study ? (
            <StudyView data={study.analytics} />
          ) : null}
        </>
      )}
    </div>
  );
}

function StudyFilters({
  options,
  filters,
  onChange,
}: {
  options: { treatmentGroups: string[]; mutations: string[] };
  filters: AnalyticsFilters;
  onChange: (f: AnalyticsFilters) => void;
}) {
  const set = (patch: Partial<AnalyticsFilters>) => onChange({ ...filters, ...patch });
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="f-group">Treatment group</Label>
        <Select
          id="f-group"
          value={filters.treatmentGroup ?? ""}
          onChange={(e) => set({ treatmentGroup: e.target.value || undefined })}
        >
          <option value="">All</option>
          {options.treatmentGroups.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="f-mutation">Mutation</Label>
        <Select
          id="f-mutation"
          value={filters.mutation ?? ""}
          onChange={(e) => set({ mutation: e.target.value || undefined })}
        >
          <option value="">All</option>
          {options.mutations.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="f-from">Observations from</Label>
        <Input id="f-from" type="date" value={filters.dateFrom ?? ""}
          onChange={(e) => set({ dateFrom: e.target.value || undefined })} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="f-to">to</Label>
        <Input id="f-to" type="date" value={filters.dateTo ?? ""}
          onChange={(e) => set({ dateTo: e.target.value || undefined })} />
      </div>
      {(filters.treatmentGroup || filters.mutation || filters.dateFrom || filters.dateTo) ? (
        <Button variant="ghost" size="sm" onClick={() => onChange({})}>Clear filters</Button>
      ) : null}
    </>
  );
}

function OverviewView({ data, studyCount }: { data: OverviewAnalytics; studyCount: number }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Studies" value={studyCount} />
        <Stat label="Active" value={data.studies.active} />
        <Stat label="Archived" value={data.studies.archived} />
        <Stat label="Animals" value={data.animals.total} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Studies by status"><BarList buckets={data.studies.byStatus} /></Panel>
        <Panel title="Animals by treatment group"><BarList buckets={data.animals.byTreatmentGroup} /></Panel>
        <Panel title="Animals by mutation"><BarList buckets={data.animals.byMutation} /></Panel>
      </div>
    </div>
  );
}

function StudyView({ data }: { data: StudyAnalytics }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Animals" value={data.animals} />
        <Stat label="Timeline done" value={`${data.timeline.completionPct}%`} />
        <Stat label="Observations" value={data.observations.total} />
        <Stat label="MRI sessions" value={data.mri.sessions} />
        <Stat label="Histology" value={data.histology.sessions} />
        <Stat label="Biomarker results" value={data.biomarker.results} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Timeline events by category"><BarList buckets={data.timeline.byCategory} emptyText="No timeline events." /></Panel>
        <Panel title="Observations by type"><BarList buckets={data.observations.byKind} emptyText="No observations." /></Panel>
        <Panel title="Treatment groups"><BarList buckets={data.byTreatmentGroup} emptyText="No animals." /></Panel>
        <Panel title="Mutations"><BarList buckets={data.byMutation} emptyText="No animals." /></Panel>
        <Panel title="Histology by stain"><BarList buckets={data.histology.byStain} emptyText="No histology sessions." /></Panel>
        <Panel title="Biomarker samples by type"><BarList buckets={data.biomarker.bySampleType} emptyText="No biomarker samples." /></Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Imaging & annotations">
          <dl className="space-y-1.5 text-sm">
            <StatRow label="MRI sessions" value={data.mri.sessions} />
            <StatRow label="Histology sessions" value={data.histology.sessions} />
            <StatRow label="Annotations (point / rectangle)" value={`${data.annotations.total} (${data.annotations.points} / ${data.annotations.rectangles})`} />
            <StatRow label="Longitudinal links" value={data.annotations.links} />
            <StatRow label="Derived measurements" value={data.measurements.total} />
            <StatRow label="Distinct biomarkers" value={data.biomarker.distinctBiomarkers} />
          </dl>
        </Panel>
        <Panel title={`Publication readiness — ${data.publicationReadiness.score}%`}>
          <ul className="space-y-1.5">
            {data.publicationReadiness.checks.map((c) => (
              <li key={c.label} className="flex items-center gap-2 text-sm">
                {c.ok ? (
                  <Check className="h-4 w-4 text-success" aria-hidden="true" />
                ) : (
                  <X className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                )}
                <span className={c.ok ? "text-foreground" : "text-muted-foreground"}>
                  {c.label}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-2xl font-semibold tabular-nums text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function StatRow({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums text-foreground">{value}</dd>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Message({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}
