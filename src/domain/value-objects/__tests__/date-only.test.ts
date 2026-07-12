import { describe, expect, it } from "vitest";

import {
  addDaysToDateOnly,
  isValidDateOnly,
} from "@/domain/value-objects/date-only";

describe("isValidDateOnly", () => {
  it("accepts real dates and rejects malformed/impossible ones", () => {
    expect(isValidDateOnly("2026-07-13")).toBe(true);
    expect(isValidDateOnly("2026/07/13")).toBe(false);
    expect(isValidDateOnly("2026-02-30")).toBe(false);
    expect(isValidDateOnly("nope")).toBe(false);
  });
});

describe("addDaysToDateOnly", () => {
  it("adds days across month and year boundaries", () => {
    expect(addDaysToDateOnly("2026-07-13", 0)).toBe("2026-07-13");
    expect(addDaysToDateOnly("2026-07-13", 30)).toBe("2026-08-12");
    expect(addDaysToDateOnly("2026-07-13", 60)).toBe("2026-09-11");
    expect(addDaysToDateOnly("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("handles leap-year February", () => {
    // 2028 is a leap year: Feb 28 + 1 = Feb 29.
    expect(addDaysToDateOnly("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("throws on an invalid base date or non-integer offset", () => {
    expect(() => addDaysToDateOnly("2026-02-30", 1)).toThrow();
    expect(() => addDaysToDateOnly("2026-07-13", 1.5)).toThrow();
  });
});
