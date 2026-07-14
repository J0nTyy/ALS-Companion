import { useState, type ReactNode } from "react";
import { Monitor, Moon, Sun, Check } from "lucide-react";

import { PageHeader } from "@/presentation/components/page-header";
import { HELP } from "@/presentation/features/help/help-sections";
import { Badge } from "@/presentation/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/presentation/components/ui/card";
import { Input } from "@/presentation/components/ui/input";
import { Select } from "@/presentation/components/ui/select";
import { cn } from "@/shared/lib/utils";
import { APP, MIGRATIONS } from "@/shared/config/app";
import { useTheme, type Theme } from "@/shared/hooks/use-theme";
import { useSettings } from "@/shared/hooks/use-settings";
import {
  ACCENT_COLORS,
  ACCENT_META,
  ANNOTATION_COLORS,
  PAGE_SIZE_META,
  type AnnotationSize,
  type ComparisonSyncDefault,
  type Density,
  type PageSize,
  type WheelSensitivity,
} from "@/shared/config/settings";
import {
  EXPORT_FORMATS,
  EXPORT_FORMAT_META,
  isExportFormat,
} from "@/application/export/export-types";

const THEME_OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

const DENSITY_OPTIONS: { value: Density; label: string }[] = [
  { value: "comfortable", label: "Comfortable" },
  { value: "compact", label: "Compact" },
];

const SIZE_OPTIONS: { value: AnnotationSize; label: string }[] = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
];
const WHEEL_OPTIONS: { value: WheelSensitivity; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];
const SYNC_OPTIONS: { value: ComparisonSyncDefault; label: string }[] = [
  { value: "none", label: "None" },
  { value: "zoom", label: "Zoom" },
  { value: "pan", label: "Pan" },
  { value: "both", label: "Both" },
];

/**
 * Settings collects the preferences a researcher can safely adjust. Appearance,
 * workspace, accessibility, viewer, and report/export options are functional today;
 * clearly-labelled "Planned" rows preview options that arrive with future features.
 */
