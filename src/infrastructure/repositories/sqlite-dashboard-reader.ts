import type {
  AnimalSummary,
  DashboardReader,
  DashboardSnapshot,
  MriSessionSummary,
  ObservationSummary,
  ResearchAssetSummary,
  TimelineEventSummary,
} from "@/application/ports/dashboard-reader";
import { getDatabase } from "@/infrastructure/db/database";

/** How many recent rows each "recent X" list returns. */
const RECENT_LIMIT = 6;
/** Bound on planned events scanned for due-work / upcoming. */
const PLANNED_LIMIT = 50;
/** Bound on recently-completed events. */
const COMPLETED_LIMIT = 10;

interface CountsRow {
  animals: number;
  observations: number;
  mri_sessions: number;
  research_assets: number;
  timeline_planned: number;
  timeline_completed: number;
}
interface AnimalRow {
  id: string;
  study_id: string;
  study_name: string;
  animal_identifier: string;
  updated_at: string;
}
interface ObservationRow {
  id: string;
  animal_id: string;
  study_id: string;
  animal_identifier: string;
  kind: string;
  observed_on: string;
  updated_at: string;
}
interface MriRow {
  id: string;
  animal_id: string;
  study_id: string;
  animal_identifier: string;
  title: string;
  acquisition_date: string;
  updated_at: string;
}
interface AssetRow {
  id: string;
  animal_id: string;
  study_id: string;
  animal_identifier: string;
  title: string;
  asset_type: string;
  status: string;
  updated_at: string;
}
interface EventRow {
  id: string;
  animal_id: string;
  study_id: string;
  animal_identifier: string;
  title: string;
  category: string;
  status: string;
  planned_date: string | null;
  completed_date: string | null;
  updated_at: string;
}

function mapEvent(row: EventRow): TimelineEventSummary {
  return {
    id: row.id,
    animalId: row.animal_id,
    studyId: row.study_id,
    animalIdentifier: row.animal_identifier,
    title: row.title,
    category: row.category,
    status: row.status,
    updatedAt: row.updated_at,
    ...(row.planned_date ? { plannedDate: row.planned_date } : {}),
    ...(row.completed_date ? { completedDate: row.completed_date } : {}),
  };
}

const EVENT_COLUMNS = `te.id, te.animal_id, te.title, te.category, te.status,
  te.planned_date, te.completed_date, te.updated_at,
  a.study_id, a.animal_identifier`;

/**
 * SQLite-backed {@link DashboardReader}. A handful of read-only queries over the
 * existing tables — counts plus recent lists with parent context — run in
 * parallel. No new table, no writes.
 */
