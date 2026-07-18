import type { ComponentPropsWithoutRef, ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * A compact Markdown renderer for assistant chat replies. Tuned for a narrow bubble
 * (tight margins, inherited text colour, no oversized headings) — distinct from the
 * User Guide's prose renderer. GitHub-flavoured Markdown (lists, tables, code); no
 * `dangerouslySetInnerHTML`. Loaded lazily by the panel so react-markdown stays out
 * of the initial bundle.
 */
type Props<T extends keyof JSX.IntrinsicElements> = ComponentPropsWithoutRef<T> & {
  children?: ReactNode;
};

const components = {
  p: ({ children }: Props<"p">) => (
    <p className="mb-2 leading-relaxed last:mb-0">{children}</p>
  ),
  ul: ({ children }: Props<"ul">) => (
    <ul className="mb-2 ml-4 list-disc space-y-0.5 last:mb-0">{children}</ul>
  ),
  ol: ({ children }: Props<"ol">) => (
    <ol className="mb-2 ml-4 list-decimal space-y-0.5 last:mb-0">{children}</ol>
  ),
  li: ({ children }: Props<"li">) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }: Props<"strong">) => (
    <strong className="font-semibold">{children}</strong>
  ),
  em: ({ children }: Props<"em">) => <em className="italic">{children}</em>,
  a: ({ href, children }: Props<"a">) => {
    const external = !!href && /^https?:\/\//.test(href);
    return (
      <a
        href={href}
        className="font-medium text-primary underline underline-offset-2"
        {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      >
        {children}
      </a>
    );
  },
  code: ({ children }: Props<"code">) => (
    <code className="rounded bg-background/70 px-1 py-0.5 font-mono text-[0.85em]">
      {children}
    </code>
  ),
  pre: ({ children }: Props<"pre">) => (
    <pre className="my-2 overflow-x-auto rounded-md border border-border bg-background/70 p-2 font-mono text-xs last:mb-0">
      {children}
    </pre>
  ),
  // Chat doesn't need document-scale headings — render them as emphasised lines.
  h1: ({ children }: Props<"h1">) => (
    <p className="mb-1 mt-2 font-semibold first:mt-0">{children}</p>
  ),
  h2: ({ children }: Props<"h2">) => (
    <p className="mb-1 mt-2 font-semibold first:mt-0">{children}</p>
  ),
  h3: ({ children }: Props<"h3">) => (
    <p className="mb-1 mt-2 font-semibold first:mt-0">{children}</p>
  ),
  blockquote: ({ children }: Props<"blockquote">) => (
    <blockquote className="my-2 border-l-2 border-primary/40 pl-3 text-muted-foreground">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-3 border-border" />,
  table: ({ children }: Props<"table">) => (
    <div className="my-2 overflow-x-auto">
      <table className="w-full border-collapse">{children}</table>
    </div>
  ),
  th: ({ children }: Props<"th">) => (
    <th className="border border-border bg-background/60 px-2 py-1 text-left font-semibold">
      {children}
    </th>
  ),
  td: ({ children }: Props<"td">) => (
    <td className="border border-border px-2 py-1 align-top">{children}</td>
  ),
};

export function AssistantMarkdown({ source }: { source: string }): ReactNode {
  return (
    <div className="break-words">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {source}
      </ReactMarkdown>
    </div>
  );
}
