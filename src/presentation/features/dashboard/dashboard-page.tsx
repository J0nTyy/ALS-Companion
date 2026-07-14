import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Activity, History, X } from "lucide-react";

import {
  clearLastWorkspace,
  readLastWorkspace,
} from "@/shared/lib/last-workspace";

import { STUDY_STATUS_META } from "@/domain/entities/study";
import {
  isObservationKind,
  OBSERVATION_KIND_META,
} from "@/domain/entities/observation";
import {
  isResearchAssetType,
  RESEARCH_ASSET_TYPE_META,
} from "@/domain/entities/research-asset";
import type { DashboardViewModel } from "@/application/use-cases/dashboard/dashboard-view";
import {
  animalRoute,
  studyRoute,
} from "@/application/use-cases/dashboard/dashboard-view";
import { Button } from "@/presentation/components/ui/button";
import { HelpHint } from "@/presentation/features/help/help-hint";
import { HELP } from "@/presentation/features/help/help-sections";
import { formatDateOnly } from "@/shared/lib/format";
import { useDashboard } from "./use-dashboard";
import { DashboardCard } from "./components/dashboard-card";
import { SummaryList } from "./components/summary-list";
import { QuickStats } from "./components/quick-stats";
import { QuickActions } from "./components/quick-actions";
import { TodaysWork } from "./components/todays-work";
import { RecentActivity } from "./components/recent-activity";

const observationLabel = (kind: string) =>
  isObservationKind(kind) ? OBSERVATION_KIND_META[kind].label : kind;
const assetLabel = (type: string) =>
  isResearchAssetType(type) ? RESEARCH_ASSET_TYPE_META[type].label : type;

/** "Continue where you left off" — links to the last study/animal the researcher
 *  visited (if the remember-workspace preference is on and one was recorded). */
function ResumeCard() {
  const [ws, setWs] = useState(() => readLastWorkspace());
  if (!ws) return null;
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <History className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <p className="truncate text-sm text-foreground">
          Continue where you left off — {ws.label}.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button asChild size="sm" variant="outline">
          <Link to={ws.path}>
            Resume
            <ArrowRight />
          </Link>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Dismiss resume"
          onClick={() => {
            clearLastWorkspace();
            setWs(null);
          }}
        >
          <X />
        </Button>
      </div>
    </div>
  );
}

/**
 * The Research Dashboard — the home screen. It summarizes the CURRENT research
 * state from existing data only (no fabrication, no charts, no statistics engine),
 * with an honest empty state on every card.
 */
export function DashboardPage() {
  const { state, reload } = useDashboard();

  if (state.status === "unavailable") {
    return (
      <Shell>
        <Message>
          Your dashboard is available in the installed desktop app, where your
          studies are saved on this computer.
        </Message>
      </Shell>
    );
  }
  if (state.status === "loading") {
    return (
      <Shell>
        <Message>Loading your dashboard…</Message>
      </Shell>
    );
  }
  if (state.status === "error") {
    return (
      <Shell>
        <div className="space-y-2">
          <p className="text-sm text-destructive">{state.message}</p>
          <Button variant="outline" size="sm" onClick={() => void reload()}>
            Try again
          </Button>
        </div>
      </Shell>
    );
  }

  return <DashboardReady data={state.data} />;
}

