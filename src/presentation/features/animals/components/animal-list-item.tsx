import { Link, useNavigate } from "react-router-dom";
import { Pencil } from "lucide-react";

import { ANIMAL_SEX_META, type Animal } from "@/domain/entities/animal";
import { Badge } from "@/presentation/components/ui/badge";
import { Button } from "@/presentation/components/ui/button";
import { useContextMenu } from "@/presentation/features/context-menu/context-menu-context";
import { buildAnimalContextMenu } from "@/presentation/features/context-menu/menus";
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
  const navigate = useNavigate();
  const contextMenu = useContextMenu();

  const meta: string[] = [];
  if (animal.mutation) meta.push(animal.mutation);
  if (animal.dateOfBirth) meta.push(`Born ${formatDateOnly(animal.dateOfBirth)}`);

  return (
    <div
      className="group flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5"
      onContextMenu={(e) =>
        contextMenu.open(
          e,
          buildAnimalContextMenu({
            onOpen: () => navigate(to),
            ...(onEdit ? { onEdit } : {}),
          }),
        )
      }
    >
      <Link
        to={to}
        aria-label={`View ${animal.animalIdentifier}`}
        className="min-w-0 flex-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <p className="truncate text-sm font-medium text-foreground group-hover:text-primary">
            {animal.animalIdentifier}
          </p>
          <span className="text-xs text-muted-foreground">
            {ANIMAL_SEX_META[animal.sex].label}
          </span>
          {animal.treatmentGroup ? (
            <Badge variant="secondary" className="shrink-0">
              {animal.treatmentGroup}
            </Badge>
          ) : null}
          {meta.length > 0 ? (
            <span className="w-full truncate text-xs text-muted-foreground">
              {meta.join(" · ")}
            </span>
          ) : null}
        </div>
      </Link>
      {onEdit ? (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 shrink-0 opacity-60 transition-opacity group-hover:opacity-100 focus-within:opacity-100"
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
