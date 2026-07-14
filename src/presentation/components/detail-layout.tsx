import type { ReactNode } from "react";

/**
 * Two-column layout for detail pages (study, animal): a wide main content area and
 * a sticky summary/navigation rail. On wide screens the rail sits on the right and
 * stays in view while the main content scrolls; when the window is narrow the two
 * stack with the summary rail on top (so it stays useful).
 */
export function DetailLayout({
  aside,
  children,
}: {
  aside: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start xl:gap-8">
      <div className="order-2 min-w-0 space-y-6 xl:order-1">{children}</div>
      <aside className="order-1 xl:order-2">
        <div className="space-y-4 xl:sticky xl:top-4">{aside}</div>
      </aside>
    </div>
  );
}
