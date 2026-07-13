import { beforeEach, describe, expect, it } from "vitest";

import type { FilePicker, FileStore } from "@/application/ports/file-storage";
import {
  createExportService,
  type ExportService,
} from "@/application/services/export-service";
import { samplePackage } from "@/application/export/__tests__/package-fixture";

let written: { directory: string; names: string[] } | null;
let chosenDirectory: string | null;

const fileStore: FileStore = {
  async save() {},
  async resolveDisplayUrl() {
    return "";
  },
  async remove() {},
  async writeExportFiles(directory, files) {
    written = { directory, names: files.map((f) => f.name) };
  },
};

const filePicker: FilePicker = {
  async pickImage() {
    return null;
  },
  async pickDirectory() {
    return chosenDirectory;
  },
};

let service: ExportService;

beforeEach(() => {
  written = null;
  chosenDirectory = "/exports";
  service = createExportService({ filePicker, fileStore });
});

describe("ExportService.export", () => {
  it("writes the engine's files to the chosen destination", async () => {
    const result = await service.export(samplePackage(), "csv");
    expect(result.status).toBe("done");
    if (result.status === "done") {
      expect(result.directory).toBe("/exports");
      expect(result.fileNames).toContain("animals.csv");
    }
    expect(written?.directory).toBe("/exports");
    expect(written?.names).toHaveLength(6);
  });

  it("does nothing when the destination picker is cancelled", async () => {
    chosenDirectory = null;
    const result = await service.export(samplePackage(), "json");
    expect(result.status).toBe("cancelled");
    expect(written).toBeNull();
  });
});
