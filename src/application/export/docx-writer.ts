/**
 * Renders a {@link ReportDocument} to an editable .docx using the **docx** library.
 * Images embed inline as real drawings, tables are native Word tables, and the
 * optional footer uses live Word page-number fields. Layout responds to
 * {@link ReportOptions} (page size, cover page, header/footer). Async: the package
 * is produced with `Packer.toBase64String` (works in the webview and in tests) and
 * decoded to bytes.
 */
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  ImageRun,
  Packer,
  PageBreak,
  PageNumber,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  type ISectionOptions,
} from "docx";

import type { ReportBlock, ReportDocument } from "./report-model";
import {
  DEFAULT_REPORT_OPTIONS,
  type ReportImage,
  type ReportImages,
  type ReportOptions,
  type ReportPageSize,
} from "./export-types";

/** Page size in twips (1/1440 inch) for the section properties. */
const PAGE_TWIPS: Record<ReportPageSize, { width: number; height: number }> = {
  letter: { width: 12240, height: 15840 },
  a4: { width: 11906, height: 16838 },
};

/** Largest inline image width in pixels (~6.25" of printable width at 96 dpi). */
const MAX_IMAGE_PX = 600;

function textRun(text: string, opts: { bold?: boolean; size?: number; italics?: boolean } = {}) {
  return new TextRun({
    text,
    ...(opts.bold !== undefined ? { bold: opts.bold } : {}),
    ...(opts.size !== undefined ? { size: opts.size } : {}),
    ...(opts.italics !== undefined ? { italics: opts.italics } : {}),
  });
}

function para(text: string, opts: { bold?: boolean; size?: number; italics?: boolean } = {}) {
  return new Paragraph({ children: [textRun(text, opts)] });
}

function cell(text: string, bold: boolean) {
  return new TableCell({
    width: { size: 0, type: WidthType.AUTO },
    children: [para(text, { bold, size: 16 })],
  });
}

function reportTable(columns: string[], rows: string[][]) {
  const border = { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" };
  const borders = {
    top: border,
    bottom: border,
    left: border,
    right: border,
    insideHorizontal: border,
    insideVertical: border,
  };
  const header = new TableRow({ children: columns.map((c) => cell(c, true)) });
  const body = rows.map((row) => new TableRow({ children: row.map((c) => cell(c, false)) }));
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders,
    rows: [header, ...body],
  });
}

/** On-page pixel size for an image, scaled to fit the printable width. */
function imageSize(image: ReportImage): { width: number; height: number } {
  let w = image.width > 0 ? image.width : 480;
  let h = image.height > 0 ? image.height : 360;
  if (w > MAX_IMAGE_PX) {
    h = Math.round((h * MAX_IMAGE_PX) / w);
    w = MAX_IMAGE_PX;
  }
  return { width: w, height: h };
}

function imageParagraphs(image: ReportImage, caption: string): Paragraph[] {
  const { width, height } = imageSize(image);
  const type = image.mimeType === "image/jpeg" ? "jpg" : "png";
  return [
    new Paragraph({
      children: [
        new ImageRun({
          type,
          data: image.bytes,
          transformation: { width, height },
        }),
      ],
    }),
    para(caption, { size: 16, italics: true }),
  ];
}

function blockChildren(
  block: ReportBlock,
  images: ReportImages | undefined,
): (Paragraph | Table)[] {
  switch (block.kind) {
    case "paragraph":
      return [para(block.text, { size: 20 })];
    case "note":
      return [para(block.text, { size: 18, italics: true })];
    case "fields":
      return block.fields.map(
        (f) =>
          new Paragraph({
            children: [textRun(`${f.label}: `, { bold: true, size: 20 }), textRun(f.value, { size: 20 })],
          }),
      );
    case "table":
      // Word requires a paragraph after a table.
      return [reportTable(block.columns, block.rows), new Paragraph({})];
    case "image": {
      const image = images?.get(block.relativePath);
      if (!image) return [para(`[Image] ${block.caption}`, { size: 18, italics: true })];
      return imageParagraphs(image, block.caption);
    }
  }
}

function coverParagraphs(doc: ReportDocument, institution: string): Paragraph[] {
  const centered = (text: string, size: number, bold = false) =>
    new Paragraph({ alignment: AlignmentType.CENTER, children: [textRun(text, { size, bold })] });
  const out: Paragraph[] = [
    new Paragraph({}),
    new Paragraph({}),
    new Paragraph({}),
    centered(doc.title, 56, true),
  ];
  if (doc.subtitle) out.push(centered(doc.subtitle, 24));
  if (institution) {
    out.push(new Paragraph({}));
    out.push(centered(institution, 28, true));
  }
  out.push(new Paragraph({ children: [new PageBreak()] }));
  return out;
}

function footer(institution: string): Footer {
  const prefix = institution ? `${institution} · ` : "";
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            children: [`${prefix}Page `, PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES],
            size: 16,
          }),
        ],
      }),
    ],
  });
}

export async function renderReportToDocx(
  doc: ReportDocument,
  images?: ReportImages,
  options?: Partial<ReportOptions>,
): Promise<Uint8Array> {
  const opts: ReportOptions = { ...DEFAULT_REPORT_OPTIONS, ...options };

  const children: (Paragraph | Table)[] = [];
  if (opts.coverPage) children.push(...coverParagraphs(doc, opts.institution));
  children.push(para(doc.title, { bold: true, size: 36 }));
  if (doc.subtitle) children.push(para(doc.subtitle, { size: 20 }));
  for (const section of doc.sections) {
    children.push(para(section.heading, { bold: true, size: 26 }));
    for (const block of section.blocks) children.push(...blockChildren(block, images));
  }

  const page = PAGE_TWIPS[opts.pageSize];
  const section: ISectionOptions = {
    properties: {
      page: {
        size: { width: page.width, height: page.height },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    },
    ...(opts.headerFooter ? { footers: { default: footer(opts.institution) } } : {}),
    children,
  };

  const document = new Document({ sections: [section] });
  const base64 = await Packer.toBase64String(document);
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}
