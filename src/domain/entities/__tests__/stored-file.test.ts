import { describe, expect, it } from "vitest";

import {
  fileExtension,
  imageFormatForFileName,
  imageFormatForMime,
  SUPPORTED_IMAGE_EXTENSIONS,
} from "@/domain/entities/stored-file";

describe("fileExtension", () => {
  it("lower-cases and takes the last segment", () => {
    expect(fileExtension("scan.PNG")).toBe("png");
    expect(fileExtension("a.tar.gz")).toBe("gz");
    expect(fileExtension("noextension")).toBe("");
  });
});

describe("imageFormatForFileName", () => {
  it("recognizes PNG, JPEG (jpg/jpeg), and TIFF (tif/tiff)", () => {
    expect(imageFormatForFileName("a.png")?.mime).toBe("image/png");
    expect(imageFormatForFileName("a.jpg")?.mime).toBe("image/jpeg");
    expect(imageFormatForFileName("a.JPEG")?.mime).toBe("image/jpeg");
    expect(imageFormatForFileName("a.tif")?.mime).toBe("image/tiff");
    expect(imageFormatForFileName("a.tiff")?.mime).toBe("image/tiff");
  });

  it("marks PNG/JPEG viewable in-app and TIFF not", () => {
    expect(imageFormatForFileName("a.png")?.viewableInApp).toBe(true);
    expect(imageFormatForFileName("a.jpg")?.viewableInApp).toBe(true);
    expect(imageFormatForFileName("a.tiff")?.viewableInApp).toBe(false);
  });

  it("returns null for unsupported formats (incl. DICOM, out of scope)", () => {
    expect(imageFormatForFileName("a.pdf")).toBeNull();
    expect(imageFormatForFileName("a.gif")).toBeNull();
    expect(imageFormatForFileName("a.dcm")).toBeNull();
    expect(imageFormatForFileName("noext")).toBeNull();
  });
});

describe("imageFormatForMime", () => {
  it("maps known image MIME types and rejects others", () => {
    expect(imageFormatForMime("image/png")?.label).toBe("PNG");
    expect(imageFormatForMime("image/tiff")?.viewableInApp).toBe(false);
    expect(imageFormatForMime("image/gif")).toBeNull();
  });
});

describe("SUPPORTED_IMAGE_EXTENSIONS", () => {
  it("covers every accepted extension for the picker filter", () => {
    expect([...SUPPORTED_IMAGE_EXTENSIONS].sort()).toEqual([
      "jpeg",
      "jpg",
      "png",
      "tif",
      "tiff",
    ]);
  });
});
