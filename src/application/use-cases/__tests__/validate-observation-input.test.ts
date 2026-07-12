import { describe, expect, it } from "vitest";

import { ValidationError } from "@/application/errors";
import { validateObservationFields } from "@/application/use-cases/validate-observation-input";

const TODAY = "2026-07-12";

function expectField(fn: () => unknown, field: string) {
  try {
    fn();
    expect.unreachable("expected a ValidationError");
  } catch (error) {
    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).field).toBe(field);
  }
}

describe("validateObservationFields", () => {
  it("rejects an unknown kind", () => {
    expectField(
      () =>
        validateObservationFields(
          { kind: "temperature", observedOn: "2026-07-01", value: 1 },
          TODAY,
        ),
      "kind",
    );
  });

  it("rejects a malformed observation date", () => {
    expectField(
      () =>
        validateObservationFields(
          { kind: "body_weight", observedOn: "2026/07/01", value: 24 },
          TODAY,
        ),
      "observedOn",
    );
  });

  it("rejects a future observation date", () => {
    expectField(
      () =>
        validateObservationFields(
          { kind: "body_weight", observedOn: "2030-01-01", value: 24 },
          TODAY,
        ),
      "observedOn",
    );
  });

  it("rejects a blank/NaN value", () => {
    expectField(
      () =>
        validateObservationFields(
          { kind: "body_weight", observedOn: "2026-07-01", value: Number.NaN },
          TODAY,
        ),
      "value",
    );
  });

  it("requires body weight to be greater than zero", () => {
    expectField(
      () =>
        validateObservationFields(
          { kind: "body_weight", observedOn: "2026-07-01", value: 0 },
          TODAY,
        ),
      "value",
    );
    expectField(
      () =>
        validateObservationFields(
          { kind: "body_weight", observedOn: "2026-07-01", value: -3 },
          TODAY,
        ),
      "value",
    );
  });

  it("accepts a valid body weight and drops any scale name", () => {
    const result = validateObservationFields(
      {
        kind: "body_weight",
        observedOn: "2026-07-01",
        value: 24.5,
        scaleName: "ignored",
      },
      TODAY,
    );
    expect(result.value).toBe(24.5);
    expect("scaleName" in result).toBe(false);
  });

  it("allows a motor score of zero but rejects negatives", () => {
    const zero = validateObservationFields(
      {
        kind: "motor_score",
        observedOn: "2026-07-01",
        value: 0,
        scaleName: "lab motor scale",
      },
      TODAY,
    );
    expect(zero.value).toBe(0);
    expectField(
      () =>
        validateObservationFields(
          {
            kind: "motor_score",
            observedOn: "2026-07-01",
            value: -1,
            scaleName: "lab motor scale",
          },
          TODAY,
        ),
      "value",
    );
  });

  it("requires a non-empty scale name for motor scores", () => {
    expectField(
      () =>
        validateObservationFields(
          {
            kind: "motor_score",
            observedOn: "2026-07-01",
            value: 3,
            scaleName: "   ",
          },
          TODAY,
        ),
      "scaleName",
    );
  });

  it("trims the scale name and notes; drops blank notes", () => {
    const result = validateObservationFields(
      {
        kind: "motor_score",
        observedOn: "2026-07-01",
        value: 3,
        scaleName: "  lab motor scale ",
        notes: "  hind limb ",
      },
      TODAY,
    );
    expect(result.scaleName).toBe("lab motor scale");
    expect(result.notes).toBe("hind limb");

    const noNotes = validateObservationFields(
      {
        kind: "body_weight",
        observedOn: "2026-07-01",
        value: 24,
        notes: "   ",
      },
      TODAY,
    );
    expect("notes" in noNotes).toBe(false);
  });
});
