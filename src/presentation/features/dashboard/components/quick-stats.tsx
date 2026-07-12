import type { DashboardCountsView } from "@/application/use-cases/dashboard/dashboard-view";

/**
 * Quick statistics — REAL counts of existing data (never fabricated, no charts).
 * With an empty workspace every tile honestly reads 0.
 */
export function QuickStats({ counts }: { counts: DashboardCountsView }) {
  const tiles: Array<{ label: string; value: number; hint?: string }> = [
    {
      label: "Studies",
      value: counts.studiesTotal,
      hint: `${counts.studiesActive} active · ${counts.studiesArchived} archived`,
    },
    { label: "Animals", value: counts.animals },
    { label: "Observations", value: counts.observations },
    {
      label: "Timeline events",
      value: counts.timelinePlanned + counts.timelineCompleted,
      hint: `${counts.timelinePlanned} planned · ${counts.timelineCompleted} done`,
    },
    { label: "MRI sessions", value: counts.mriSessions },
    { label: "Research assets", value: counts.researchAssets },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className="rounded-lg border border-border bg-card p-4"
        >
          <p className="text-2xl font-semibold tabular-nums text-foreground">
            {tile.value}
          </p>
          <p className="text-xs font-medium text-muted-foreground">
            {tile.label}
          </p>
          {tile.hint ? (
            <p className="mt-0.5 text-[0.7rem] text-muted-foreground">
              {tile.hint}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
