import { describe, expect, it, vi } from "vitest";

import {
  isSeparator,
  type ContextMenuEntry,
  type ContextMenuItem,
} from "../context-menu-types";
import {
  buildAnnotationContextMenu,
  buildAnimalContextMenu,
  buildComparisonContextMenu,
  buildMriSessionContextMenu,
  buildResearchAssetContextMenu,
  buildSearchResultContextMenu,
  buildStudyContextMenu,
  buildTimelineEventContextMenu,
  buildViewerContextMenu,
} from "../menus";

function items(entries: ContextMenuEntry[]): ContextMenuItem[] {
  return entries.filter((e): e is ContextMenuItem => !isSeparator(e));
}
function ids(entries: ContextMenuEntry[]): string[] {
  return items(entries).map((i) => i.id);
}
function byId(entries: ContextMenuEntry[], id: string): ContextMenuItem {
  const item = items(entries).find((i) => i.id === id);
  if (!item) throw new Error(`No menu item "${id}"`);
  return item;
}

describe("buildStudyContextMenu", () => {
  it("exposes Open/Edit/Archive/Delete with the right shortcuts and danger flag", () => {
    const onOpen = vi.fn();
    const onEdit = vi.fn();
    const onArchive = vi.fn();
    const onDelete = vi.fn();
    const menu = buildStudyContextMenu({ onOpen, onEdit, onArchive, onDelete });
    expect(ids(menu)).toEqual(["open", "edit", "archive", "delete"]);
    expect(byId(menu, "open").shortcut).toBe("Enter");
    expect(byId(menu, "edit").shortcut).toBe("F2");
    expect(byId(menu, "delete").shortcut).toBe("Delete");
    expect(byId(menu, "delete").danger).toBe(true);
    // A separator sits before the destructive action.
    expect(menu.some(isSeparator)).toBe(true);
    // Each item runs its handler.
    byId(menu, "delete").onSelect?.();
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it("hides Archive for an already-archived study", () => {
    const menu = buildStudyContextMenu({
      onOpen: vi.fn(),
      onArchive: vi.fn(),
      isArchived: true,
    });
    expect(ids(menu)).toEqual(["open"]);
  });

  it("shows only Open from a list row (no other handlers)", () => {
    expect(ids(buildStudyContextMenu({ onOpen: vi.fn() }))).toEqual(["open"]);
  });
});

describe("buildAnimalContextMenu", () => {
  it("exposes Open + Edit from a list row", () => {
    expect(ids(buildAnimalContextMenu({ onOpen: vi.fn(), onEdit: vi.fn() }))).toEqual([
      "open",
      "edit",
    ]);
  });
  it("exposes a dangerous Delete", () => {
    const menu = buildAnimalContextMenu({ onDelete: vi.fn() });
    expect(ids(menu)).toEqual(["delete"]);
    expect(byId(menu, "delete").danger).toBe(true);
  });
});

describe("buildTimelineEventContextMenu", () => {
  it("shows Mark complete only for a planned event", () => {
    const planned = buildTimelineEventContextMenu({
      isPlanned: true,
      onMarkComplete: vi.fn(),
      onEdit: vi.fn(),
      onDelete: vi.fn(),
    });
    expect(ids(planned)).toEqual(["complete", "edit", "delete"]);

    const completed = buildTimelineEventContextMenu({
      isPlanned: false,
      onMarkComplete: vi.fn(),
      onEdit: vi.fn(),
      onDelete: vi.fn(),
    });
    expect(ids(completed)).toEqual(["edit", "delete"]);
  });
});

describe("buildMriSessionContextMenu / buildResearchAssetContextMenu", () => {
  it("expose Edit + Delete", () => {
    expect(ids(buildMriSessionContextMenu({ onEdit: vi.fn(), onDelete: vi.fn() }))).toEqual([
      "edit",
      "delete",
    ]);
    expect(
      ids(buildResearchAssetContextMenu({ onEdit: vi.fn(), onDelete: vi.fn() })),
    ).toEqual(["edit", "delete"]);
  });
});

describe("buildAnnotationContextMenu", () => {
  it("exposes Edit label / Edit notes / Delete plus a disabled measurement placeholder", () => {
    const onEditLabel = vi.fn();
    const onEditNotes = vi.fn();
    const onDelete = vi.fn();
    const menu = buildAnnotationContextMenu({ onEditLabel, onEditNotes, onDelete });
    expect(ids(menu)).toEqual(["edit-label", "edit-notes", "delete", "measure"]);
    expect(byId(menu, "edit-label").shortcut).toBe("F2");
    expect(byId(menu, "delete").danger).toBe(true);
    // Future-feature placeholder is present but disabled and inert.
    expect(byId(menu, "measure").disabled).toBe(true);
    expect(byId(menu, "measure").onSelect).toBeUndefined();
    byId(menu, "edit-notes").onSelect?.();
    expect(onEditNotes).toHaveBeenCalledOnce();
  });

  it("is empty when no actions are available (read-only) — no lone placeholder", () => {
    expect(buildAnnotationContextMenu({})).toEqual([]);
  });
});

describe("buildSearchResultContextMenu", () => {
  it("exposes Open", () => {
    const onOpen = vi.fn();
    const menu = buildSearchResultContextMenu({ onOpen });
    expect(ids(menu)).toEqual(["open"]);
    byId(menu, "open").onSelect?.();
    expect(onOpen).toHaveBeenCalledOnce();
  });
});

describe("buildViewerContextMenu", () => {
  it("always offers Fit/Reset/Center and a disabled snapshot; adds tools when editable", () => {
    const menu = buildViewerContextMenu({
      onFit: vi.fn(),
      onReset: vi.fn(),
      onCenter: vi.fn(),
      onAddPoint: vi.fn(),
      onAddRectangle: vi.fn(),
    });
    expect(ids(menu)).toEqual([
      "fit",
      "reset",
      "center",
      "add-point",
      "add-rectangle",
      "snapshot",
    ]);
    expect(byId(menu, "snapshot").disabled).toBe(true);
  });

  it("omits the drawing tools when read-only (no add handlers)", () => {
    const menu = buildViewerContextMenu({
      onFit: vi.fn(),
      onReset: vi.fn(),
      onCenter: vi.fn(),
    });
    expect(ids(menu)).toEqual(["fit", "reset", "center", "snapshot"]);
  });
});

describe("buildComparisonContextMenu", () => {
  it("exposes Fit both/Reset both with R/F and sync toggles reflecting state", () => {
    const menu = buildComparisonContextMenu({
      onFitBoth: vi.fn(),
      onResetBoth: vi.fn(),
      onToggleSyncZoom: vi.fn(),
      onToggleSyncPan: vi.fn(),
      syncZoom: true,
      syncPan: false,
    });
    expect(ids(menu)).toEqual([
      "fit-both",
      "reset-both",
      "sync-zoom",
      "sync-pan",
      "snapshot",
    ]);
    expect(byId(menu, "fit-both").shortcut).toBe("F");
    expect(byId(menu, "reset-both").shortcut).toBe("R");
    expect(byId(menu, "sync-zoom").checked).toBe(true);
    expect(byId(menu, "sync-pan").checked).toBe(false);
  });
});
