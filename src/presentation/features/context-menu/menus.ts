import {
  Archive,
  Camera,
  Crosshair,
  Dot,
  FileText,
  FolderOpen,
  Maximize,
  Move,
  Pencil,
  RotateCcw,
  Ruler,
  Square,
  Tag,
  Trash2,
  ZoomIn,
} from "lucide-react";

import type { ContextMenuEntry } from "./context-menu-types";

/**
 * Pure builders that turn an entity + the actions available for it into context-
 * menu entries. No React, no DOM — trivially unit-testable, and the single source
 * of truth for "what can I do with this?" across the app.
 *
 * A builder only includes an item when its handler is supplied, so each menu
 * reflects the actions actually available in that context. Known-future actions
 * appear as explicitly `disabled` placeholders. Shortcut hints mirror the app's
 * conventions (Enter to open, F2 to rename/edit, Delete to delete) and the real
 * MRI-comparison keys (R/F/Z/P).
 */

export function buildStudyContextMenu(opts: {
  onOpen?: () => void;
  onEdit?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  isArchived?: boolean;
}): ContextMenuEntry[] {
  const entries: ContextMenuEntry[] = [];
  if (opts.onOpen)
    entries.push({ id: "open", label: "Open", shortcut: "Enter", icon: FolderOpen, onSelect: opts.onOpen });
  if (opts.onEdit)
    entries.push({ id: "edit", label: "Edit study", shortcut: "F2", icon: Pencil, onSelect: opts.onEdit });
  if (opts.onArchive && !opts.isArchived)
    entries.push({ id: "archive", label: "Archive study", icon: Archive, onSelect: opts.onArchive });
  if (opts.onDelete) {
    if (entries.length > 0) entries.push({ separator: true });
    entries.push({ id: "delete", label: "Delete study", shortcut: "Delete", danger: true, icon: Trash2, onSelect: opts.onDelete });
  }
  return entries;
}

export function buildAnimalContextMenu(opts: {
  onOpen?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}): ContextMenuEntry[] {
  const entries: ContextMenuEntry[] = [];
  if (opts.onOpen)
    entries.push({ id: "open", label: "Open", shortcut: "Enter", icon: FolderOpen, onSelect: opts.onOpen });
  if (opts.onEdit)
    entries.push({ id: "edit", label: "Edit animal", shortcut: "F2", icon: Pencil, onSelect: opts.onEdit });
  if (opts.onDelete) {
    if (entries.length > 0) entries.push({ separator: true });
    entries.push({ id: "delete", label: "Delete animal", shortcut: "Delete", danger: true, icon: Trash2, onSelect: opts.onDelete });
  }
  return entries;
}

export function buildTimelineEventContextMenu(opts: {
  isPlanned?: boolean;
  onMarkComplete?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}): ContextMenuEntry[] {
  const entries: ContextMenuEntry[] = [];
  if (opts.isPlanned && opts.onMarkComplete)
    entries.push({ id: "complete", label: "Mark complete", icon: Crosshair, onSelect: opts.onMarkComplete });
  if (opts.onEdit)
    entries.push({ id: "edit", label: "Edit event", shortcut: "F2", icon: Pencil, onSelect: opts.onEdit });
  if (opts.onDelete) {
    if (entries.length > 0) entries.push({ separator: true });
    entries.push({ id: "delete", label: "Delete event", shortcut: "Delete", danger: true, icon: Trash2, onSelect: opts.onDelete });
  }
  return entries;
}

export function buildMriSessionContextMenu(opts: {
  onEdit?: () => void;
  onDelete?: () => void;
}): ContextMenuEntry[] {
  const entries: ContextMenuEntry[] = [];
  if (opts.onEdit)
    entries.push({ id: "edit", label: "Edit MRI session", shortcut: "F2", icon: Pencil, onSelect: opts.onEdit });
  if (opts.onDelete) {
    if (entries.length > 0) entries.push({ separator: true });
    entries.push({ id: "delete", label: "Delete MRI session", shortcut: "Delete", danger: true, icon: Trash2, onSelect: opts.onDelete });
  }
  return entries;
}

