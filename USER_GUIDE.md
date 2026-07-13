# ALS Research Companion — User Guide

A calm, unified workspace for running ALS transgenic‑mouse studies: your studies,
mice, observations, experiment timelines, MRI images, annotations, search, and
publication packages — all in one place, stored locally on your computer.

> **What this is:** a research *productivity* tool.
> **What this is not:** a diagnostic or clinical tool. It never diagnoses disease,
> estimates prognosis, or makes clinical recommendations. Everything it shows is
> data you entered or files you attached.

**Version:** this guide describes **v1.8**. The current version is always shown at
the bottom of the sidebar and under **Settings → About**.

---

## Table of contents

1. [Getting started](#1-getting-started)
2. [How your data is organized](#2-how-your-data-is-organized)
3. [Dashboard (Home)](#3-dashboard-home)
4. [Studies](#4-studies)
5. [Study protocol](#5-study-protocol)
6. [Animals (mouse database)](#6-animals-mouse-database)
7. [Observations](#7-observations)
8. [Experiment timeline](#8-experiment-timeline)
9. [MRI sessions](#9-mri-sessions)
10. [Research assets & files](#10-research-assets--files)
11. [MRI images & the image viewer](#11-mri-images--the-image-viewer)
12. [Annotations](#12-annotations)
13. [MRI comparison workspace](#13-mri-comparison-workspace)
14. [Search](#14-search)
15. [Publication workspace](#15-publication-workspace)
16. [Settings](#16-settings)
17. [Deleting vs archiving (and where your data lives)](#17-deleting-vs-archiving-and-where-your-data-lives)
18. [Right-click (context) menus](#18-right-click-context-menus)
19. [Keyboard shortcuts](#19-keyboard-shortcuts)
20. [Tips & troubleshooting](#20-tips--troubleshooting)
21. [Glossary](#21-glossary)

---

## 1. Getting started

### Opening the app
ALS Research Companion is a **desktop application**. Open it the way you open any
program on your computer (from the Start menu / desktop shortcut). All of your data
lives on your own machine — nothing is uploaded to the internet.

> **Note about the browser preview.** Some features (saving data, attaching and
> viewing images, and annotations) only work in the installed desktop app. If you
> open a preview in a web browser, those areas politely say *"available in the
> installed desktop app"* instead of failing.

### The main window
The window has three parts:

| Area | What it does |
| --- | --- |
| **Left sidebar** | Moves you between the main sections: **Dashboard, Studies, MRI Compare, Publish, Settings**. The current version shows at the bottom. |
| **Top bar** | The **collapse button** (▮ icon) to hide/show the sidebar, the **global search box**, and the **light/dark toggle**. |
| **Main area** | Whatever you're working on. It widens automatically to use the space. |

### Collapsing the sidebar
Click the **panel button** at the far left of the top bar to shrink the sidebar to
a slim icon strip (hover an icon to see its name). Click again to expand it. The app
remembers your choice next time you open it.

### Light or dark theme
Use the **sun/moon toggle** in the top bar for a quick switch, or go to
**Settings → Appearance** to choose **Light**, **Dark**, or **System** (which
follows your computer's setting).

---

## 2. How your data is organized

Everything follows the natural laboratory workflow. Each item lives *inside* the one
above it:

```
Study                      (e.g. "SOD1 disease progression")
└─ Animal                  (one mouse, with a unique ID)
   ├─ Observations         (body weights, motor scores over time)
   └─ Timeline events      (the workflow: gene confirmation, MRI, histology…)
      └─ MRI session       (attached to an "MRI" timeline event)
         └─ Research asset  (a described file, e.g. "Baseline T2 series")
            └─ Image        (the actual PNG/JPEG/TIFF you attach)
               └─ Annotation (a point or rectangle you draw on the image)
```

You'll generally work **top‑down**: create a study, add mice, record observations
and timeline events, then attach MRI images and annotate them.

Two important, everyday ideas:

- **Archiving** hides a finished study without deleting anything (fully reversible).
- **Deleting** permanently removes data (not reversible). See
  [section 17](#17-deleting-vs-archiving-and-where-your-data-lives).

When a study is **archived**, everything inside it becomes **read‑only** — you can
still view it, but the *add / edit / delete* buttons are hidden until you restore it.

---

## 3. Dashboard (Home)

The **Dashboard** is the first screen you see. It summarizes your real data — it
never invents numbers, and every card has an honest empty state when there's nothing
yet.

- **Current study** — the study you're most actively working on, with a shortcut to
  open it.
- **Quick statistics** — real counts (studies, animals, and so on).
- **Today's work** — timeline events that are planned or were recently completed,
  drawn from the dates you entered (it is a summary, **not** a scheduler or reminder
  system).
- **Recent activity** — a combined, newest‑first feed of what changed across your
  studies, mice, observations, timeline, MRI sessions, and assets.
- **Quick actions** — buttons that jump straight to common screens.

---

## 4. Studies

A **study** is a research project (a mutation, a cohort, a question). Open
**Studies** in the sidebar to see them all.

### Create a study
1. Go to **Studies → New study** (or the "+" / "New" button).
2. Fill in:
   - **Name** (required) — e.g. *"SOD1‑G93A disease progression"*.
   - **Strain or line** (required) — e.g. *"B6.Cg‑Tg(SOD1*G93A)"*.
   - **Status** — Planning, Active, or Completed.
   - **Description** (optional).
3. Save. The study opens.

### Study statuses
| Status | Meaning |
| --- | --- |
| **Planning** | Being set up. |
| **Active** | In progress. |
| **Completed** | Finished, but still fully editable. |
| **Archived** | Hidden from the active list and read‑only (set by archiving). |

### Open, edit, and view
- Click any study to open it. Inside you'll find its **details**, its **protocol**,
  and its **animals**.
- **Edit study** changes the name, strain, status, or description.

### Archive a study (safe, reversible)
On the study page click **Archive**. You'll be asked to confirm. The study is hidden
from your active list but **nothing is deleted**. To see archived studies, use the
**"Show archived"** toggle on the Studies list. To bring one back, **edit** it and
change its status away from Archived.

### Delete a study (permanent) — the "Danger zone"
At the bottom of a study page is a **Danger zone**. **Delete study** permanently
removes the study **and everything inside it** — every animal, observation, timeline
event, MRI session, research asset, and attached image file on disk. To prevent
accidents you must **type the study's name** to confirm. This cannot be undone; if
you only want to set it aside, **archive** instead.

---

## 5. Study protocol

A **protocol** is a reusable checklist of workflow steps for a study (each study has
at most one). When you add a new animal, its timeline is **automatically seeded**
from the protocol, so every mouse starts with the same planned steps.

- Open a study and find the **Protocol** section.
- Add **steps**, each with a **title**, a **category** (see the timeline categories
  in [section 8](#8-experiment-timeline)), and an **offset in days** (roughly when
  the step happens relative to the start).
- Reorder or remove steps as needed.

> Editing the protocol later does **not** change timelines already created for
> existing animals — it only affects mice added afterward. Protocols are
> configuration, not research records.

---

## 6. Animals (mouse database)

Animals live **inside a study** (there is no separate "all mice" menu — you always
work within the study's context).

### Add an animal
Open a study, go to the **Animals** section, and click **Add animal**. Fields:

| Field | Notes |
| --- | --- |
| **Animal ID** | Required. Must be **unique within the study** (the app blocks duplicates with a clear message). |
| **Sex** | Female, Male, or Unknown. |
| **Date of birth** | Optional. |
| **Mutation / genotype** | Optional — e.g. SOD1, TDP‑43, FUS, C9orf72. |
| **Treatment group** | Optional, free text — e.g. Control, Riluzole, Edaravone, Vehicle. Any value is allowed. |

### Open an animal
Click a mouse to open its page, where you'll manage its **observations** and its
**experiment timeline**.

### Edit / delete
- **Edit** updates the animal's details.
- **Delete animal** (on the animal page) permanently removes that mouse **and** all
  of its observations, timeline events, MRI sessions, assets, and images. You'll be
  asked to confirm; it cannot be undone.

---

## 7. Observations

Observations are the measurements you take repeatedly over a mouse's life. Open an
animal to find the **Observations** section.

### Record an observation
Click **Record observation** and choose a type:

- **Body weight** — a value in **grams**.
- **Motor assessment** — a **score**, plus the **name of the scale** you used
  (required, so the number is never ambiguous — e.g. *"Rotarod"*, *"grip strength"*,
  a clinical/paralysis score).

Add the **date observed** and optional **notes**. Repeated measurements of the same
type on the same day are kept as **separate records** — nothing is merged or
overwritten, so your history stays intact.

### Edit / delete
Each observation row has **Edit** and a **Delete** (trash) button. Deleting removes
that single measurement after you confirm.

---

## 8. Experiment timeline

The timeline is each mouse's chronological workflow — what's planned, what's done,
and what's next. Open an animal to find the **Experiment timeline** section.

### Event categories
| Category | Typical use |
| --- | --- |
| **Gene Confirmation** | Confirming the genotype of the transgenic mouse. |
| **Behavioral Assessment** | Rotarod, grip strength, gait, activity, etc. |
| **Neurological Examination** | Reflexes, paralysis scoring, hindlimb function, etc. |
| **MRI** | An imaging session (unlocks the MRI panel — see below). |
| **Biochemical Analysis** | Biomarker / molecular assays. |
| **Histopathology** | Tissue analysis. |
| **Custom** | Anything else. |

### Add and manage events
- **Add event** — give it a title, category, status (**Planned** or **Completed**),
  optional **planned date** and **completed date**, and notes.
- **Mark complete** — a one‑click action that sets a planned event to Completed and
  stamps today's date.
- **Edit** / **Delete** — change or permanently remove an event (deleting an MRI
  event also removes any MRI sessions, assets, and images attached to it).
- The **next planned** event is highlighted so you can see at a glance what's coming.

### The MRI panel
When an event's category is **MRI**, an **MRI session panel** appears directly
beneath it. This is where imaging for that step lives (next section).

---

## 9. MRI sessions

An **MRI session** records the details of one imaging session and holds its images.
Sessions appear under an **MRI** timeline event.

### Add a session
In the MRI panel click **Add MRI session**. Fields:

- **Title** (required) — e.g. *"Baseline brain MRI"*.
- **Modality** — MRI (more modalities can be added in future versions).
- **Acquisition date** (required).
- **Anatomical region** (optional) — e.g. motor cortex, brainstem, spinal cord.
- **Operator** (optional) and **Notes** (optional).

### Edit / delete
Each session has **Edit** and a **Delete** (trash) button. Deleting a session also
removes its research assets and attached image files. Below the session details
you'll find its **Research assets**.

---

## 10. Research assets & files

A **research asset** is a described placeholder for a scientific file (an image, PDF,
spreadsheet, etc.). You create the *description* first, then attach the *file*. This
keeps everything organized and searchable.

### Add an asset
Under an MRI session, open **Research assets → Add research asset**:

- **Type** — MRI Image, Histology Image, Microscopy Image, PDF, Spreadsheet,
  Document, Video, or Other.
- **Title** (required).
- **Status** — **Planned** or **Pending attachment**. (A third status, **Attached**,
  is set **automatically** once you attach a file — you don't choose it yourself.)
- **Description** (optional).

### Edit / delete
Each asset has **Edit** and a **Delete** (trash) button. Deleting an asset also
removes its attached image file.

---

## 11. MRI images & the image viewer

Once you have a research asset, you can attach the actual image to it. **This is a
desktop‑only feature.**

### Supported formats
| Format | Viewable in‑app? |
| --- | --- |
| **PNG** | Yes |
| **JPEG** | Yes |
| **TIFF** | Stored safely, but **no in‑app preview yet** — you'll see an honest "preview not available yet" note. |

### Attach or replace an image
1. In the research asset, click **Attach image** (or **Replace image**).
2. Choose a file from your computer.
3. The app copies the file into its own managed storage. The original file on your
   computer is untouched.

The asset's file name, type, and attached date are shown alongside the image.

### The image viewer (zoom / pan / fit)
For PNG and JPEG images you get a viewer with these controls:

| Control | Action |
| --- | --- |
| **Zoom in / Zoom out** | Buttons, or scroll the mouse wheel over the image. |
| **Fit to window** | Scales the image to fit the frame. |
| **Reset zoom** | Returns to 100% / fit. |
| **Pan** | When zoomed in, click and drag to move around. |

The percentage next to the buttons shows the current zoom. Zooming and panning only
change how you *view* the image — they never alter the file.

---

## 12. Annotations

Annotations let you mark findings directly on a viewable MRI image (PNG/JPEG). They
are saved with the image and are the foundation for future measurement and analysis
tools. **Desktop‑only.**

You'll find the **Annotations** tools just below the image viewer.

### The tools
| Tool | What it does |
| --- | --- |
| **Select** | The default. Click a mark to select it; click empty space to deselect. When zoomed in, drag to pan. |
| **Add point** | Click anywhere on the image to drop a point marker. |
| **Add rectangle** | Click and drag on the image to draw a box around a region. |

### Working with annotations
1. Choose **Add point** or **Add rectangle** and draw on the image.
2. The new mark is created and selected automatically, and the tool returns to
   **Select** so you can label it.
3. In the **selected annotation** panel, type a **Label** (e.g. *"Motor cortex
   lesion"*) and optional **Notes**, then click **Save changes**.
4. To remove a mark, select it and click the **Delete** (trash) button, then confirm.

### Adjusting a mark (drag & resize)
In **Select** mode you can fine‑tune a mark directly on the image:

- **Move** any point or rectangle by **dragging** it to a new spot.
- **Resize** a rectangle by dragging one of the small **square handles** at its
  corners (they appear on the selected rectangle).

The Measurements panel updates **live** as you drag, and the new position/size is
saved automatically when you release.

Marks are drawn **above** the image and stay pinned to the same spot when you zoom,
pan, or resize the window. The selected mark is highlighted so it's always clear
which one you're editing. On an **archived** study, annotations are view‑only.

### Linking a mark across sessions (progression over time)
When the same structure appears on more than one MRI session, you can **link** its
annotations so you can follow it over time. With a mark selected, the **Linked
annotations** panel shows:

- Each linked annotation's **relationship** (Baseline, Follow-up, or Related), its
  **MRI session, date, animal, and study**, and any note.
- **Create link** — choose another of this animal's annotations (from another
  session), pick the relationship, add an optional note, and save.
- **Open** — jump to the linked annotation's animal page.
- **Remove** — delete a link (the annotations themselves are untouched).

Links are **your** knowledge — the app never guesses correspondences. They're
directional and can't be duplicated or point a mark at itself. On an **archived**
study, links are view‑only. (Future progression, growth, and analysis features will
build on these links.)

### A bigger view & full screen
- The zoom **buttons** and mouse **wheel** step in small increments for precise
  control.
- Click **Full screen** to open an immersive view: the image fills the space on the
  left while the tools, the label/notes editor, and the Measurements panel sit in a
  panel on the right — so you never have to scroll to reach the controls. Full screen
  also shows a live **cursor‑coordinate readout** (normalized and pixel values) for
  precise inspection. Press **Esc** or **Exit full screen** to return.

### Measurements (the ROI Inspector)
Below the annotation tools, a **Measurements** panel shows quantitative details for
the mark you have selected, calculated automatically:

- **A point** shows its **position** — as normalized values (a 0–1 fraction of the
  image) and, once the image has loaded, in **pixels**.
- **A rectangle** shows its **width, height, area, perimeter, aspect ratio, center,
  top‑left and bottom‑right** corners — in pixels (when the image size is known) and
  as normalized values.

The panel is **read‑only** and updates instantly as you select different marks. If a
mark isn't selected, it shows a short prompt. Pixel figures appear only when the
image has loaded; otherwise you'll see the normalized values (the app never makes up
numbers). These measurements are **computed on the fly and are not saved** — they're
always derived from the annotation itself.

> **In scope today:** points and rectangles (labels + notes) and the live geometry
> measurements above.
> **Coming later:** distance tools, millimetre calibration, intensity/ROI
> statistics, overlays, and AI assistance — all building on today's annotations and
> measurement engine.

---

## 13. MRI comparison workspace

Open **MRI Compare** in the sidebar to view **two MRI images side by side** — ideal
for comparing time points (e.g. baseline vs. later disease stage).

1. Choose a session for the **left** and **right** panes. Only sessions with a
   viewable image are offered, and each pane shows its session's details so you
   always know what you're looking at.
2. Zoom and pan each side with the same controls as the single viewer.
3. Use the **Synchronize** options so both images move together:
   - **Zoom** — zooming one side zooms the other.
   - **Pan** — dragging one side moves the other.
   - **Both** — turns both on at once.

Synchronization mirrors your movements between the two viewers; it never changes the
images. Your sync choices are remembered for the session.

**Linked annotations across the two sessions.** Each image shows its own annotations
here (view‑only — you can't edit them in comparison). If a mark is **linked** to a
mark in the other session (see "Linking a mark across sessions" above), both are
outlined in **amber**; click one and its linked partner in the other panel is
highlighted, so you can follow the same structure between time points. Comparison
never moves the two images together for this — only your sync choices do that.

Keyboard shortcuts on this screen: see [section 19](#19-keyboard-shortcuts).

---

## 14. Search

The **search box** in the top bar is available from anywhere. Type and press Enter to
open the **Search** page, which searches across **everything**: studies, animals,
protocols, timeline events, MRI sessions, observations, and research assets. Results
are grouped by type and every result is clickable — you should never need to hunt
through folders.

### Filters
Open the **Filters** panel on the Search page to narrow results. Every filter is
optional and they combine:

| Filter | Narrows to |
| --- | --- |
| **Search in** | Everything, or one type (Studies, Animals, …). |
| **Timeline category** | Gene Confirmation, MRI, Histopathology, etc. |
| **Observation type** | Body weight or Motor assessment. |
| **MRI modality** | e.g. MRI. |
| **Research asset type** | MRI Image, PDF, etc. |
| **Status** | A lifecycle status (applies to whichever items have one). |
| **Mutation** | e.g. SOD1, TDP‑43. |
| **Treatment group** | e.g. Control, Riluzole. |
| **From / To dates** | A date range. |

Clear the filters at any time to widen the search again.

---

## 15. Publication workspace

Open **Publish** in the sidebar to assemble a tidy **package** of a study's contents
— the starting point for a manuscript or report.

1. **Pick a study.**
2. On the left, **choose what to include**: which animals, timeline events,
   observations, MRI sessions, and research assets. (The study details and its
   protocol are always included.) By default, everything is selected.
3. On the right, a **live preview** shows the package's sections and item counts
   (including annotations and longitudinal links), and warns you if, for example, no
   animals are selected or the package would be empty.

### Exporting the package
Below the preview, use **Export** to save the package to disk:

1. Choose a **format**:
   - **PDF report** — a professional, print‑ready document.
   - **Word (.docx)** — an editable report with headings and tables.
   - **CSV datasets** — separate spreadsheet files (`animals.csv`, `observations.csv`,
     `timeline.csv`, `annotations.csv`, `measurements.csv`, `annotation_links.csv`).
   - **JSON** — the complete package as structured data (ideal for analysis or future
     AI tools; stable schema).
2. Click **Export & choose destination** and pick a **folder**. The file(s) are
   written there, and a message confirms success (or reports a problem).

The report includes the study, protocol, animals, timeline, observations, MRI
sessions, research assets, **annotation summaries, measurements, and longitudinal
links**, plus **image references** (images are listed by name — they aren't embedded
in this version). Everything comes from the package you assembled; nothing is
fabricated.

> Not yet included: automatic paper writing, journal templates, AI summaries,
> embedded images, statistics, and cloud upload.

---

## 16. Settings

- **Appearance** — choose **Light**, **Dark**, or **System** theme.
- **About** — the application name and current **version**, plus the reminder that
  this software supports research productivity and is **not** a diagnostic tool.

More preferences will appear here as new features land.

---

## 17. Deleting vs archiving (and where your data lives)

### Archive first, delete rarely
- **Archive** (studies) = hide + make read‑only, **fully reversible**. Use this for
  finished work you want out of the way.
- **Delete** = permanent removal that **cascades** to everything inside the item
  (and removes attached image files from disk). Use this only when you're certain.

Delete is available at every level — a whole study (type its name to confirm), an
animal, an observation, a timeline event, an MRI session, a research asset, or a
single annotation. Every delete asks you to confirm, and **none can be undone**.

### Where your data is stored
Everything is stored **locally on your computer** — a local database for your records
and a managed folder for attached images. Nothing is sent to the cloud. Because the
data is local, keep your own backups of important work (a built‑in backup/restore
feature is planned).

---

## 18. Right-click (context) menus

The app behaves like a desktop program: **right-click** an item to get a small menu
of the actions available for it, instead of the browser's own menu. Every action in
these menus is one you can also reach by clicking buttons — right-click is just a
faster path. Destructive actions (Delete) still ask you to confirm.

> **Copy & paste still work.** Inside text boxes (any field you can type in), the
> normal right-click menu appears so you can cut, copy, paste, and select text.

Press **Esc**, or click elsewhere, to dismiss a menu. Use the **arrow keys** to move
through it and **Enter** to choose. Some items show their conventional shortcut key
on the right (e.g. Enter, F2, Delete; and R/F/Z/P on the comparison screen).

**What each right-click offers:**

| Right-click on… | Menu actions |
| --- | --- |
| **A study** (list) | Open |
| **A study's details** (its page) | Edit study · Archive · Delete study |
| **An animal** (list) | Open · Edit animal |
| **An animal's details** (its page) | Delete animal |
| **A timeline event** | Mark complete *(planned only)* · Edit event · Delete event |
| **An MRI session** | Edit MRI session · Delete MRI session |
| **A research asset** | Edit research asset · Delete research asset |
| **A search result** | Open |
| **The MRI image** (background) | Fit image · Reset zoom · Center image · Add point · Add rectangle |
| **An annotation** (a mark) | Edit label · Edit notes · Delete annotation |
| **The MRI comparison view** | Fit both · Reset both · Sync zoom · Sync pan |

Items greyed out (e.g. *Add measurement…*, *Export snapshot…*) mark features planned
for a future version — they're shown so you know they're coming, but aren't active
yet. On an **archived** study, editing/deleting actions don't appear (it's read-only).

---

## 19. Keyboard shortcuts

**MRI comparison workspace** (the **MRI Compare** screen):

| Key | Action |
| --- | --- |
| **R** | Reset both viewers |
| **F** | Fit both images to their frames |
| **Z** | Toggle **synchronized zoom** |
| **P** | Toggle **synchronized pan** |

Throughout the app, standard keyboard navigation works: **Tab** moves between
controls, **Enter/Space** activates them, and **Esc** closes a confirmation dialog.

---

## 20. Tips & troubleshooting

- **A button is missing on a study's items.** The study is probably **archived**
  (read‑only). Restore it (edit it and change the status) to make changes again.
- **"Available in the installed desktop app."** You're in the browser preview.
  Saving data, images, and annotations need the desktop app.
- **An image won't preview.** TIFF files are stored but can't be previewed in‑app
  yet. PNG or JPEG will display in the viewer.
- **"This image couldn't be loaded."** The underlying file may have been moved or
  removed outside the app. Re‑attach the image to the asset.
- **I can't pick a session to compare.** Only sessions that have a **viewable**
  (PNG/JPEG) image attached can be compared.
- **A duplicate animal ID is rejected.** Animal IDs must be unique **within a
  study**; choose a different ID or check the existing mouse.
- **I archived instead of deleting (or vice‑versa).** Archiving is reversible — just
  restore the study. Deleting is not; restore from your own backup if needed.
- **Right‑click shows the app's own menu, not the browser's.** That's intentional —
  it gives you desktop‑style actions. Inside text fields, the normal right‑click menu
  (copy/paste) still appears.

---

## 21. Glossary

| Term | Meaning |
| --- | --- |
| **Study** | A research project (mutation, cohort, question) that contains everything else. |
| **Animal** | One mouse, identified by a study‑unique ID. |
| **Observation** | A repeated measurement (body weight in grams, or a motor score on a named scale). |
| **Timeline event** | A step in a mouse's experiment workflow (planned or completed). |
| **Protocol** | A study's reusable checklist of steps; new animals inherit it as their timeline. |
| **MRI session** | Details of one imaging session, attached to an MRI timeline event. |
| **Research asset** | A described placeholder for a file (image, PDF, spreadsheet, …). |
| **Stored image** | The actual PNG/JPEG/TIFF attached to a research asset. |
| **Annotation** | A point or rectangle drawn on an image, with an optional label and notes. |
| **Archive** | Hide a study and make it read‑only (reversible). |
| **Delete** | Permanently remove an item and everything inside it (not reversible). |

---

*ALS Research Companion is a scientific productivity platform for ALS transgenic
mouse research. It does not diagnose disease or provide clinical recommendations.*
