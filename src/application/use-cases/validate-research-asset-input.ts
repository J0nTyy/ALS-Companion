import {
  isResearchAssetType,
  SELECTABLE_RESEARCH_ASSET_STATUSES,
  type ResearchAssetStatus,
  type ResearchAssetType,
} from "@/domain/entities/research-asset";
import { ValidationError } from "@/application/errors";

/** Raw fields coming from a form. */
export interface ResearchAssetFieldsInput {
  assetType?: string;
  title?: string;
  description?: string;
  status?: string;
}

/** Clean, validated fields ready to build a {@link ResearchAsset}. */
export interface ValidatedResearchAssetFields {
  assetType: ResearchAssetType;
  title: string;
  status: ResearchAssetStatus;
  description?: string;
}

/**
 * Validate and normalize a research asset's metadata fields.
 *
 * - `title` is trimmed and must be non-empty.
 * - `assetType` must be a known asset type.
 * - `status` defaults to "planned" and must be one a researcher may set today.
 *   "attached" is intentionally rejected here: it is reserved for the future
 *   attachment subsystem to set automatically once a real file is attached, so
 *   choosing it manually would imply a file exists when it does not.
 * - `description` is trimmed; a blank is dropped.
 */
export function validateResearchAssetFields(
  input: ResearchAssetFieldsInput,
): ValidatedResearchAssetFields {
  const title = (input.title ?? "").trim();
  if (title.length === 0) {
    throw new ValidationError("Please enter an asset title.", "title");
  }

  const assetType = input.assetType ?? "";
  if (!isResearchAssetType(assetType)) {
    throw new ValidationError("Please choose a valid asset type.", "assetType");
  }

  const status = input.status ?? "planned";
  if (
    !(SELECTABLE_RESEARCH_ASSET_STATUSES as readonly string[]).includes(status)
  ) {
    throw new ValidationError(
      'Please choose a valid status. "Attached" is set automatically once a file is attached in a future version.',
      "status",
    );
  }

  const description = (input.description ?? "").trim();

  return {
    assetType,
    title,
    status: status as ResearchAssetStatus,
    ...(description.length > 0 ? { description } : {}),
  };
}