export function buildResearchAssetContextMenu(opts: {
  onEdit?: () => void;
  onDelete?: () => void;
}): ContextMenuEntry[] {
  const entries: ContextMenuEntry[] = [];
  if (opts.onEdit)
    entries.push({ id: "edit", label: "Edit research asset", shortcut: "F2", icon: Pencil, onSelect: opts.onEdit });
  if (opts.onDelete) {
    if (entries.length > 0) entries.push({ separator: true });
    entries.push({ id: "delete", label: "Delete research asset", shortcut: "Delete", danger: true, icon: Trash2, onSelect: opts.onDelete });
  }
  return entries;
}

export function buildAnnotationContextMenu(opts: {
  onEditLabel?: () => void;
  onEditNotes?: () => void;
  onDelete?: () => void;
}): ContextMenuEntry[] {
  const entries: ContextMenuEntry[] = [];
  if (opts.onEditLabel)
    entries.push({ id: "edit-label", label: "Edit label", shortcut: "F2", icon: Tag, onSelect: opts.onEditLabel });
  if (opts.onEditNotes)
    entries.push({ id: "edit-notes", label: "Edit notes", icon: FileText, onSelect: opts.onEditNotes });
  if (opts.onDelete) {
    if (entries.length > 0) entries.push({ separator: true });
    entries.push({ id: "delete", label: "Delete annotation", shortcut: "Delete", danger: true, icon: Trash2, onSelect: opts.onDelete });
  }
  // Future: measurements build on annotations (roadmap v1.7). Only shown when the
  // mark has real actions — never as a lone, all-disabled menu (e.g. read-only).
  if (entries.length > 0) {
    entries.push({ separator: true });
    entries.push({ id: "measure", label: "Add measurement…", icon: Ruler, disabled: true });
  }
  return entries;
}

export function buildSearchResultContextMenu(opts: {
  onOpen?: () => void;
}): ContextMenuEntry[] {
  const entries: ContextMenuEntry[] = [];
  if (opts.onOpen)
    entries.push({ id: "open", label: "Open", shortcut: "Enter", icon: FolderOpen, onSelect: opts.onOpen });
  return entries;
}

export function buildViewerContextMenu(opts: {
  onFit: () => void;
  onReset: () => void;
  onCenter: () => void;
  onAddPoint?: () => void;
  onAddRectangle?: () => void;
}): ContextMenuEntry[] {
  const entries: ContextMenuEntry[] = [
    { id: "fit", label: "Fit image", icon: Maximize, onSelect: opts.onFit },
    { id: "reset", label: "Reset zoom", icon: RotateCcw, onSelect: opts.onReset },
    { id: "center", label: "Center image", icon: Crosshair, onSelect: opts.onCenter },
  ];
  if (opts.onAddPoint || opts.onAddRectangle) {
    entries.push({ separator: true });
    if (opts.onAddPoint)
      entries.push({ id: "add-point", label: "Add point", icon: Dot, onSelect: opts.onAddPoint });
    if (opts.onAddRectangle)
      entries.push({ id: "add-rectangle", label: "Add rectangle", icon: Square, onSelect: opts.onAddRectangle });
  }
  // Future: snapshot export (founding vision — not yet built).
  entries.push({ separator: true });
  entries.push({ id: "snapshot", label: "Export snapshot…", icon: Camera, disabled: true });
  return entries;
}

export function buildComparisonContextMenu(opts: {
  onFitBoth: () => void;
  onResetBoth: () => void;
  onToggleSyncZoom: () => void;
  onToggleSyncPan: () => void;
  syncZoom: boolean;
  syncPan: boolean;
}): ContextMenuEntry[] {
  return [
    { id: "fit-both", label: "Fit both", shortcut: "F", icon: Maximize, onSelect: opts.onFitBoth },
    { id: "reset-both", label: "Reset both", shortcut: "R", icon: RotateCcw, onSelect: opts.onResetBoth },
    { separator: true },
    { id: "sync-zoom", label: "Sync zoom", shortcut: "Z", icon: ZoomIn, checked: opts.syncZoom, onSelect: opts.onToggleSyncZoom },
    { id: "sync-pan", label: "Sync pan", shortcut: "P", icon: Move, checked: opts.syncPan, onSelect: opts.onToggleSyncPan },
    { separator: true },
    { id: "snapshot", label: "Export snapshot…", icon: Camera, disabled: true },
  ];
}