export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { settings, update, reset } = useSettings();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        help={HELP.settings}
        description="Adjust how the app looks and behaves. Preferences are saved on this computer."
      />

      {/* -------------------------------------------------------- Appearance */}
      <Section title="Appearance" description="Theme, accent, and text density.">
        <Row label="Theme" description='"System" follows your computer’s setting.'>
          <div role="radiogroup" aria-label="Theme" className="flex flex-wrap gap-2">
            {THEME_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={theme === o.value}
                onClick={() => setTheme(o.value)}
                className={cn(chip, theme === o.value ? chipOn : chipOff)}
              >
                <o.icon className="h-4 w-4" />
                {o.label}
              </button>
            ))}
          </div>
        </Row>

        <Row label="Accent color" description="Used for buttons, links, and highlights.">
          <div role="radiogroup" aria-label="Accent color" className="flex flex-wrap gap-2">
            {ACCENT_COLORS.map((accent) => {
              const selected = settings.accentColor === accent;
              return (
                <button
                  key={accent}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={ACCENT_META[accent].label}
                  title={ACCENT_META[accent].label}
                  onClick={() => update({ accentColor: accent })}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full border-2 transition-transform hover:scale-105",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    selected ? "border-foreground" : "border-transparent",
                  )}
                  style={{ backgroundColor: ACCENT_META[accent].swatch }}
                >
                  {selected ? <Check className="h-4 w-4 text-white" /> : null}
                </button>
              );
            })}
          </div>
        </Row>

        <Row label="Density" description="Compact fits more on screen; comfortable is roomier.">
          <div role="radiogroup" aria-label="Density" className="flex flex-wrap gap-2">
            {DENSITY_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={settings.density === o.value}
                onClick={() => update({ density: o.value })}
                className={cn(chip, settings.density === o.value ? chipOn : chipOff)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </Row>

        <Toggle
          label="Larger text"
          description="Increase the overall text and control size."
          checked={settings.largerText}
          onChange={(v) => update({ largerText: v })}
        />

        <Toggle
          label="Collapse the sidebar by default"
          description="Start with the icon-only rail on a new workspace."
          checked={settings.sidebarDefaultCollapsed}
          onChange={(v) => update({ sidebarDefaultCollapsed: v })}
        />
      </Section>

      {/* --------------------------------------------------------- Workspace */}
      <Section title="Workspace" description="Defaults for everyday actions.">
        <Toggle
          label="Confirm before deleting"
          description="Ask for confirmation on delete. Whole-study deletes always confirm."
          checked={settings.confirmBeforeDelete}
          onChange={(v) => update({ confirmBeforeDelete: v })}
        />

        <Row label="Default export format" description="Pre-selected in the publication workspace.">
          <Select
            aria-label="Default export format"
            value={settings.defaultExportFormat}
            onChange={(e) => {
              if (isExportFormat(e.target.value))
                update({ defaultExportFormat: e.target.value });
            }}
            className="max-w-[16rem]"
          >
            {EXPORT_FORMATS.map((f) => (
              <option key={f} value={f}>
                {EXPORT_FORMAT_META[f].label}
              </option>
            ))}
          </Select>
        </Row>

        <Toggle
          label="Remember last opened study & animal"
          description="Offer to resume your last workspace from the dashboard."
          checked={settings.rememberLastWorkspace}
          onChange={(v) => update({ rememberLastWorkspace: v })}
        />

        <Row
          label="Default MRI comparison sync"
          description="How the comparison workspace starts each session."
        >
          <Segmented
            options={SYNC_OPTIONS}
            value={settings.comparisonSyncDefault}
            onChange={(v) => update({ comparisonSyncDefault: v })}
            ariaLabel="Default comparison sync"
          />
        </Row>
      </Section>

      {/* ------------------------------------------------------- Accessibility */}
      <Section title="Accessibility" description="Options for comfortable, inclusive use.">
        <Toggle
          label="High contrast"
          description="Stronger borders and secondary text for better legibility."
          checked={settings.highContrast}
          onChange={(v) => update({ highContrast: v })}
        />
        <Toggle
          label="Reduce motion"
          description="Minimize animations and transitions."
          checked={settings.reducedMotion}
          onChange={(v) => update({ reducedMotion: v })}
        />
        <Toggle
          label="Enhanced keyboard navigation"
          description="Show a “Skip to main content” link and strengthen focus outlines for keyboard users."
          checked={settings.enhancedKeyboardNav}
          onChange={(v) => update({ enhancedKeyboardNav: v })}
        />
      </Section>

      {/* -------------------------------------------------------------- Viewer */}
      <Section
        title="Viewer & annotations"
        description="How images and annotations look and behave."
      >
        <Row label="Annotation color" description="Color of points and rectangles you draw.">
          <div role="radiogroup" aria-label="Annotation color" className="flex flex-wrap gap-2">
            {ANNOTATION_COLORS.map((color) => {
              const selected = settings.annotationColor === color;
              return (
                <button
                  key={color}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={color}
                  title={color}
                  onClick={() => update({ annotationColor: color })}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full border-2 transition-transform hover:scale-105",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    selected ? "border-foreground" : "border-transparent",
                  )}
                  style={{ backgroundColor: color }}
                >
                  {selected ? <Check className="h-4 w-4 text-white" /> : null}
                </button>
              );
            })}
          </div>
        </Row>

        <Row label="Annotation size" description="Point diameter and rectangle line thickness.">
          <Segmented
            options={SIZE_OPTIONS}
            value={settings.annotationSize}
            onChange={(v) => update({ annotationSize: v })}
            ariaLabel="Annotation size"
          />
        </Row>

        <Row label="Measurement precision" description="Decimal places for normalized measurements.">
          <Select
            aria-label="Measurement precision"
            value={String(settings.measurementPrecision)}
            onChange={(e) =>
              update({ measurementPrecision: Number(e.target.value) })
            }
            className="max-w-[8rem]"
          >
            {[0, 1, 2, 3, 4].map((p) => (
              <option key={p} value={p}>
                {p} places
              </option>
            ))}
          </Select>
        </Row>

        <Row label="Mouse-wheel zoom sensitivity" description="How fast the wheel zooms images.">
          <Segmented
            options={WHEEL_OPTIONS}
            value={settings.wheelSensitivity}
            onChange={(v) => update({ wheelSensitivity: v })}
            ariaLabel="Mouse-wheel zoom sensitivity"
          />
        </Row>

        <Toggle
          label="Always show image coordinates"
          description="Show the live cursor-coordinate readout in the annotation viewer."
          checked={settings.showCoordinates}
          onChange={(v) => update({ showCoordinates: v })}
        />
        <Toggle
          label="Always show the measurement panel"
          description="Keep the ROI / measurement panel open, even with nothing selected."
          checked={settings.showMeasurementPanel}
          onChange={(v) => update({ showMeasurementPanel: v })}
        />
      </Section>

      {/* ------------------------------------------------------ Reports & export */}
      <Section
        title="Reports & export"
        description="What the publication workspace includes when you export."
      >
        <Toggle
          label="Include annotation summaries"
          checked={settings.exportIncludeAnnotations}
          onChange={(v) => update({ exportIncludeAnnotations: v })}
        />
        <Toggle
          label="Include derived measurements"
          checked={settings.exportIncludeMeasurements}
          onChange={(v) => update({ exportIncludeMeasurements: v })}
        />
        <Toggle
          label="Include longitudinal links"
          checked={settings.exportIncludeLinks}
          onChange={(v) => update({ exportIncludeLinks: v })}
        />
        <Toggle
          label="Include the image/file appendix"
          description="A reference list of the study's stored image files."
          checked={settings.exportIncludeAppendix}
          onChange={(v) => update({ exportIncludeAppendix: v })}
        />
        <Toggle
          label="Embed images in reports"
          description="Embed images inline in Word (.docx); attach the image files alongside a PDF."
          checked={settings.exportEmbedImages}
          onChange={(v) => update({ exportEmbedImages: v })}
        />
        <Row label="Page size" description="Paper size for PDF and Word reports.">
          <Select
            aria-label="Report page size"
            value={settings.exportPageSize}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "letter" || v === "a4") update({ exportPageSize: v });
            }}
            className="max-w-[16rem]"
          >
            {(["letter", "a4"] as PageSize[]).map((p) => (
              <option key={p} value={p}>
                {PAGE_SIZE_META[p].label}
              </option>
            ))}
          </Select>
        </Row>
        <Toggle
          label="Add a cover page"
          description="Start the report with a dedicated title page."
          checked={settings.exportCoverPage}
          onChange={(v) => update({ exportCoverPage: v })}
        />
        <Row
          label="Institution / laboratory"
          description="Shown on the cover page and in the running footer."
        >
          <Input
            aria-label="Institution or laboratory name"
            value={settings.exportInstitution}
            onChange={(e) => update({ exportInstitution: e.target.value })}
            placeholder="e.g. Dept. of Neurology, …"
            className="max-w-[16rem]"
          />
        </Row>
        <Toggle
          label="Header / footer with page numbering"
          description="Add a running footer with “Page X of Y” to every page."
          checked={settings.exportHeaderFooter}
          onChange={(v) => update({ exportHeaderFooter: v })}
        />
      </Section>

      {/* ---------------------------------------------------------------- Data */}
      <Section
        title="Data"
        description="Your research data lives in a local SQLite database on this computer."
      >
        <FutureRow label="Automatic backups" />
        <FutureRow label="Backup & restore reminders" />
      </Section>

      {/* --------------------------------------------------------------- About */}
      <AboutCard onReset={reset} />
    </div>
  );
}

