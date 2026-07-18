/**
 * The read-only tool registry. Every tool is a thin wrapper over an existing
 * application service, so the assistant can only surface data that already lives
 * in the workspace — it cannot fabricate records and cannot write anything. Adding
 * a capability later (or a write tool, gated by confirmation) means adding an entry
 * here; the agent loop is untouched.
 */
import type { AgentTool } from "@/application/ai/agent-tool";
import type { StudiesService } from "@/application/services/studies-service";
import type { AnimalsService } from "@/application/services/animals-service";
import type { ObservationsService } from "@/application/services/observations-service";
import type { TimelineEventsService } from "@/application/services/timeline-events-service";
import type { AnalyticsService } from "@/application/services/analytics-service";
import type { DashboardService } from "@/application/services/dashboard-service";
import type { SearchService } from "@/application/services/search-service";
import type { SearchQuery } from "@/domain/entities/search";
import type { BiomarkerService } from "@/application/services/biomarker-service";
import type { AgentProposal } from "@/application/ai/agent-proposals";
import type { NewBiomarkerResultInput } from "@/domain/entities/biomarker-result";
import {
  isObservationKind,
  type NewObservationInput,
  type ObservationKind,
} from "@/domain/entities/observation";
import {
  isTimelineEventCategory,
  isTimelineEventStatus,
  type NewTimelineEventInput,
} from "@/domain/entities/timeline-event";
import { searchGuideSections } from "@/shared/guide/guide-search";

export interface AgentToolDeps {
  studies: StudiesService;
  animals: AnimalsService;
  observations: ObservationsService;
  timeline: TimelineEventsService;
  analytics: AnalyticsService;
  dashboard: DashboardService;
  search: SearchService;
  biomarker: BiomarkerService;
}

const MAX_ROWS = 200;

function cap<T>(rows: T[]): T[] {
  return rows.length > MAX_ROWS ? rows.slice(0, MAX_ROWS) : rows;
}

