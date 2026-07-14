/**
 * Renders a {@link ReportDocument} to a professional, paginated PDF using
 * **pdf-lib**. Unlike the previous hand-written writer this embeds real raster
 * images (PNG/JPEG) inline, measures text with the actual font metrics (so wrapping
 * and truncation are exact), and produces a standards-clean PDF.
 *
 * Uses the built-in Helvetica standard fonts (WinAnsi). Text outside that range is
 * transliterated (curly quotes/dashes, common Greek/maths) or replaced with "?".
 * Layout responds to {@link ReportOptions}: page size, an optional cover page, and
 * an optional running footer with page numbering.
 */
import { PDFDocument, StandardFonts, rgb, type PDFPage } from "pdf-lib";

import type { ReportBlock, ReportDocument } from "./report-model";
import {
  DEFAULT_REPORT_OPTIONS,
  PAGE_DIMENSIONS,
  type ReportImages,
  type ReportOptions,
} from "./export-types";

const MARGIN = 54;

const SIZE_COVER_TITLE = 26;
const SIZE_TITLE = 20;
const SIZE_HEADING = 13;
const SIZE_BODY = 10;
const SIZE_TABLE = 8;
const SIZE_FOOTER = 8;

const BLACK = rgb(0, 0, 0);
const GRAY = rgb(0.45, 0.45, 0.45);
const RULE = rgb(0.7, 0.7, 0.7);

/** Common non-WinAnsi characters mapped to safe equivalents Helvetica can render. */
const TRANSLIT: Record<string, string> = {
  "‘": "'", "’": "'", "‚": "'", "‛": "'",
  "“": '"', "”": '"',
  "–": "-", "—": "-", "−": "-",
  "…": "...", "•": "-", "·": "-",
  "≈": "~", "≥": ">=", "≤": "<=", "→": "->",
  "α": "alpha", "β": "beta", "γ": "gamma",
  "Δ": "delta", "μ": "u",
};

/** Reduce text to characters the WinAnsi standard fonts can encode. */
function sanitize(text: string): string {
  let out = "";
  for (const ch of text) {
    if (TRANSLIT[ch] !== undefined) {
      out += TRANSLIT[ch];
      continue;
    }
    const cp = ch.codePointAt(0) ?? 0;
    if (cp < 0x80 || (cp >= 0xa0 && cp <= 0xff)) out += ch;
    else out += "?";
  }
  return out;
}

