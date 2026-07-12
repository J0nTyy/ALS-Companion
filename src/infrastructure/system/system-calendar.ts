import type { CalendarDate } from "@/application/ports/calendar";
import { localDateOnly } from "@/shared/lib/local-date";

/** Real calendar backed by the system clock, using **local** date parts. */
export const systemCalendar: CalendarDate = {
  today: () => localDateOnly(new Date()),
};