function readString(args: Record<string, unknown>, key: string): string | undefined {
  const value = args[key];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

function readBoolean(args: Record<string, unknown>, key: string): boolean | undefined {
  const value = args[key];
  return typeof value === "boolean" ? value : undefined;
}

function requireString(args: Record<string, unknown>, key: string): string {
  const value = readString(args, key);
  if (value === undefined) throw new Error(`Missing required argument: "${key}".`);
  return value;
}

/** Read a number arg, tolerating a numeric string (the model sometimes quotes numbers). */
function readNumber(args: Record<string, unknown>, key: string): number | undefined {
  const value = args[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

/** Today's local date as `YYYY-MM-DD` (default for a proposed record's date). */
function todayIso(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function createAgentTools(deps: AgentToolDeps): AgentTool[] {
  const tools: AgentTool[] = [
    {
      name: "get_workspace_overview",
      description:
        "High-level snapshot of the whole workspace: counts of studies, animals, observations, MRI sessions, and timeline events; the current study; recent studies; upcoming timeline events; and overdue work. Use this to orient before drilling into a study.",
      parameters: { type: "object", properties: {}, required: [] },
      execute: async () => deps.dashboard.load(),
    },
    {
      name: "list_studies",
      description:
        "List studies in the workspace. Each study includes its id, name, strain, status, and description.",
      parameters: {
        type: "object",
        properties: {
          includeArchived: {
            type: "boolean",
            description: "Include archived studies (default false).",
          },
        },
        required: [],
      },
      execute: async (args) =>
        cap(
          await deps.studies.list({
            includeArchived: readBoolean(args, "includeArchived") ?? false,
          }),
        ),
    },
    {
      name: "get_study",
      description: "Get a single study by its id.",
      parameters: {
        type: "object",
        properties: { studyId: { type: "string", description: "The study id." } },
        required: ["studyId"],
      },
      execute: async (args) =>
        (await deps.studies.get(requireString(args, "studyId"))) ?? {
          error: "No study with that id.",
        },
    },
    {
      name: "list_animals",
      description:
        "List the animals (mice) in a study. Each animal includes its id, identifier, sex, mutation/genotype, treatment group, and dates.",
      parameters: {
        type: "object",
        properties: { studyId: { type: "string", description: "The study id." } },
        required: ["studyId"],
      },
      execute: async (args) =>
        cap(await deps.animals.listByStudy(requireString(args, "studyId"))),
    },
    {
      name: "get_animal",
      description: "Get a single animal by its id.",
      parameters: {
        type: "object",
        properties: { animalId: { type: "string", description: "The animal id." } },
        required: ["animalId"],
      },
      execute: async (args) =>
        (await deps.animals.get(requireString(args, "animalId"))) ?? {
          error: "No animal with that id.",
        },
    },
    {
      name: "list_observations",
      description:
        "List an animal's observations (for example body weight or a clinical score) in date order.",
      parameters: {
        type: "object",
        properties: { animalId: { type: "string", description: "The animal id." } },
        required: ["animalId"],
      },
      execute: async (args) =>
        cap(await deps.observations.listByAnimal(requireString(args, "animalId"))),
    },
    {
      name: "list_timeline_events",
      description:
        "List an animal's experiment-timeline events (planned and completed), including category, status, and dates.",
      parameters: {
        type: "object",
        properties: { animalId: { type: "string", description: "The animal id." } },
        required: ["animalId"],
      },
      execute: async (args) =>
        cap(await deps.timeline.listByAnimal(requireString(args, "animalId"))),
    },
    {
      name: "get_study_analytics",
      description:
        "Computed cohort analytics for one study: group sizes and summary statistics already calculated by the app. Use this to describe trends — do not recompute from raw rows.",
      parameters: {
        type: "object",
        properties: { studyId: { type: "string", description: "The study id." } },
        required: ["studyId"],
      },
      execute: async (args) => deps.analytics.forStudy(requireString(args, "studyId")),
    },
    {
      name: "get_overview_analytics",
      description:
        "Workspace-wide cohort analytics across all studies (group sizes and high-level summary numbers).",
      parameters: { type: "object", properties: {}, required: [] },
      execute: async () => deps.analytics.overview(),
    },
    {
      name: "search_records",
      description:
        "Full-text search across the workspace (studies, animals, protocols, timeline events, MRI sessions, observations, research assets). Returns grouped hits with a title, a context line, and an in-app route. Optionally restrict to one study.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "The text to search for." },
          studyId: {
            type: "string",
            description: "Optional: restrict results to this study.",
          },
        },
        required: ["query"],
      },
      execute: async (args) => {
        const studyId = readString(args, "studyId");
        const query: SearchQuery = {
          text: requireString(args, "query"),
          filters: studyId ? { studyId } : {},
        };
        return deps.search.search(query);
      },
    },
    {
      name: "search_user_guide",
      description:
        "Search the app's User Guide for how-to help (how to add or organise data, use a feature, etc.). Returns the most relevant guide sections as markdown. Use this to answer questions about how to use the app.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "What the user is trying to do.",
          },
        },
        required: [],
      },
      execute: async (args) => {
        const query = readString(args, "query") ?? "";
        // Loaded lazily so the guide markdown stays out of the initial bundle.
        const { USER_GUIDE } = await import("@/shared/guide/user-guide");
        const hits = searchGuideSections(USER_GUIDE.sections, query, 4);
        if (hits.length === 0) {
          return {
            note: "No guide section matched that query.",
            availableSections: USER_GUIDE.sections.map((section) => section.title),
          };
        }
        return hits.map((section) => ({ title: section.title, content: section.body }));
      },
    },
    {
      name: "list_biomarker_samples",
      description:
        "List the biomarker samples collected at a timeline event (biochemical-analysis events hold them). Use this to find a sample id before proposing a result.",
      parameters: {
        type: "object",
        properties: {
          timelineEventId: {
            type: "string",
            description: "The timeline-event id the samples hang off.",
          },
        },
        required: ["timelineEventId"],
      },
      execute: async (args) =>
        cap(await deps.biomarker.listSamples(requireString(args, "timelineEventId"))),
    },
    {
      name: "list_biomarker_results",
      description: "List the laboratory results already recorded for a biomarker sample.",
      parameters: {
        type: "object",
        properties: {
          biomarkerSampleId: { type: "string", description: "The biomarker sample id." },
        },
        required: ["biomarkerSampleId"],
      },
      execute: async (args) =>
        cap(await deps.biomarker.listResults(requireString(args, "biomarkerSampleId"))),
    },
    {
      name: "propose_observation",
      description:
        "Propose a new observation (a body weight in grams, or a motor score on a named scale) for an animal. Resolve the animal first (list_animals / get_animal) and pass its id. This does NOT save — it shows the researcher a card to confirm. Date defaults to today if omitted.",
      isProposal: true,
      parameters: {
        type: "object",
        properties: {
          animalId: { type: "string", description: "The animal id." },
          kind: {
            type: "string",
            description: "What was measured.",
            enum: ["body_weight", "motor_score"],
          },
          value: {
            type: "number",
            description: "Body weight in grams, or the motor score value.",
          },
          observedOn: {
            type: "string",
            description: "Date measured, YYYY-MM-DD. Defaults to today.",
          },
          scaleName: {
            type: "string",
            description: "Required for a motor score — the scale's name (e.g. 'hindlimb 0-5').",
          },
          notes: { type: "string", description: "Optional free-text context." },
        },
        required: ["animalId", "kind", "value"],
      },
      execute: async (args): Promise<AgentProposal> => {
        const animalId = requireString(args, "animalId");
        const kindRaw = requireString(args, "kind");
        if (!isObservationKind(kindRaw)) {
          throw new Error("kind must be 'body_weight' or 'motor_score'.");
        }
        const kind: ObservationKind = kindRaw;
        const value = readNumber(args, "value");
        if (value === undefined) throw new Error('Missing required numeric argument: "value".');
        const scaleName = readString(args, "scaleName");
        if (kind === "motor_score" && scaleName === undefined) {
          throw new Error("A motor score needs a scaleName (the name of the scoring scale).");
        }
        const notes = readString(args, "notes");
        const observedOn = readString(args, "observedOn") ?? todayIso();

        const animal = await deps.animals.get(animalId);
        if (!animal) throw new Error("No animal with that id.");

        const unit = kind === "body_weight" ? " g" : "";
        const label = kind === "body_weight" ? "Body weight" : "Motor score";
        const input: NewObservationInput = {
          animalId,
          studyId: animal.studyId,
          kind,
          observedOn,
          value,
          ...(scaleName ? { scaleName } : {}),
          ...(notes ? { notes } : {}),
        };
        return {
          type: "observation",
          title: "Observation",
          summary: `${label} ${value}${unit} for ${animal.animalIdentifier} on ${observedOn}`,
          fields: [
            { label: "Animal", value: animal.animalIdentifier },
            { label: "Measurement", value: label },
            { label: "Value", value: `${value}${unit}` },
            ...(scaleName ? [{ label: "Scale", value: scaleName }] : []),
            { label: "Date", value: observedOn },
            ...(notes ? [{ label: "Notes", value: notes }] : []),
          ],
          input,
        };
      },
    },
    {
      name: "propose_timeline_event",
      description:
        "Propose a new experiment-timeline event for an animal (planned or completed). Resolve the animal first and pass its id. Does NOT save — shows a confirmation card. A completed event defaults its completion date to today; a planned event defaults its planned date to today.",
      isProposal: true,
      parameters: {
        type: "object",
        properties: {
          animalId: { type: "string", description: "The animal id." },
          title: { type: "string", description: "Short title, e.g. 'Confirm SOD1 genotype'." },
          category: {
            type: "string",
            description: "Workflow category.",
            enum: [
              "gene_confirmation",
              "behavioral_assessment",
              "neurological_examination",
              "mri",
              "biochemical_analysis",
              "histopathology",
              "custom",
            ],
          },
          status: {
            type: "string",
            description: "planned or completed.",
            enum: ["planned", "completed"],
          },
          plannedDate: { type: "string", description: "YYYY-MM-DD (for a planned event)." },
          completedDate: { type: "string", description: "YYYY-MM-DD (for a completed event)." },
          notes: { type: "string", description: "Optional free-text context." },
        },
        required: ["animalId", "title", "category", "status"],
      },
      execute: async (args): Promise<AgentProposal> => {
        const animalId = requireString(args, "animalId");
        const title = requireString(args, "title");
        const category = requireString(args, "category");
        if (!isTimelineEventCategory(category)) throw new Error("Invalid timeline category.");
        const status = requireString(args, "status");
        if (!isTimelineEventStatus(status)) {
          throw new Error("status must be 'planned' or 'completed'.");
        }
        const notes = readString(args, "notes");
        const plannedDate =
          readString(args, "plannedDate") ?? (status === "planned" ? todayIso() : undefined);
        const completedDate =
          readString(args, "completedDate") ?? (status === "completed" ? todayIso() : undefined);

        const animal = await deps.animals.get(animalId);
        if (!animal) throw new Error("No animal with that id.");

        const input: NewTimelineEventInput = {
          animalId,
          studyId: animal.studyId,
          title,
          category,
          status,
          ...(plannedDate ? { plannedDate } : {}),
          ...(completedDate ? { completedDate } : {}),
          ...(notes ? { notes } : {}),
        };
        return {
          type: "timeline_event",
          title: "Timeline event",
          summary: `${title} (${status}) for ${animal.animalIdentifier}`,
          fields: [
            { label: "Animal", value: animal.animalIdentifier },
            { label: "Title", value: title },
            { label: "Category", value: category },
            { label: "Status", value: status },
            ...(plannedDate ? [{ label: "Planned", value: plannedDate }] : []),
            ...(completedDate ? [{ label: "Completed", value: completedDate }] : []),
            ...(notes ? [{ label: "Notes", value: notes }] : []),
          ],
          input,
        };
      },
    },
    {
      name: "propose_biomarker_result",
      description:
        "Propose a laboratory biomarker result for a biomarker sample. Find the sample id first (list_timeline_events → the biochemical-analysis event → list_biomarker_samples). Does NOT save — shows a confirmation card. The value is stored verbatim as text (e.g. '45.2', '< 0.05', 'not detected').",
      isProposal: true,
      parameters: {
        type: "object",
        properties: {
          biomarkerSampleId: { type: "string", description: "The biomarker sample id." },
          biomarkerName: {
            type: "string",
            description: "The biomarker measured, e.g. 'Neurofilament Light (NfL)'.",
          },
          value: { type: "string", description: "The reported value, verbatim (kept as text)." },
          unit: { type: "string", description: "Optional unit, e.g. 'pg/mL'." },
          method: { type: "string", description: "Optional assay/method, e.g. 'ELISA'." },
          notes: { type: "string", description: "Optional free-text context." },
        },
        required: ["biomarkerSampleId", "biomarkerName", "value"],
      },
      execute: async (args): Promise<AgentProposal> => {
        const biomarkerSampleId = requireString(args, "biomarkerSampleId");
        const biomarkerName = requireString(args, "biomarkerName");
        // Value is kept verbatim as text, but tolerate a numeric value from the model.
        const rawValue = args.value;
        const value =
          typeof rawValue === "number" ? String(rawValue) : readString(args, "value");
        if (value === undefined) throw new Error('Missing required argument: "value".');
        const unit = readString(args, "unit");
        const method = readString(args, "method");
        const notes = readString(args, "notes");

        const input: NewBiomarkerResultInput = {
          biomarkerSampleId,
          biomarkerName,
          value,
          ...(unit ? { unit } : {}),
          ...(method ? { method } : {}),
          ...(notes ? { notes } : {}),
        };
        return {
          type: "biomarker_result",
          title: "Biomarker result",
          summary: `${biomarkerName} = ${value}${unit ? ` ${unit}` : ""}`,
          fields: [
            { label: "Biomarker", value: biomarkerName },
            { label: "Value", value: `${value}${unit ? ` ${unit}` : ""}` },
            ...(method ? [{ label: "Method", value: method }] : []),
            ...(notes ? [{ label: "Notes", value: notes }] : []),
          ],
          input,
        };
      },
    },
    {
      name: "propose_study_summary",
      description:
        "Propose a narrative report summary for a study — saved on the study and included in its exports (PDF, Word, JSON). Resolve the study id first (list_studies / search_records) and gather the study's real data (animals, observation trends via get_study_analytics, timeline events, biomarker results), then write a substantive, multi-paragraph summary yourself — objective and design, cohort, what was done over the timeline, and the key quantitative findings with their specific values — and pass it as `summary`. Be specific, not generic. This does NOT save — it shows the researcher a confirmation card.",
      isProposal: true,
      parameters: {
        type: "object",
        properties: {
          studyId: { type: "string", description: "The study id." },
          summary: {
            type: "string",
            description:
              "The full, substantive report-summary text you have drafted for the study — several paragraphs, specific and grounded in the study's data.",
          },
        },
        required: ["studyId", "summary"],
      },
      execute: async (args): Promise<AgentProposal> => {
        const studyId = requireString(args, "studyId");
        const summary = requireString(args, "summary");
        const study = await deps.studies.get(studyId);
        if (!study) throw new Error("No study with that id.");
        return {
          type: "study_summary",
          title: "Report summary",
          summary: `Report summary for ${study.name}`,
          fields: [
            { label: "Study", value: study.name },
            { label: "Summary", value: summary },
          ],
          input: { studyId, summary },
        };
      },
    },
  ];

  return tools;
}
