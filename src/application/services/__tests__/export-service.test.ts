import { beforeEach, describe, expect, it } from "vitest";

import type { FilePicker, FileStore } from "@/application/ports/file-storage";
import {
  createExportService,
  type ExportService,
} from "@/application/services/export-service";
import { samplePackage } from "@/application/export/__tests__/package-fixture";

let written: { directory: string; names: string[] } | null;
let chosenDirectory: string | null;

/** A minimal valid PNG header (800×600) so the image-info parser reads dimensions. */
const PNG_800x600 = (() => {
  const b = new Uint8Array(24);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  b.set([0, 0, 0, 13], 8); // IHDR length
  b.set([0x49, 0x48, 0x44, 0x52], 12); // "IHDR"
  b.set([0, 0, 0x03, 0x20], 16); // width 800
  b.set([0, 0, 0x02, 0x58], 20); // height 600
  return b;
})();

const fileStore: FileStore = {
  async save() {},
  async readManagedBytes() {
    return PNG_800x600;
  },
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
    expect(written?.names).toHaveLength(9);
  });

  it("does nothing when the destination picker is cancelled", async () => {
    chosenDirectory = null;
    const result = await service.export(samplePackage(), "json");
    expect(result.status).toBe("cancelled");
    expect(written).toBeNull();
  });

  it("exports a PDF report as a single file", async () => {
    await service.export(samplePackage(), "pdf");
    expect(written?.names).toHaveLength(1);
    expect(written?.names[0]?.endsWith(".pdf")).toBe(true);
  });

  it("embeds images inline (PDF stays a single file) when attachImages is on", async () => {
    // Images are embedded INSIDE the report now, so no extra sibling files.
    await service.export(samplePackage(), "pdf", { attachImages: true });
    expect(written?.names).toHaveLength(1);
    expect(written?.names[0]?.endsWith(".pdf")).toBe(true);
  });

  it("embeds images inside the DOCX itself (single file)", async () => {
    await service.export(samplePackage(), "docx", { attachImages: true });
    expect(written?.names).toHaveLength(1);
    expect(written?.names[0]?.endsWith(".docx")).toBe(true);
  });
});
