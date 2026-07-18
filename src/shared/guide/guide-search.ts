/**
 * Pure parsing + search over the User Guide markdown. No Vite `?raw` import lives
 * here, so any layer — including unit tests and the AI assistant's guide tool —
 * can use these helpers; the actual guide text is loaded once in `user-guide.ts`
 * and the parsed sections are passed in.
 */
import { slugify } from "@/shared/lib/slugify";

export interface GuideSection {
  id: string;
  title: string;
  /** Raw markdown of the section (heading + body), for rendering + search. */
  body: string;
  /** Lower-cased text for search matching. */
  haystack: string;
}

export interface ParsedGuide {
  intro: string;
  sections: GuideSection[];
}

/** Split the guide into an intro + `## ` sections, dropping its own TOC section. */
export function parseGuide(md: string): ParsedGuide {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const intro: string[] = [];
  const sections: GuideSection[] = [];
  let current: { title: string; lines: string[] } | null = null;
  let started = false;

  const flush = () => {
    if (!current) return;
    if (current.title.toLowerCase() !== "table of contents") {
      const body = current.lines.join("\n").trim();
      sections.push({
        id: slugify(current.title),
        title: current.title.replace(/^\d+\.\s*/, ""),
        body: `## ${current.title}\n\n${body}`,
        haystack: `${current.title}\n${body}`.toLowerCase(),
      });
    }
    current = null;
  };

  for (const line of lines) {
    const h2 = /^##\s+(.*)$/.exec(line);
    if (h2) {
      started = true;
      flush();
      current = { title: (h2[1] ?? "").trim(), lines: [] };
      continue;
    }
    if (current) {
      current.lines.push(line);
    } else if (!started) {
      // Skip the top-level H1 (used as the page header instead).
      if (!/^#\s+/.test(line)) intro.push(line);
    }
  }
  flush();
  return { intro: intro.join("\n").trim(), sections };
}

/**
 * Rank guide sections by how many of the query's terms they contain. An empty
 * query returns the first `limit` sections (a table-of-contents fallback). Pure —
 * no I/O — so the assistant's guide tool stays grounded in the shipped guide text.
 */
export function searchGuideSections(
  sections: readonly GuideSection[],
  query: string,
  limit = 4,
): GuideSection[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return sections.slice(0, limit);
  const terms = normalized.split(/\s+/).filter(Boolean);
  return sections
    .map((section) => ({
      section,
      score: terms.reduce((n, term) => n + (section.haystack.includes(term) ? 1 : 0), 0),
    }))
    .filter((scored) => scored.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((scored) => scored.section);
}
