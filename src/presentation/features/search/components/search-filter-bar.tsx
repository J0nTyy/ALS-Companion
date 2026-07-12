import { useId } from "react";

import {
  SEARCH_ENTITY_TYPES,
  SEARCH_ENTITY_TYPE_META,
} from "@/domain/entities/search";
import {
  TIMELINE_EVENT_CATEGORIES,
  TIMELINE_EVENT_CATEGORY_META,
} from "@/domain/entities/timeline-event";
import {
  OBSERVATION_KINDS,
  OBSERVATION_KIND_META,
} from "@/domain/entities/observation";
import {
  MRI_MODALITIES,
  MRI_MODALITY_META,
} from "@/domain/entities/mri-session";
import {
  RESEARCH_ASSET_TYPES,
  RESEARCH_ASSET_TYPE_META,
} from "@/domain/entities/research-asset";
import { Button } from "@/presentation/components/ui/button";
import { Input } from "@/presentation/components/ui/input";
import { Label } from "@/presentation/components/ui/label";
import { Select } from "@/presentation/components/ui/select";
import type { SearchFormValues } from "../search-form";

/**
 * A cross-entity lifecycle status naturally selects whichever status-bearing
 * entities use that value (study / timeline event / research asset).
 */
const STATUS_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "planning", label: "Study · Planning" },
  { value: "active", label: "Study · Active" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Study · Archived" },
  { value: "planned", label: "Planned" },
  { value: "pending_attachment", label: "Asset · Pending attachment" },
  { value: "attached", label: "Asset · Attached" },
];

/**
 * The filter controls for the Search page. Every filter is optional and they
 * combine; leaving them empty searches on text alone. New filters slot into this
 * bar without touching the search architecture.
 */
export function SearchFilterBar({
  values,
  onChange,
  onClear,
  hasActiveFilters,
}: {
  values: SearchFormValues;
  onChange: (patch: Partial<SearchFormValues>) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
}) {
  const scopeId = useId();
  const categoryId = useId();
  const kindId = useId();
  const modalityId = useId();
  const assetTypeId = useId();
  const statusId = useId();
  const mutationId = useId();
  const treatmentId = useId();
  const fromId = useId();
  const toId = useId();

  return (
    <div className="rounded-lg border border-border bg-card/50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Filters</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClear}
          disabled={!hasActiveFilters}
        >
          Clear filters
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field id={scopeId} label="Search in">
          <Select
            id={scopeId}
            value={values.typeScope}
            onChange={(e) =>
              onChange({ typeScope: e.target.value as SearchFormValues["typeScope"] })
            }
          >
            <option value="all">Everything</option>
            {SEARCH_ENTITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {SEARCH_ENTITY_TYPE_META[t].pluralLabel}
              </option>
            ))}
          </Select>
        </Field>

        <Field id={categoryId} label="Timeline category">
          <Select
            id={categoryId}
            value={values.timelineCategory}
            onChange={(e) =>
              onChange({
                timelineCategory: e.target.value as SearchFormValues["timelineCategory"],
              })
            }
          >
            <option value="">Any</option>
            {TIMELINE_EVENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {TIMELINE_EVENT_CATEGORY_META[c].label}
              </option>
            ))}
          </Select>
        </Field>

        <Field id={kindId} label="Observation type">
          <Select
            id={kindId}
            value={values.observationType}
            onChange={(e) =>
              onChange({
                observationType: e.target.value as SearchFormValues["observationType"],
              })
            }
          >
            <option value="">Any</option>
            {OBSERVATION_KINDS.map((k) => (
              <option key={k} value={k}>
                {OBSERVATION_KIND_META[k].label}
              </option>
            ))}
          </Select>
        </Field>

        <Field id={modalityId} label="MRI modality">
          <Select
            id={modalityId}
            value={values.mriModality}
            onChange={(e) =>
              onChange({ mriModality: e.target.value as SearchFormValues["mriModality"] })
            }
          >
            <option value="">Any</option>
            {MRI_MODALITIES.map((m) => (
              <option key={m} value={m}>
                {MRI_MODALITY_META[m].label}
              </option>
            ))}
          </Select>
        </Field>

        <Field id={assetTypeId} label="Research asset type">
          <Select
            id={assetTypeId}
            value={values.researchAssetType}
            onChange={(e) =>
              onChange({
                researchAssetType: e.target.value as SearchFormValues["researchAssetType"],
              })
            }
          >
            <option value="">Any</option>
            {RESEARCH_ASSET_TYPES.map((t) => (
              <option key={t} value={t}>
                {RESEARCH_ASSET_TYPE_META[t].label}
              </option>
            ))}
          </Select>
        </Field>

        <Field id={statusId} label="Status">
          <Select
            id={statusId}
            value={values.status}
            onChange={(e) => onChange({ status: e.target.value })}
          >
            <option value="">Any</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field id={mutationId} label="Mutation">
          <Input
            id={mutationId}
            value={values.mutation}
            onChange={(e) => onChange({ mutation: e.target.value })}
            placeholder="e.g. SOD1"
            autoComplete="off"
          />
        </Field>

        <Field id={treatmentId} label="Treatment group">
          <Input
            id={treatmentId}
            value={values.treatmentGroup}
            onChange={(e) => onChange({ treatmentGroup: e.target.value })}
            placeholder="e.g. Riluzole"
            autoComplete="off"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field id={fromId} label="From">
            <Input
              id={fromId}
              type="date"
              value={values.dateFrom}
              onChange={(e) => onChange({ dateFrom: e.target.value })}
            />
          </Field>
          <Field id={toId} label="To">
            <Input
              id={toId}
              type="date"
              value={values.dateTo}
              onChange={(e) => onChange({ dateTo: e.target.value })}
            />
          </Field>
        </div>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