// ------------------------------------------------------------------- helpers

const chip =
  "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const chipOn = "border-primary bg-primary/5 text-foreground";
const chipOff =
  "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="divide-y divide-border">{children}</CardContent>
    </Card>
  );
}

function Row({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Row label={label} {...(description ? { description } : {})}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          checked ? "bg-primary" : "bg-input",
        )}
      >
        <span
          className={cn(
            "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-5" : "translate-x-0.5",
          )}
        />
      </button>
    </Row>
  );
}

/** A compact segmented (single-choice) control for small option sets. */
function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-md border px-2.5 py-1.5 text-sm font-medium transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            value === o.value ? chipOn : chipOff,
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** A clearly-marked preview of a preference that a future feature will enable. */
function FutureRow({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between py-4 first:pt-0 last:pb-0 opacity-60">
      <p className="text-sm text-muted-foreground">{label}</p>
      <Badge variant="secondary">Planned</Badge>
    </div>
  );
}

function AboutCard({ onReset }: { onReset: () => void }) {
  const [showMigrations, setShowMigrations] = useState(false);
  return (
    <Card>
      <CardHeader>
        <CardTitle>About</CardTitle>
        <CardDescription>{APP.tagline}</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
          <AboutRow label="Application" value={APP.name} />
          <AboutRow label="Version" value={APP.version} />
          <AboutRow
            label="Database schema"
            value={`v${APP.schemaVersion} (${MIGRATIONS.length} migrations)`}
          />
          <AboutRow label="Storage" value="Local SQLite — on this computer" />
        </dl>

        <button
          type="button"
          onClick={() => setShowMigrations((v) => !v)}
          className="mt-4 text-sm font-medium text-primary hover:underline"
          aria-expanded={showMigrations}
        >
          {showMigrations ? "Hide" : "Show"} applied migrations
        </button>
        {showMigrations ? (
          <ol className="mt-2 space-y-1 text-xs text-muted-foreground">
            {MIGRATIONS.map((m) => (
              <li key={m.version}>
                <span className="font-medium text-foreground">v{m.version}</span> ·{" "}
                {m.description}
              </li>
            ))}
          </ol>
        ) : null}

        <p className="mt-4 text-xs text-muted-foreground">
          ALS Research Companion supports research productivity. It is not a diagnostic
          tool and must not be used to diagnose or treat any condition. All data stays
          on your computer.
        </p>

        <button
          type="button"
          onClick={onReset}
          className="mt-4 text-sm text-muted-foreground hover:text-foreground hover:underline"
        >
          Reset appearance & workspace preferences
        </button>
      </CardContent>
    </Card>
  );
}

function AboutRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-border pb-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}
