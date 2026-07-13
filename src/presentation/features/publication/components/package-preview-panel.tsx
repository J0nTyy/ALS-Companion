import { AlertTriangle, FileText } from "lucide-react";

import type { PackagePreview } from "@/application/use-cases/publication/publication-package";

/**
 * The live, read-only preview of the in-memory publication package: which sections
 * are included, their item counts, and any warnings. It reflects the current
 * selection exactly — it never invents content.
 */
export function PackagePreviewPanel({ preview }: { preview: PackagePreview }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">
          Package preview
        </h2>
      </div>

      {preview.studyName ? (
        <p className="mt-1 text-sm text-muted-foreground">
          {preview.studyName} · {preview.totalItems}{" "}
          {preview.totalItems === 1 ? "item" : "items"}
        </p>
      ) : null}

      {preview.warnings.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {preview.warnings.map((warning) => (
            <li
              key={warning}
              className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning-foreground"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{warning}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {preview.sections.length > 0 ? (
        <dl className="mt-3 divide-y divide-border">
          {preview.sections.map((section) => (
            <div
              key={section.key}
              className="flex items-center justify-between py-1.5"
            >
              <dt
                className={
                  section.count > 0
                    ? "text-sm text-foreground"
                    : "text-sm text-muted-foreground"
                }
              >
                {section.label}
              </dt>
              <dd className="text-sm font-medium tabular-nums text-foreground">
                {section.count}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      <p className="mt-3 text-xs text-muted-foreground">
        Prepared in memory. Exporting (CSV, documents, reports) arrives in a future
        version.
      </p>
    </div>
  );
}
