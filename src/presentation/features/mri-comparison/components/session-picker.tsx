import { useId } from "react";

import type { ComparableSession } from "@/application/ports/mri-comparison-reader";
import { Label } from "@/presentation/components/ui/label";
import { Select } from "@/presentation/components/ui/select";
import { sessionPickerLabel } from "../comparison-selection";

/**
 * A labelled dropdown for choosing one side's MRI session. Every option is a
 * comparable session (it has a viewable image), so a chosen session can always be
 * displayed.
 */
export function SessionPicker({
  label,
  sessions,
  value,
  onChange,
}: {
  label: string;
  sessions: readonly ComparableSession[];
  value: string | null;
  onChange: (sessionId: string | null) => void;
}) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select
        id={id}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value || null)}
      >
        <option value="">Select a session…</option>
        {sessions.map((session) => (
          <option key={session.sessionId} value={session.sessionId}>
            {sessionPickerLabel(session)}
          </option>
        ))}
      </Select>
    </div>
  );
}