export async function renderReportToPdf(
  doc: ReportDocument,
  images?: ReportImages,
  options?: Partial<ReportOptions>,
): Promise<Uint8Array> {
  const opts: ReportOptions = { ...DEFAULT_REPORT_OPTIONS, ...options };
  const { width: PAGE_W, height: PAGE_H } = PAGE_DIMENSIONS[opts.pageSize];
  const CONTENT_W = PAGE_W - MARGIN * 2;

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);

  const pages: PDFPage[] = [];
  let page: PDFPage;
  let cursor = MARGIN; // distance from the top edge to the next line's top

  function addPage() {
    page = pdf.addPage([PAGE_W, PAGE_H]);
    pages.push(page);
    cursor = MARGIN;
  }
  addPage();

  const widthOf = (text: string, size: number, bold: boolean) =>
    (bold ? boldFont : font).widthOfTextAtSize(text, size);

  function ensure(height: number, onBreak?: () => void) {
    if (cursor + height > PAGE_H - MARGIN) {
      addPage();
      onBreak?.();
    }
  }

  function wrap(text: string, maxWidth: number, size: number, bold: boolean): string[] {
    const words = sanitize(text).split(/\s+/).filter(Boolean);
    if (words.length === 0) return [""];
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (widthOf(candidate, size, bold) > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  function truncate(text: string, maxWidth: number, size: number): string {
    const clean = sanitize(text);
    if (widthOf(clean, size, false) <= maxWidth) return clean;
    let lo = 0;
    let hi = clean.length;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (widthOf(`${clean.slice(0, mid)}.`, size, false) <= maxWidth) lo = mid;
      else hi = mid - 1;
    }
    return `${clean.slice(0, Math.max(1, lo))}.`;
  }

  function drawLine(
    text: string,
    size: number,
    o: { bold?: boolean; gray?: boolean; indent?: number; center?: boolean } = {},
  ) {
    const h = size * 1.4;
    ensure(h);
    const clean = sanitize(text);
    const x = o.center
      ? (PAGE_W - widthOf(clean, size, o.bold ?? false)) / 2
      : MARGIN + (o.indent ?? 0);
    page.drawText(clean, {
      x,
      y: PAGE_H - (cursor + size),
      size,
      font: o.bold ? boldFont : font,
      color: o.gray ? GRAY : BLACK,
    });
    cursor += h;
  }

  function paragraph(
    text: string,
    size: number,
    o: { bold?: boolean; gray?: boolean; indent?: number; center?: boolean } = {},
  ) {
    for (const l of wrap(text, CONTENT_W - (o.indent ?? 0), size, o.bold ?? false)) {
      drawLine(l, size, o);
    }
  }

  function rule() {
    const y = PAGE_H - cursor;
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_W - MARGIN, y },
      thickness: 0.5,
      color: RULE,
    });
    cursor += 4;
  }

  function tableRow(cells: string[], xs: number[], colWidth: number, bold: boolean) {
    const h = SIZE_TABLE * 1.7;
    const baseY = PAGE_H - (cursor + SIZE_TABLE);
    cells.forEach((cell, i) => {
      page.drawText(truncate(cell, colWidth - 4, SIZE_TABLE), {
        x: (xs[i] ?? MARGIN) + 2,
        y: baseY,
        size: SIZE_TABLE,
        font: bold ? boldFont : font,
        color: BLACK,
      });
    });
    cursor += h;
  }

  function table(columns: string[], rows: string[][]) {
    const colWidth = CONTENT_W / columns.length;
    const xs = columns.map((_, i) => MARGIN + i * colWidth);
    const rowH = SIZE_TABLE * 1.7;
    const drawHeader = () => {
      ensure(rowH * 2);
      tableRow(columns, xs, colWidth, true);
      rule();
    };
    drawHeader();
    for (const row of rows) {
      ensure(rowH, drawHeader);
      tableRow(row, xs, colWidth, false);
    }
    cursor += 6;
  }

  async function image(relativePath: string, caption: string) {
    const data = images?.get(relativePath);
    if (data && (data.mimeType === "image/png" || data.mimeType === "image/jpeg")) {
      try {
        const embedded =
          data.mimeType === "image/jpeg"
            ? await pdf.embedJpg(data.bytes)
            : await pdf.embedPng(data.bytes);
        let w = CONTENT_W;
        let h = (embedded.height / embedded.width) * w;
        const maxH = PAGE_H * 0.42;
        if (h > maxH) {
          h = maxH;
          w = (embedded.width / embedded.height) * h;
        }
        ensure(h + SIZE_BODY * 1.6);
        page.drawImage(embedded, { x: MARGIN, y: PAGE_H - (cursor + h), width: w, height: h });
        cursor += h + 4;
        paragraph(caption, SIZE_BODY, { gray: true });
        return;
      } catch {
        // Corrupt/unsupported bytes — fall through to a caption reference.
      }
    }
    paragraph(`[Image] ${caption}`, SIZE_BODY, { gray: true, indent: 4 });
  }

  async function renderBlock(block: ReportBlock) {
    switch (block.kind) {
      case "paragraph":
        paragraph(block.text, SIZE_BODY);
        break;
      case "note":
        paragraph(block.text, SIZE_BODY, { gray: true });
        break;
      case "fields":
        for (const f of block.fields) paragraph(`${f.label}: ${f.value}`, SIZE_BODY, { indent: 4 });
        break;
      case "table":
        table(block.columns, block.rows);
        break;
      case "image":
        await image(block.relativePath, block.caption);
        break;
    }
  }

  // --- optional cover page ---
  const coverPages = opts.coverPage ? 1 : 0;
  if (opts.coverPage) {
    cursor = PAGE_H * 0.32;
    paragraph(doc.title, SIZE_COVER_TITLE, { bold: true, center: true });
    cursor += 10;
    if (doc.subtitle) paragraph(doc.subtitle, SIZE_BODY, { gray: true, center: true });
    if (opts.institution) {
      cursor += 24;
      paragraph(opts.institution, SIZE_TITLE, { center: true });
    }
    addPage();
  }

  // --- document body ---
  paragraph(doc.title, SIZE_TITLE, { bold: true });
  if (doc.subtitle) paragraph(doc.subtitle, SIZE_BODY, { gray: true });
  cursor += 8;

  for (const section of doc.sections) {
    ensure(SIZE_HEADING * 3);
    cursor += 6;
    paragraph(section.heading, SIZE_HEADING, { bold: true });
    rule();
    for (const block of section.blocks) await renderBlock(block);
    cursor += 6;
  }

  // --- optional running footer with page numbering ---
  if (opts.headerFooter) {
    const bodyCount = pages.length - coverPages;
    for (let i = coverPages; i < pages.length; i++) {
      const p = pages[i]!;
      const pageNo = i - coverPages + 1;
      const y = MARGIN * 0.6;
      p.drawLine({
        start: { x: MARGIN, y: y + 12 },
        end: { x: PAGE_W - MARGIN, y: y + 12 },
        thickness: 0.5,
        color: RULE,
      });
      if (opts.institution) {
        p.drawText(sanitize(opts.institution), { x: MARGIN, y, size: SIZE_FOOTER, font, color: GRAY });
      }
      const label = `Page ${pageNo} of ${bodyCount}`;
      p.drawText(label, {
        x: PAGE_W - MARGIN - font.widthOfTextAtSize(label, SIZE_FOOTER),
        y,
        size: SIZE_FOOTER,
        font,
        color: GRAY,
      });
    }
  }

  return pdf.save();
}
