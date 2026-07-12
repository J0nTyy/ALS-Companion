import { describe, expect, it } from "vitest";

import { localDateOnly } from "@/shared/lib/local-date";

describe("localDateOnly", () => {
  it("uses local calendar parts (deterministic across timezones)", () => {
    // `new Date(y, m, d, ...)` is local time, and localDateOnly reads local
    // parts — so this holds regardless of the runner's timezone.
    const date = new Date(2026, 6, 13, 1, 30); // 2026-07-13 01:30 local
    expect(localDateOnly(date)).toBe("2026-07-13");
  });

  it("does not shift the day at a local midnight boundary", () => {
    // 00:15 local on New Year's Day. A UTC-based `toISOString().slice(0,10)`
    // could report 2025-12-31 in positive-offset zones; local parts must not.
    const date = new Date(2026, 0, 1, 0, 15); // 2026-01-01 00:15 local
    expect(localDateOnly(date)).toBe("2026-01-01");
  });

  it("zero-pads month and day", () => {
    const date = new Date(2026, 2, 5); // 2026-03-05 local
    expect(localDateOnly(date)).toBe("2026-03-05");
  });
});
