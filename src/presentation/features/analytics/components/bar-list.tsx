import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { Bucket } from "@/application/analytics/analytics";

/**
 * A horizontal bar chart (recharts) for a set of labelled counts. Theme-aware via
 * CSS variables; deterministic. Keeps the original `BarList` API so callers are
 * unchanged.
 */
export function BarList({
  buckets,
  emptyText = "No data.",
}: {
  buckets: Bucket[];
  emptyText?: string;
}) {
  if (buckets.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  }

  const height = Math.max(90, buckets.length * 34 + 16);
  const truncate = (label: string) =>
    label.length > 20 ? `${label.slice(0, 19)}…` : label;

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={buckets}
          margin={{ top: 4, right: 16, bottom: 4, left: 4 }}
          barCategoryGap={6}
        >
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            axisLine={{ stroke: "hsl(var(--border))" }}
            tickLine={{ stroke: "hsl(var(--border))" }}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={150}
            tickFormatter={truncate}
            tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "hsl(var(--muted) / 0.5)" }}
            contentStyle={{
              background: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              color: "hsl(var(--popover-foreground))",
              fontSize: 12,
            }}
            labelStyle={{ color: "hsl(var(--foreground))" }}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} fill="hsl(var(--primary))" maxBarSize={22}>
            {buckets.map((b) => (
              <Cell key={b.label} fill="hsl(var(--primary))" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
