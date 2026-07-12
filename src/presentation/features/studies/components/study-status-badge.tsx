import { STUDY_STATUS_META, type StudyStatus } from "@/domain/entities/study";
import { Badge } from "@/presentation/components/ui/badge";

/** Renders a study's status as a calm, color-coded badge. */
export function StudyStatusBadge({ status }: { status: StudyStatus }) {
  const meta = STUDY_STATUS_META[status];
  return <Badge variant={meta.tone}>{meta.label}</Badge>;
}
