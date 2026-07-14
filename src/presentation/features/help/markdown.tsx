import type { ComponentPropsWithoutRef, ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";

/**
 * Renders Markdown for the in-app User Guide using `react-markdown` with GitHub-
 * flavoured Markdown (tables, task lists, autolinks) and `rehype-slug` (which stamps
 * heading `id`s using the same GitHub algorithm as {@link slugify}, so the guide's
 * own table-of-contents anchor links and the ⓘ deep links resolve). Elements are
 * mapped to Tailwind-styled components; content is rendered as React nodes, never
 * via `dangerouslySetInnerHTML`.
 */
type Props<T extends keyof JSX.IntrinsicElements> = ComponentPropsWithoutRef<T> & {
  children?: ReactNode;
};

const components = {
  h1: ({ id, children }: Props<"h1">) => (
    <h1 id={id} className="mt-8 mb-3 scroll-mt-24 text-2xl font-bold text-foreground">
      {children}
    </h1>
  ),
  h2: ({ id, children }: Props<"h2">) => (
    <h2
      id={id}
      className="mt-8 mb-3 scroll-mt-24 border-b border-border pb-1.5 text-xl font-semibold text-foreground"
    >
      {children}
    </h2>
  ),
  h3: ({ id, children }: Props<"h3">) => (
    <h3 id={id} className="mt-6 mb-2 scroll-mt-24 text-base font-semibold text-foreground">
      {children}
    </h3>
  ),
  h4: ({ id, children }: Props<"h4">) => (
    <h4 id={id} className="mt-4 mb-1.5 scroll-mt-24 text-sm font-semibold text-foreground">
      {children}
    </h4>
  ),
  p: ({ children }: Props<"p">) => (
    <p className="my-2 text-sm leading-relaxed text-muted-foreground">{children}</p>
  ),
  ul: ({ children }: Props<"ul">) => (
    <ul className="my-2 ml-5 list-disc space-y-1 text-sm text-muted-foreground marker:text-muted-foreground/60">
      {children}
    </ul>
  ),
  ol: ({ children }: Props<"ol">) => (
    <ol className="my-2 ml-5 list-decimal space-y-1 text-sm text-muted-foreground marker:text-muted-foreground/60">
      {children}
    </ol>
  ),
  li: ({ children }: Props<"li">) => <li className="leading-relaxed">{children}</li>,
  a: ({ href, children }: Props<"a">) => {
    const external = !!href && /^https?:\/\//.test(href);
    return (
      <a
        href={href}
        className="font-medium text-primary hover:underline"
        {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      >
        {children}
      </a>
    );
  },
  strong: ({ children }: Props<"strong">) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }: Props<"em">) => <em className="italic">{children}</em>,
  code: ({ children }: Props<"code">) => (
    <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">{children}</code>
  ),
  pre: ({ children }: Props<"pre">) => (
    <pre className="my-3 overflow-x-auto rounded-lg border border-border bg-muted/60 p-3 font-mono text-xs text-foreground">
      {children}
    </pre>
  ),
  blockquote: ({ children }: Props<"blockquote">) => (
    <blockquote className="my-3 border-l-4 border-primary/40 bg-muted/40 py-1.5 pl-4 pr-2 text-sm text-muted-foreground">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-6 border-border" />,
  table: ({ children }: Props<"table">) => (
    <div className="my-3 overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  th: ({ children }: Props<"th">) => (
    <th className="border border-border bg-muted/60 px-2.5 py-1.5 text-left font-semibold text-foreground">
      {children}
    </th>
  ),
  td: ({ children }: Props<"td">) => (
    <td className="border border-border px-2.5 py-1.5 align-top text-muted-foreground">
      {children}
    </td>
  ),
};

export function Markdown({ source }: { source: string }): ReactNode {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug]} components={components}>
      {source}
    </ReactMarkdown>
  );
}
