/**
 * Port for the researcher's **local** calendar date.
 *
 * Injected (rather than reading `new Date()` inside use cases) so date-of-birth
 * "not in the future" checks use the researcher's local day — never a UTC-derived
 * day, which can be off by one in timezones like Asia/Kolkata — and so the rule
 * is deterministically testable.
 */
export interface CalendarDate {
  /** Today's date in the local timezone, as `YYYY-MM-DD`. */
  today(): string;
}
