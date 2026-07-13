/**
 * Where "Open linked annotation" navigates. A linked annotation lives on another
 * MRI session inside an animal's timeline, so we open that animal's detail page
 * (the closest addressable location — there is no per-annotation route).
 */
export function animalRouteForContext(context: {
  studyId: string;
  animalId: string;
}): string {
  return `/studies/${context.studyId}/animals/${context.animalId}`;
}
