import { describe, expect, it } from "vitest";

import { ValidationError } from "@/application/errors";
import {
  validateProtocolName,
  validateProtocolStepFields,
} from "@/application/use-cases/validate-protocol-input";

function expectField(fn: () => unknown, field: string) {
  try {
    fn();
    expect.unreachable("expected a ValidationError");
  } catch (error) {
    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).field).toBe(field);
  }
}

describe("validateProtocolName", () => {
  it("trims and requires a non-empty name", () => {
    expect(validateProtocolName({ name: "  My protocol " }).name).toBe(
      "My protocol",
    );
    expectField(() => validateProtocolName({ name: "   " }), "name");
  });
});

describe("validateProtocolStepFields", () => {
  it("requires a title and a known category", () => {
    expectField(
      () =>
        validateProtocolStepFields({
          title: "  ",
          category: "mri",
          offsetDays: 0,
        }),
      "title",
    );
    expectField(
      () =>
        validateProtocolStepFields({
          title: "x",
          category: "surgery",
          offsetDays: 0,
        }),
      "category",
    );
  });

  it("accepts a zero and positive integer offset", () => {
    expect(
      validateProtocolStepFields({ title: "x", category: "mri", offsetDays: 0 })
        .offsetDays,
    ).toBe(0);
    expect(
      validateProtocolStepFields({ title: "x", category: "mri", offsetDays: 14 })
        .offsetDays,
    ).toBe(14);
  });

  it("rejects a negative, fractional, or blank offset", () => {
    expectField(
      () =>
        validateProtocolStepFields({ title: "x", category: "mri", offsetDays: -1 }),
      "offsetDays",
    );
    expectField(
      () =>
        validateProtocolStepFields({ title: "x", category: "mri", offsetDays: 1.5 }),
      "offsetDays",
    );
    expectField(
      () =>
        validateProtocolStepFields({
          title: "x",
          category: "mri",
          offsetDays: Number.NaN,
        }),
      "offsetDays",
    );
  });

  it("trims notes and drops blank ones", () => {
    expect(
      validateProtocolStepFields({
        title: "x",
        category: "mri",
        offsetDays: 0,
        notes: "  hi ",
      }).notes,
    ).toBe("hi");
    expect(
      "notes" in
        validateProtocolStepFields({
          title: "x",
          category: "mri",
          offsetDays: 0,
          notes: "   ",
        }),
    ).toBe(false);
  });
});