export class SqliteDashboardReader implements DashboardReader {
  async load(): Promise<DashboardSnapshot> {
    const db = await getDatabase();

    const [
      countsRows,
      animalRows,
      observationRows,
      mriRows,
      assetRows,
      plannedRows,
      completedRows,
    ] = await Promise.all([
      db.select<CountsRow[]>(
        `SELECT
           (SELECT COUNT(*) FROM animals) AS animals,
           (SELECT COUNT(*) FROM observations) AS observations,
           (SELECT COUNT(*) FROM mri_sessions) AS mri_sessions,
           (SELECT COUNT(*) FROM research_assets) AS research_assets,
           (SELECT COUNT(*) FROM timeline_events WHERE status = 'planned') AS timeline_planned,
           (SELECT COUNT(*) FROM timeline_events WHERE status = 'completed') AS timeline_completed`,
      ),
      db.select<AnimalRow[]>(
        `SELECT a.id, a.study_id, a.animal_identifier, a.updated_at,
                s.name AS study_name
         FROM animals a JOIN studies s ON s.id = a.study_id
         ORDER BY a.updated_at DESC LIMIT ${RECENT_LIMIT}`,
      ),
      db.select<ObservationRow[]>(
        `SELECT o.id, o.animal_id, o.kind, o.observed_on, o.updated_at,
                a.study_id, a.animal_identifier
         FROM observations o JOIN animals a ON a.id = o.animal_id
         ORDER BY o.updated_at DESC LIMIT ${RECENT_LIMIT}`,
      ),
      db.select<MriRow[]>(
        `SELECT m.id, m.title, m.acquisition_date, m.updated_at,
                te.animal_id, a.study_id, a.animal_identifier
         FROM mri_sessions m
         JOIN timeline_events te ON te.id = m.timeline_event_id
         JOIN animals a ON a.id = te.animal_id
         ORDER BY m.updated_at DESC LIMIT ${RECENT_LIMIT}`,
      ),
      db.select<AssetRow[]>(
        `SELECT ra.id, ra.title, ra.asset_type, ra.status, ra.updated_at,
                te.animal_id, a.study_id, a.animal_identifier
         FROM research_assets ra
         JOIN mri_sessions m ON m.id = ra.owner_id
         JOIN timeline_events te ON te.id = m.timeline_event_id
         JOIN animals a ON a.id = te.animal_id
         WHERE ra.owner_type = 'mri_session'
         ORDER BY ra.updated_at DESC LIMIT ${RECENT_LIMIT}`,
      ),
      db.select<EventRow[]>(
        `SELECT ${EVENT_COLUMNS}
         FROM timeline_events te JOIN animals a ON a.id = te.animal_id
         WHERE te.status = 'planned' AND te.planned_date IS NOT NULL
         ORDER BY te.planned_date ASC LIMIT ${PLANNED_LIMIT}`,
      ),
      db.select<EventRow[]>(
        `SELECT ${EVENT_COLUMNS}
         FROM timeline_events te JOIN animals a ON a.id = te.animal_id
         WHERE te.status = 'completed' AND te.completed_date IS NOT NULL
         ORDER BY te.completed_date DESC LIMIT ${COMPLETED_LIMIT}`,
      ),
    ]);

    const c = countsRows[0];

    const recentAnimals: AnimalSummary[] = animalRows.map((r) => ({
      id: r.id,
      studyId: r.study_id,
      studyName: r.study_name,
      animalIdentifier: r.animal_identifier,
      updatedAt: r.updated_at,
    }));
    const recentObservations: ObservationSummary[] = observationRows.map((r) => ({
      id: r.id,
      animalId: r.animal_id,
      studyId: r.study_id,
      animalIdentifier: r.animal_identifier,
      kind: r.kind,
      observedOn: r.observed_on,
      updatedAt: r.updated_at,
    }));
    const recentMriSessions: MriSessionSummary[] = mriRows.map((r) => ({
      id: r.id,
      animalId: r.animal_id,
      studyId: r.study_id,
      animalIdentifier: r.animal_identifier,
      title: r.title,
      acquisitionDate: r.acquisition_date,
      updatedAt: r.updated_at,
    }));
    const recentResearchAssets: ResearchAssetSummary[] = assetRows.map((r) => ({
      id: r.id,
      animalId: r.animal_id,
      studyId: r.study_id,
      animalIdentifier: r.animal_identifier,
      title: r.title,
      assetType: r.asset_type,
      status: r.status,
      updatedAt: r.updated_at,
    }));

    return {
      counts: {
        animals: Number(c?.animals ?? 0),
        observations: Number(c?.observations ?? 0),
        mriSessions: Number(c?.mri_sessions ?? 0),
        researchAssets: Number(c?.research_assets ?? 0),
        timelinePlanned: Number(c?.timeline_planned ?? 0),
        timelineCompleted: Number(c?.timeline_completed ?? 0),
      },
      recentAnimals,
      recentObservations,
      recentMriSessions,
      recentResearchAssets,
      plannedEvents: plannedRows.map(mapEvent),
      recentCompletedEvents: completedRows.map(mapEvent),
    };
  }
}
