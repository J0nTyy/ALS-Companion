/**
 * A tiny, dependency-free DOCX writer. A .docx is an OOXML package (a ZIP of XML
 * parts); this builds the minimal valid package from a {@link ReportDocument} using
 * headings (direct bold/size formatting) and real tables. The ZIP uses the STORE
 * method (no compression), which keeps the XML greppable for tests and aligns with
 * the "no compression" scope. Pure — returns bytes.
 */
import type { ReportBlock, ReportDocument } from "./report-model";

const encoder = new TextEncoder();

function xml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** A run: text with optional bold + half-point size. */
function run(text: string, opts: { bold?: boolean; size?: number } = {}): string {
  const rpr: string[] = [];
  if (opts.bold) rpr.push("<w:b/>");
  if (opts.size) rpr.push(`<w:sz w:val="${opts.size}"/><w:szCs w:val="${opts.size}"/>`);
  const rprXml = rpr.length ? `<w:rPr>${rpr.join("")}</w:rPr>` : "";
  return `<w:r>${rprXml}<w:t xml:space="preserve">${xml(text)}</w:t></w:r>`;
}

function paragraph(
  text: string,
  opts: { bold?: boolean; size?: number } = {},
): string {
  return `<w:p>${run(text, opts)}</w:p>`;
}

function cell(text: string, bold: boolean): string {
  return `<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/></w:tcPr>${paragraph(text, { bold, size: 16 })}</w:tc>`;
}

function tableXml(columns: string[], rows: string[][]): string {
  const borders =
    "<w:tblBorders>" +
    ["top", "left", "bottom", "right", "insideH", "insideV"]
      .map((side) => `<w:${side} w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>`)
      .join("") +
    "</w:tblBorders>";
  const header = `<w:tr>${columns.map((c) => cell(c, true)).join("")}</w:tr>`;
  const body = rows
    .map((row) => `<w:tr>${row.map((c) => cell(c, false)).join("")}</w:tr>`)
    .join("");
  return `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/>${borders}</w:tblPr>${header}${body}</w:tbl>`;
}

function blockXml(block: ReportBlock): string {
  switch (block.kind) {
    case "paragraph":
      return paragraph(block.text, { size: 20 });
    case "note":
      return paragraph(block.text, { size: 18 });
    case "fields":
      return block.fields
        .map((f) => `<w:p>${run(`${f.label}: `, { bold: true, size: 20 })}${run(f.value, { size: 20 })}</w:p>`)
        .join("");
    case "table":
      // Word requires a paragraph after a table.
      return `${tableXml(block.columns, block.rows)}<w:p/>`;
  }
}

function documentXml(doc: ReportDocument): string {
  const parts: string[] = [];
  parts.push(paragraph(doc.title, { bold: true, size: 36 }));
  if (doc.subtitle) parts.push(paragraph(doc.subtitle, { size: 20 }));
  for (const section of doc.sections) {
    parts.push(paragraph(section.heading, { bold: true, size: 26 }));
    for (const block of section.blocks) parts.push(blockXml(block));
  }
  const sectPr =
    '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>';
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    `<w:body>${parts.join("")}${sectPr}</w:body></w:document>`
  );
}

const CONTENT_TYPES =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="xml" ContentType="application/xml"/>' +
  '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
  "</Types>";

const RELS =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
  "</Relationships>";

export function renderReportToDocx(doc: ReportDocument): Uint8Array {
  return storeZip([
    { name: "[Content_Types].xml", data: encoder.encode(CONTENT_TYPES) },
    { name: "_rels/.rels", data: encoder.encode(RELS) },
    { name: "word/document.xml", data: encoder.encode(documentXml(doc)) },
  ]);
}

// --- minimal STORE-method ZIP writer (no compression) ---

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = (crc >>> 8) ^ (CRC_TABLE[(crc ^ bytes[i]!) & 0xff] ?? 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

interface ZipEntry {
  name: string;
  data: Uint8Array;
}

function storeZip(entries: ZipEntry[]): Uint8Array {
  const out: number[] = [];
  const u16 = (n: number) => {
    out.push(n & 0xff, (n >>> 8) & 0xff);
  };
  const u32 = (n: number) => {
    out.push(n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff);
  };
  const bytes = (b: Uint8Array | number[]) => {
    for (const x of b) out.push(x & 0xff);
  };

  const central: {
    name: Uint8Array;
    crc: number;
    size: number;
    offset: number;
  }[] = [];

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const crc = crc32(entry.data);
    const offset = out.length;
    // Local file header
    u32(0x04034b50);
    u16(20); // version needed
    u16(0); // flags
    u16(0); // method: store
    u16(0); // mod time
    u16(0); // mod date
    u32(crc);
    u32(entry.data.length); // compressed size (== uncompressed for store)
    u32(entry.data.length); // uncompressed size
    u16(nameBytes.length);
    u16(0); // extra length
    bytes(nameBytes);
    bytes(entry.data);
    central.push({ name: nameBytes, crc, size: entry.data.length, offset });
  }

  const centralStart = out.length;
  for (const c of central) {
    u32(0x02014b50);
    u16(20); // version made by
    u16(20); // version needed
    u16(0); // flags
    u16(0); // method
    u16(0); // mod time
    u16(0); // mod date
    u32(c.crc);
    u32(c.size);
    u32(c.size);
    u16(c.name.length);
    u16(0); // extra
    u16(0); // comment
    u16(0); // disk number start
    u16(0); // internal attrs
    u32(0); // external attrs
    u32(c.offset);
    bytes(c.name);
  }
  const centralSize = out.length - centralStart;

  // End of central directory
  u32(0x06054b50);
  u16(0); // disk
  u16(0); // cd start disk
  u16(central.length);
  u16(central.length);
  u32(centralSize);
  u32(centralStart);
  u16(0); // comment length

  return Uint8Array.from(out);
}
