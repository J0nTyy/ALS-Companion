/**
 * A tiny, dependency-free PDF writer that renders a {@link ReportDocument} to a
 * professional, paginated layout using the standard Helvetica fonts (no embedding,
 * no images). Content streams are UNCOMPRESSED (aligned with the "no compression"
 * scope and keeps the text greppable for tests). Pure — returns bytes.
 *
 * Text is limited to the Latin-1 range the standard fonts can show; anything else is
 * transliterated (curly quotes/dashes) or replaced with "?".
 */
import type { ReportBlock, ReportDocument } from "./report-model";

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 54;
const CONTENT_W = PAGE_W - MARGIN * 2;

const SIZE_TITLE = 20;
const SIZE_HEADING = 13;
const SIZE_BODY = 10;
const SIZE_TABLE = 8;

/** Transliterate to Latin-1 the standard fonts can render; replace the rest. */
function sanitize(text: string): string {
  const mapped = text
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...");
  let out = "";
  for (const ch of mapped) {
    const code = ch.codePointAt(0) ?? 0;
    out += code <= 0xff ? ch : "?";
  }
  return out;
}

/** Escape a PDF literal string. */
function esc(text: string): string {
  return sanitize(text).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/** Approximate Helvetica text width in points (avg glyph ≈ 0.5em). */
function approxWidth(text: string, size: number): number {
  return text.length * size * 0.5;
}

function truncateToWidth(text: string, width: number, size: number): string {
  const clean = sanitize(text);
  const maxChars = Math.max(1, Math.floor(width / (size * 0.55)));
  if (clean.length <= maxChars) return clean;
  return `${clean.slice(0, Math.max(1, maxChars - 1))}.`;
}

function wrap(text: string, width: number, size: number): string[] {
  const words = sanitize(text).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (approxWidth(candidate, size) > width && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function renderReportToPdf(doc: ReportDocument): Uint8Array {
  const pages: string[][] = [];
  let ops: string[] = [];
  let y = MARGIN; // distance from the top edge to the next line's top

  function newPage() {
    ops = [];
    pages.push(ops);
    y = MARGIN;
  }
  newPage();

  function ensure(height: number, onBreak?: () => void) {
    if (y + height > PAGE_H - MARGIN) {
      newPage();
      onBreak?.();
    }
  }

  function drawText(
    text: string,
    x: number,
    baselineY: number,
    size: number,
    bold: boolean,
    gray = false,
  ) {
    if (gray) ops.push("0.45 0.45 0.45 rg");
    ops.push(
      `BT /${bold ? "F2" : "F1"} ${size} Tf 1 0 0 1 ${x.toFixed(2)} ${baselineY.toFixed(2)} Tm (${esc(text)}) Tj ET`,
    );
    if (gray) ops.push("0 0 0 rg");
  }

  function line(
    text: string,
    size: number,
    opts: { bold?: boolean; gray?: boolean; indent?: number } = {},
  ) {
    const height = size * 1.4;
    ensure(height);
    drawText(
      text,
      MARGIN + (opts.indent ?? 0),
      PAGE_H - (y + size),
      size,
      opts.bold ?? false,
      opts.gray ?? false,
    );
    y += height;
  }

  function paragraph(
    text: string,
    size: number,
    opts: { gray?: boolean; indent?: number } = {},
  ) {
    for (const l of wrap(text, CONTENT_W - (opts.indent ?? 0), size)) {
      line(l, size, opts);
    }
  }

  function rule() {
    const yy = PAGE_H - y;
    ops.push(`0.7 0.7 0.7 RG 0.5 w ${MARGIN} ${yy.toFixed(2)} m ${(PAGE_W - MARGIN).toFixed(2)} ${yy.toFixed(2)} l S`);
    y += 4;
  }

  function tableRow(
    cells: string[],
    xs: number[],
    colWidth: number,
    size: number,
    bold: boolean,
  ) {
    const height = size * 1.7;
    const baselineY = PAGE_H - (y + size);
    cells.forEach((cell, i) => {
      drawText(truncateToWidth(cell, colWidth - 4, size), (xs[i] ?? MARGIN) + 2, baselineY, size, bold);
    });
    y += height;
  }

  function table(columns: string[], rows: string[][]) {
    const colWidth = CONTENT_W / columns.length;
    const xs = columns.map((_, i) => MARGIN + i * colWidth);
    const rowH = SIZE_TABLE * 1.7;
    const drawHeader = () => {
      ensure(rowH * 2);
      tableRow(columns, xs, colWidth, SIZE_TABLE, true);
      rule();
    };
    drawHeader();
    for (const row of rows) {
      ensure(rowH, drawHeader);
      tableRow(row, xs, colWidth, SIZE_TABLE, false);
    }
    y += 6;
  }

  // --- document ---
  line(doc.title, SIZE_TITLE, { bold: true });
  if (doc.subtitle) line(doc.subtitle, SIZE_BODY, { gray: true });
  y += 8;

  for (const section of doc.sections) {
    ensure(SIZE_HEADING * 3);
    y += 6;
    line(section.heading, SIZE_HEADING, { bold: true });
    rule();
    for (const block of section.blocks) renderBlock(block);
    y += 6;
  }

  function renderBlock(block: ReportBlock) {
    switch (block.kind) {
      case "paragraph":
        paragraph(block.text, SIZE_BODY);
        break;
      case "note":
        paragraph(block.text, SIZE_BODY, { gray: true });
        break;
      case "fields":
        for (const f of block.fields) {
          paragraph(`${f.label}: ${f.value}`, SIZE_BODY, { indent: 4 });
        }
        break;
      case "table":
        table(block.columns, block.rows);
        break;
    }
  }

  return assemblePdf(pages);
}

/** Assemble the page content streams into a valid, uncompressed PDF file. */
function assemblePdf(pages: string[][]): Uint8Array {
  const pageCount = Math.max(1, pages.length);
  const bodies: string[] = [];

  const kids = pages
    .map((_, i) => `${5 + 2 * i} 0 R`)
    .join(" ");
  bodies[0] = `<< /Type /Catalog /Pages 2 0 R >>`;
  bodies[1] = `<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>`;
  bodies[2] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`;
  bodies[3] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`;

  pages.forEach((page, i) => {
    const pageNum = 5 + 2 * i;
    const contentNum = 6 + 2 * i;
    const content = page.join("\n");
    bodies[pageNum - 1] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
      `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentNum} 0 R >>`;
    bodies[contentNum - 1] =
      `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
  });

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (let i = 0; i < bodies.length; i++) {
    offsets[i] = pdf.length;
    pdf += `${i + 1} 0 obj\n${bodies[i]}\nendobj\n`;
  }
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${bodies.length + 1}\n`;
  pdf += `0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${offset.toString().padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${bodies.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Uint8Array.from(pdf, (ch) => ch.charCodeAt(0) & 0xff);
}
