import { Ruler } from "lucide-react";

import type { Annotation } from "@/domain/entities/annotation";
import { useSettings } from "@/shared/hooks/use-settings";
import {
  inspectAnnotation,
  type ImageDimensions,
  type Measurement,
  type PointMeasurement,
  type RectangleMeasurement,
  type Vec2,
} from "@/domain/measurements/measurement-engine";

/**
 * ROI Inspector (v1.6): a read-only panel that shows quantitative measurements for
 * the currently-selected annotation, computed LIVE by the MeasurementEngine.
 *
 * Nothing here is persisted and nothing here does geometry maths — it only calls
 * the engine and formats numbers. Pixel values appear only when the image's natural
 * dimensions are known; otherwise normalized values are shown (never fabricated).
 */
export function RoiInspector({
  annotation,
  imageDimensions,
  hasAnnotations,
  readOnly,
}: {
  annotation: Annotation | null;
  imageDimensions: ImageDimensions | null;
  hasAnnotations: boolean;
  readOnly: boolean;
}) {
  const { settings } = useSettings();
  const precision = settings.measurementPrecision;
  const measurement = inspectAnnotation(annotation, imageDimensions);

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Ruler className="h-4 w-4 text-primary" />
        Measurements
      </div>

      {measurement ? (
        <MeasurementBody measurement={measurement} precision={precision} />
      ) : (
        <p className="text-sm text-muted-foreground">
          {hasAnnotations
            ? "Select a mark on the image to see its measurements."
            : readOnly
              ? "This image has no annotations to measure."
              : "No annotations yet — add a point or rectangle to see its measurements."}
        </p>
      )}
    </div>
  );
}

function MeasurementBody({
  measurement,
  precision,
}: {
  measurement: Measurement;
  precision: number;
}) {
  if (measurement.kind === "point")
    return <PointBody measurement={measurement} precision={precision} />;
  return <RectangleBody measurement={measurement} precision={precision} />;
}

function PointBody({
  measurement,
  precision,
}: {
  measurement: PointMeasurement;
  precision: number;
}) {
  const { normalized, pixels } = measurement;
  return (
    <dl className="space-y-2">
      <Metric label="Position (normalized)" value={vecNorm(normalized, precision)} />
      {pixels ? (
        <Metric label="Position (pixels)" value={vecPx(pixels)} />
      ) : (
        <PixelsUnavailable />
      )}
    </dl>
  );
}

function RectangleBody({
  measurement,
  precision,
}: {
  measurement: RectangleMeasurement;
  precision: number;
}) {
  const { normalized, pixels, aspectRatio } = measurement;
  return (
    <div className="space-y-4">
      <Metric label="Aspect ratio (W:H)" value={`${aspectRatio.toFixed(2)} : 1`} />

      {pixels ? (
        <Section title="Pixels">
          <Metric label="Width" value={px(pixels.width)} />
          <Metric label="Height" value={px(pixels.height)} />
          <Metric label="Area" value={`${round(pixels.area)} px²`} />
          <Metric label="Perimeter" value={px(pixels.perimeter)} />
          <Metric label="Center" value={vecPx(pixels.center)} />
          <Metric label="Top-left" value={vecPx(pixels.topLeft)} />
          <Metric label="Bottom-right" value={vecPx(pixels.bottomRight)} />
        </Section>
      ) : (
        <PixelsUnavailable />
      )}

      <Section title="Normalized">
        <Metric label="Width" value={norm(normalized.width, precision)} />
        <Metric label="Height" value={norm(normalized.height, precision)} />
        <Metric label="Center" value={vecNorm(normalized.center, precision)} />
        <Metric label="Top-left" value={vecNorm(normalized.topLeft, precision)} />
        <Metric label="Bottom-right" value={vecNorm(normalized.bottomRight, precision)} />
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <dl className="space-y-2">{children}</dl>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium tabular-nums text-foreground">
        {value}
      </dd>
    </div>
  );
}

function PixelsUnavailable() {
  return (
    <p className="text-xs italic text-muted-foreground">
      Pixel measurements appear once the image has loaded.
    </p>
  );
}

// --- formatting only (no geometry maths) ---
function round(n: number): number {
  return Math.round(n);
}
function px(n: number): string {
  return `${round(n)} px`;
}
function norm(n: number, precision: number): string {
  return n.toFixed(precision);
}
function vecNorm(v: Vec2, precision: number): string {
  return `(${norm(v.x, precision)}, ${norm(v.y, precision)})`;
}
function vecPx(v: Vec2): string {
  return `(${round(v.x)}, ${round(v.y)}) px`;
}
