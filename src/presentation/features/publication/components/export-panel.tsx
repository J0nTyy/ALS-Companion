import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

import type { PublicationPackage } from "@/application/use-cases/publication/publication-package";
import {
  EXPORT_FORMATS,
  EXPORT_FORMAT_META,
  isExportFormat,
  type ExportFormat,
} from "@/application/export/export-types";
import { Button } from "@/presentation/components/ui/button";
import { Select } from "@/presentation/components/ui/select";
import { Label } from "@/presentation/components/ui/label";
import { HelpHint } from "@/presentation/features/help/help-hint";
import { HELP } from "@/presentation/features/help/help-sections";
import { toUserMessage } from "@/presentation/lib/error-message";
import { useSettings } from "@/shared/hooks/use-settings";
import { useToast } from "@/presentation/features/toast/toast-context";
import { useExportService } from "../export-service-context";

type ExportMessage = { tone: "success" | "error" | "info"; text: string };

/**
 * Export the current package to a chosen format + destination. The engine is the
 * single output layer; this panel only chooses the format, triggers it, and reports
 * progress + the outcome. Disabled when the package is empty.
 */
export function ExportPanel({
  pkg,
  disabled,
}: {
  pkg: PublicationPackage | null;
  disabled: boolean;
}) {
  const exportService = useExportService();
  const { settings } = useSettings();
  const toast = useToast();
  // Seed from the researcher's preferred default; they can still change it here.
  const [format, setFormat] = useState<ExportFormat>(
    () => settings.defaultExportFormat,
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<ExportMessage | null>(null);

  // Apply the researcher's export content preferences by deriving a filtered
  // package (the engine stays unchanged — it just receives fewer items).
  function applyExportPreferences(source: PublicationPackage): PublicationPackage {
    return {
      ...source,
      ...(settings.exportIncludeAnnotations ? {} : { annotations: [] }),
      ...(settings.exportIncludeMeasurements ? {} : { measurements: [] }),
      ...(settings.exportIncludeLinks ? {} : { annotationLinks: [] }),
      ...(settings.exportIncludeAppendix ? {} : { storedFiles: [] }),
    };
  }

  async function run() {
    if (!pkg || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await exportService.export(applyExportPreferences(pkg), format, {
        attachImages: settings.exportEmbedImages,
        report: {
          pageSize: settings.exportPageSize,
          coverPage: settings.exportCoverPage,
          institution: settings.exportInstitution.trim(),
          headerFooter: settings.exportHeaderFooter,
        },
      });
      if (result.status === "cancelled") {
        setMessage({ tone: "info", text: "Export cancelled." });
      } else {
        const count = result.fileNames.length;
        const text = `Exported ${count} file${count === 1 ? "" : "s"} to ${result.directory}.`;
        setMessage({ tone: "success", text });
        toast.success(text);
      }
    } catch (error) {
      const text = toUserMessage(error, "The export failed. Please try again.");
      setMessage({ tone: "error", text });
      toast.error(text);
    } finally {
      setBusy(false);
    }
  }

  const toneClass =
    message?.tone === "error"
      ? "text-destructive"
      : message?.tone === "success"
        ? "text-success"
        : "text-muted-foreground";

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Download className="h-4 w-4 text-primary" />
        Export
        <HelpHint section={HELP.publication} label="exporting" className="ml-auto" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="export-format">Format</Label>
        <Select
          id="export-format"
          value={format}
          onChange={(e) => {
            if (isExportFormat(e.target.value)) setFormat(e.target.value);
          }}
          disabled={busy}
        >
          {EXPORT_FORMATS.map((f) => (
            <option key={f} value={f}>
              {EXPORT_FORMAT_META[f].label}
            </option>
          ))}
        </Select>
        <p className="text-xs text-muted-foreground">
          {EXPORT_FORMAT_META[format].description}
        </p>
      </div>

      <Button
        type="button"
        onClick={() => void run()}
        disabled={disabled || busy}
        className="w-full"
      >
        {busy ? <Loader2 className="animate-spin" /> : <Download />}
        {busy ? "Exporting…" : "Choose location & export"}
      </Button>

      {disabled && !busy ? (
        <p className="text-xs text-muted-foreground">
          Select a study with content to enable export.
        </p>
      ) : null}

      {message ? <p className={`text-sm ${toneClass}`}>{message.text}</p> : null}
    </div>
  );
}
