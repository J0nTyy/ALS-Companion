import { describe, expect, it } from "vitest";

import {
  mapRowToObservation,
  type ObservationRow,
} from "@/infrastructure/repositories/observation-row-mapper";

const weightRow: ObservationRow = {
  id: "o1",
  animal_id: "an1",
  observed_on: "2026-07-01",
  kind: "body_weight",
  value: 24.5,
  scale_name: null,
  notes: null,
  created_at: "2026-07-01T00:00:00.000Z",
  updated_at: "2026-07-01T00:00:00.000Z",
};

const motorRow: ObservationRow = {
  ...weightRow,
  id: "o2",
  kind: "motor_score",
  value: 3,
  scale_name: "lab motor scale",
};

describe("mapRowToObservation", () => {
  it("maps a body weight row and omits null optionals", () => {
    expect(mapRowToObservation(weightRow)).toEqual({
      id: "o1",
      animalId: "an1",
      observedOn: "2026-07-01",
      kind: "body_weight",
      value: 24.5,
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-01T00:00:00.000Z",
    });
  });

  it("maps a motor row with its scale and trims notes", () => {
    const obs = mapRowToObservation({ ...motorRow, notes: "  hind limb " });
    expect(obs.scaleName).toBe("lab motor scale");
    expect(obs.notes).toBe("hind limb");
  });

  it("throws on an unrecognized kind", () => {
    expect(() =>
      mapRowToObservation({ ...weightRow, kind: "temperature" }),
    ).toThrow();
  });

  it("throws on a malformed observed date", () => {
    expect(() =>
      mapRowToObservation({ ...weightRow, observed_on: "2026/07/01" }),
    ).toThrow();
  });

  it("throws on an invalid value for the kind", () => {
    expect(() =>
      mapRowToObservation({ ...weightRow, value: 0 }),
    ).toThrow();
    expect(() =>
      mapRowToObservation({ ...motorRow, value: -1 }),
    ).toThrow();
  });

  it("throws when a motor score has no scale name", () => {
    expect(() =>
      mapRowToObservation({ ...motorRow, scale_name: "  " }),
    ).toThrow();
  });
});
