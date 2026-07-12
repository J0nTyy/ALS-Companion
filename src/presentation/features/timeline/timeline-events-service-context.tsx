import { createContext, useContext, type ReactNode } from "react";

import type { TimelineEventsService } from "@/application/services/timeline-events-service";

const TimelineEventsServiceContext =
  createContext<TimelineEventsService | null>(null);

/**
 * Injects the timeline-events service into the tree. The concrete instance is
 * built in the composition root and passed in at the app entry point, so
 * components depend on the {@link TimelineEventsService} interface — never SQLite.
 */
export function TimelineEventsServiceProvider({
  service,
  children,
}: {
  service: TimelineEventsService;
  children: ReactNode;
}) {
  return (
    <TimelineEventsServiceContext.Provider value={service}>
      {children}
    </TimelineEventsServiceContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTimelineEventsService(): TimelineEventsService {
  const service = useContext(TimelineEventsServiceContext);
  if (!service) {
    throw new Error(
      "useTimelineEventsService must be used within a TimelineEventsServiceProvider",
    );
  }
  return service;
}