function DashboardReady({ data }: { data: DashboardViewModel }) {
  const hasActivity = data.recentActivity.length > 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-foreground">
            Dashboard
            <HelpHint section={HELP.dashboard} label="dashboard" className="h-6 w-6" />
          </h1>
          {data.currentStudy ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Current study:{" "}
              <Link
                to={studyRoute(data.currentStudy.id)}
                className="font-medium text-foreground hover:underline"
              >
                {data.currentStudy.name}
              </Link>{" "}
              · {STUDY_STATUS_META[data.currentStudy.status].label}
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first study to start tracking a cohort.
            </p>
          )}
        </div>
        {data.currentStudy ? (
          <Button asChild variant="outline" size="sm">
            <Link to={studyRoute(data.currentStudy.id)}>
              Open current study
              <ArrowRight />
            </Link>
          </Button>
        ) : (
          <Button asChild size="sm">
            <Link to="/studies/new">
              New study
              <ArrowRight />
            </Link>
          </Button>
        )}
      </header>

      <ResumeCard />
      <QuickActions actions={data.quickActions} />
      <QuickStats counts={data.counts} />
      <TodaysWork dueWork={data.dueWork} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <DashboardCard
          title="Recent activity"
          icon={<Activity className="h-4 w-4 text-primary" />}
          isEmpty={!hasActivity}
          emptyText="No activity yet. As you add studies, animals, and observations, they'll appear here."
        >
          <RecentActivity groups={data.recentActivity} />
        </DashboardCard>

        <DashboardCard
          title="Recent studies"
          action={{ label: "All studies", to: "/studies" }}
          isEmpty={data.recentStudies.length === 0}
          emptyText="No studies yet."
        >
          <SummaryList
            rows={data.recentStudies.map((s) => ({
              key: s.id,
              title: s.name,
              subtitle: s.strain,
              meta: STUDY_STATUS_META[s.status].label,
              to: studyRoute(s.id),
            }))}
          />
        </DashboardCard>

        <DashboardCard
          title="Recent animals"
          isEmpty={data.recentAnimals.length === 0}
          emptyText="No animals yet."
        >
          <SummaryList
            rows={data.recentAnimals.map((a) => ({
              key: a.id,
              title: a.animalIdentifier,
              subtitle: a.studyName,
              to: animalRoute(a.studyId, a.id),
            }))}
          />
        </DashboardCard>

        <DashboardCard
          title="Upcoming timeline events"
          isEmpty={data.upcomingEvents.length === 0}
          emptyText="No upcoming planned events."
        >
          <SummaryList
            rows={data.upcomingEvents.map((e) => ({
              key: e.id,
              title: e.title,
              subtitle: e.animalIdentifier,
              ...(e.plannedDate ? { meta: formatDateOnly(e.plannedDate) } : {}),
              to: animalRoute(e.studyId, e.animalId),
            }))}
          />
        </DashboardCard>

        <DashboardCard
          title="Recently completed events"
          isEmpty={data.recentlyCompletedEvents.length === 0}
          emptyText="No completed events yet."
        >
          <SummaryList
            rows={data.recentlyCompletedEvents.map((e) => ({
              key: e.id,
              title: e.title,
              subtitle: e.animalIdentifier,
              ...(e.completedDate
                ? { meta: formatDateOnly(e.completedDate) }
                : {}),
              to: animalRoute(e.studyId, e.animalId),
            }))}
          />
        </DashboardCard>

        <DashboardCard
          title="Recent observations"
          isEmpty={data.recentObservations.length === 0}
          emptyText="No observations recorded yet."
        >
          <SummaryList
            rows={data.recentObservations.map((o) => ({
              key: o.id,
              title: observationLabel(o.kind),
              subtitle: o.animalIdentifier,
              meta: formatDateOnly(o.observedOn),
              to: animalRoute(o.studyId, o.animalId),
            }))}
          />
        </DashboardCard>

        <DashboardCard
          title="Recent MRI sessions"
          isEmpty={data.recentMriSessions.length === 0}
          emptyText="No MRI sessions yet."
        >
          <SummaryList
            rows={data.recentMriSessions.map((m) => ({
              key: m.id,
              title: m.title,
              subtitle: m.animalIdentifier,
              meta: formatDateOnly(m.acquisitionDate),
              to: animalRoute(m.studyId, m.animalId),
            }))}
          />
        </DashboardCard>

        <DashboardCard
          title="Recent research assets"
          isEmpty={data.recentResearchAssets.length === 0}
          emptyText="No research assets yet."
        >
          <SummaryList
            rows={data.recentResearchAssets.map((r) => ({
              key: r.id,
              title: r.title,
              subtitle: r.animalIdentifier,
              meta: assetLabel(r.assetType),
              to: animalRoute(r.studyId, r.animalId),
            }))}
          />
        </DashboardCard>
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
      {children}
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
