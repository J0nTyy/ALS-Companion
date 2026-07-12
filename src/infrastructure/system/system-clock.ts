import type { Clock } from "@/application/ports/system";

/** Real clock backed by the system time, formatted as ISO-8601 (UTC). */
export const systemClock: Clock = {
  now: () => new Date().toISOString(),
};
