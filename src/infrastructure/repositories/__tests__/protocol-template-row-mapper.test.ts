import { describe, expect, it } from "vitest";

import {
  mapRowToProtocolStep,
  mapRowToProtocolTemplate,
  type ProtocolStepRow,
  type ProtocolTemplateRow,
} from "@/infrastructure/repositories/protocol-template-row-mapper";

const templateRow: ProtocolTemplateRow = {
  id: "tpl1",
  study_id: "s1",
  name: "Standard protocol",
  created_at: "2026-07-13T00:00:00.000Z",
  updated_at: "2026-07-13T00:00:00.000Z",
};

const stepRow: ProtocolStepRow = {
  id: "st1",
  protocol_template_id: "tpl1",
  title: "Baseline MRI",
  category: "mri",
  offset_days: 30,
  notes: null,
  display_order: 1,
  created_at: "2026-07-13T00:00:00.000Z",
  updated_at: "2026-07-13T00:00:00.000Z",
};

describe("mapRowToProtocolTemplate", () => {
  it("maps a template and rejects an empty name", () => {
    expect(mapRowToProtocolTemplate(templateRow)).toEqual({
      id: "tpl1",
      studyId: "s1",
      name: "Standard protocol",
      createdAt: "2026-07-13T00:00:00.000Z",
      updatedAt: "2026-07-13T00:00:00.000Z",
    });
    expect(() =>
      mapRowToProtocolTemplate({ ...templateRow, name: "  " }),
    ).toThrow();
  });
});

describe("mapRowToProtocolStep", () => {
  it("maps a step and omits null notes", () => {
    expect(mapRowToProtocolStep(stepRow)).toEqual({
      id: "st1",
      protocolTemplateId: "tpl1",
      title: "Baseline MRI",
      category: "mri",
      offsetDays: 30,
      displayOrder: 1,
      createdAt: "2026-07-13T00:00:00.000Z",
      updatedAt: "2026-07-13T00:00:00.000Z",
    });
  });

  it("keeps trimmed notes", () => {
    expect(mapRowToProtocolStep({ ...stepRow, notes: "  hi " }).notes).toBe(
      "hi",
    );
  });

  it("throws on empty title, bad category, or invalid offset", () => {
    expect(() => mapRowToProtocolStep({ ...stepRow, title: " " })).toThrow();
    expect(() =>
      mapRowToProtocolStep({ ...stepRow, category: "surgery" }),
    ).toThrow();
    expect(() =>
      mapRowToProtocolStep({ ...stepRow, offset_days: -1 }),
    ).toThrow();
    expect(() =>
      mapRowToProtocolStep({ ...stepRow, offset_days: 1.5 }),
    ).toThrow();
  });
});
