import { Link } from "react-router-dom";
import { Pencil } from "lucide-react";

import { ANIMAL_SEX_META, type Animal } from "@/domain/entities/animal";
import { Badge } from "@/presentation/components/ui/badge";
import { Button } from "@/presentation/components/ui/button";
import { formatDateOnly } from "@/shared/lib/format";

/**
 * A single animal in the registry — calm, scannable. The main content links to
 * the animal's details (viewing works even for archived studies). The Edit
 * action is shown only when `onEdit` is provided (omitted for read-only studies).
 */
export function AnimalListItem({
  animal,
  to,
  onEdit,
}: {
  animal: Animal;
  /** Link target for the animal's detail view. */
  to: string;
  onEdit?: () => void;
}) {
  const meta: string[] = [];
  if (animal.mutation) meta.push(animal.mutation);
  if (animal.dateOfBirth) meta.push(`Born ${formatDateOnly(animal.dateOfBirth)}`);

  return (
    <div className="flex items-center gap-4 rounded-lg border border-border bg-card px-5 py-4">
      <Link
        to={to}
        aria-label={`View ${animal.animalIdentifier}`}
        className="group min-w-0 flex-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <p className="truncate font-medium text-foreground group-hover:text-primary">
            {animal.animalIdentifier}
          </p>
          <span className="text-xs text-muted-foreground">
            {ANIMAL_SEX_META[animal.sex].label}
          </span>
          {animal.treatmentGroup ? (
            <Badge variant="secondary">{animal.treatmentGroup}</Badge>
          ) : null}
        </div>
        {meta.length > 0 ? (
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {meta.join(" · ")}
          </p>
        ) : null}
      </Link>
      {onEdit ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          aria-label={`Edit ${animal.animalIdentifier}`}
        >
          <Pencil />
          Edit
        </Button>
      ) : null}
    </div>
  );
}
