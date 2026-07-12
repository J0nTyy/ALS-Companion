/**
 * Composition root for the Research Dashboard (v1.2).
 * ----------------------------------------------------------------------------
 * Wires the dashboard's **orchestration layer**: it reuses the already-built
 * `studiesService` (existing application service), a read-only `DashboardReader`
 * over the existing tables (no new persistence), and the system calendar. Safe to
 * import in the browser preview — the reader connects to SQLite lazily.
 */
import {
  createDashboardService,
  type DashboardService,
} from "@/application/services/dashboard-service";
import { SqliteDashboardReader } from "@/infrastructure/repositories/sqlite-dashboard-reader";
import { systemCalendar } from "@/infrastructure/system/system-calendar";
import { studiesService } from "@/composition/studies";

export const dashboardService: DashboardService = createDashboardService({
  studies: studiesService,
  reader: new SqliteDashboardReader(),
  calendar: systemCalendar,
});
