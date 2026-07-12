import type { Animal } from "@/domain/entities/animal";
import { addDaysToDateOnly } from "@/domain/value-objects/date-only";
import type {
  AnimalCreationDeps,
  TimelineEventUseCaseDeps,
} from "./deps";
import { createTimelineEvent } from "./create-timeline-event";

/**
 * Seed a newly-created animal's experiment timeline from its study's protocol.
 *
 * For each protocol step (in display order) a **planned** timeline event is
 * created with the step's title/category/notes and a planned date of the animal's
 * creation day + the step's `offsetDays`. It reuses the existing timeline-event
 * creation logic (validation + parent/archived integrity), so generated events
 * obey exactly the same rules as manually-added ones.
 *
 * If the study has no protocol (or no steps), this is a no-op. Editing a protocol
 * later never revisits already-created animals — only future animals inherit it.
 */
export async function applyProtocolToAnimal(
  deps: AnimalCreationDeps,
  animal: Animal,
): Promise<void> {
  const steps = await deps.protocols.listStepsByStudy(animal.studyId);
  if (steps.length === 0) return;

  const baseDate = deps.calendar.today();
  const timelineDeps: TimelineEventUseCaseDeps = {
    repository: deps.timelineEvents,
    animals: deps.repository, // AnimalRepository is an AnimalReader
    studies: deps.studies,
    clock: deps.clock,
    ids: deps.ids,
  };

  for (const step of steps) {
    await createTimelineEvent(timelineDeps, {
      animalId: animal.id,
      studyId: animal.studyId,
      title: step.title,
      category: step.category,
      status: "planned",
      plannedDate: addDaysToDateOnly(baseDate, step.offsetDays),
      ...(step.notes !== undefined ? { notes: step.notes } : {}),
    });
  }
}
