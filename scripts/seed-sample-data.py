"""
Seed a clearly-labelled SAMPLE dataset into the ALS Research Companion database so
you can explore every feature with realistic data.

WHAT IT DOES
  - Inserts SAMPLE studies / animals / observations / protocol + steps / timeline
    events / MRI sessions / research assets into your LOCAL app database.
  - Copies the generated sample images into the app's managed image folder and
    records them as attached files, so they appear in the viewer and MRI comparison.
  - Everything is prefixed "SAMPLE —" and is fully reversible with --clear.

IMPORTANT
  - CLOSE the app before running (SQLite is single-writer).
  - Run scripts/make-sample-media.py first (creates sample-data/).
  - This writes to YOUR real local database. It never deletes your own data; --clear
    only removes rows it created (SAMPLE studies and everything under them).

USAGE
  python scripts/seed-sample-data.py            # add the sample data
  python scripts/seed-sample-data.py --clear    # remove only the sample data
  python scripts/seed-sample-data.py --db <path> --images-dir <path>   # overrides
"""

from __future__ import annotations
import argparse
import json
import os
import shutil
import sqlite3
import uuid
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SAMPLE = ROOT / "sample-data"
IDENTIFIER = "com.alsresearch.companion"
STUDY_PREFIX = "SAMPLE — "  # "SAMPLE — "

NOW = datetime.now(timezone.utc)
TODAY = date.today()
_counter = 0


def default_db() -> Path:
    return Path(os.environ.get("APPDATA", Path.home())) / IDENTIFIER / "als_research_companion.db"


def default_images_dir() -> Path:
    base = os.environ.get("LOCALAPPDATA") or os.environ.get("APPDATA") or str(Path.home())
    return Path(base) / IDENTIFIER / "images"


def touch() -> str:
    """A steadily-decreasing recent ISO timestamp, so recent-activity has a clear order."""
    global _counter
    ts = NOW - timedelta(minutes=6 * _counter)
    _counter += 1
    return ts.strftime("%Y-%m-%dT%H:%M:%S.") + f"{ts.microsecond // 1000:03d}Z"


def d(days: int) -> str:
    return (TODAY + timedelta(days=days)).isoformat()


def uid() -> str:
    return uuid.uuid4().hex


# --------------------------------------------------------------------------- clear
def clear_samples(con: sqlite3.Connection, images_dir: Path) -> dict:
    cur = con.cursor()
    study_ids = [r[0] for r in cur.execute(
        "SELECT id FROM studies WHERE name LIKE ?", (STUDY_PREFIX + "%",))]
    removed = {"studies": 0, "stored_files": 0, "images_unlinked": 0}
    if not study_ids:
        return removed

    q = ",".join("?" * len(study_ids))
    animal_ids = [r[0] for r in cur.execute(
        f"SELECT id FROM animals WHERE study_id IN ({q})", study_ids)]
    event_ids, session_ids, asset_ids = [], [], []
    if animal_ids:
        qa = ",".join("?" * len(animal_ids))
        event_ids = [r[0] for r in cur.execute(
            f"SELECT id FROM timeline_events WHERE animal_id IN ({qa})", animal_ids)]
    if event_ids:
        qe = ",".join("?" * len(event_ids))
        session_ids = [r[0] for r in cur.execute(
            f"SELECT id FROM mri_sessions WHERE timeline_event_id IN ({qe})", event_ids)]
    if session_ids:
        qs = ",".join("?" * len(session_ids))
        asset_ids = [r[0] for r in cur.execute(
            f"SELECT id FROM research_assets WHERE owner_type='mri_session' AND owner_id IN ({qs})",
            session_ids)]
    if asset_ids:
        qr = ",".join("?" * len(asset_ids))
        for (rel,) in cur.execute(
                f"SELECT relative_path FROM stored_files WHERE research_asset_id IN ({qr})", asset_ids):
            f = images_dir.parent / rel  # relative_path is "images/<id>.<ext>"
            if f.exists():
                f.unlink()
                removed["images_unlinked"] += 1
        removed["stored_files"] = cur.execute(
            f"DELETE FROM stored_files WHERE research_asset_id IN ({qr})", asset_ids).rowcount
        cur.execute(f"DELETE FROM research_assets WHERE id IN ({qr})", asset_ids)
    if session_ids:
        cur.execute(f"DELETE FROM mri_sessions WHERE id IN ({','.join('?'*len(session_ids))})", session_ids)
    if animal_ids:
        qa = ",".join("?" * len(animal_ids))
        cur.execute(f"DELETE FROM timeline_events WHERE animal_id IN ({qa})", animal_ids)
        cur.execute(f"DELETE FROM observations WHERE animal_id IN ({qa})", animal_ids)
    for sid in study_ids:
        tpl = [r[0] for r in cur.execute("SELECT id FROM protocol_templates WHERE study_id=?", (sid,))]
        for tid in tpl:
            cur.execute("DELETE FROM protocol_steps WHERE protocol_template_id=?", (tid,))
        cur.execute("DELETE FROM protocol_templates WHERE study_id=?", (sid,))
    cur.execute(f"DELETE FROM animals WHERE study_id IN ({q})", study_ids)
    removed["studies"] = cur.execute(f"DELETE FROM studies WHERE id IN ({q})", study_ids).rowcount
    con.commit()
    return removed


# ---------------------------------------------------------------------------- seed
class Seeder:
    def __init__(self, con: sqlite3.Connection, images_dir: Path, manifest: dict):
        self.con = con
        self.cur = con.cursor()
        self.images_dir = images_dir
        self.images = {i["file"]: i for i in manifest["images"]}
        self.counts = {k: 0 for k in
                       ("studies", "animals", "observations", "protocols", "steps",
                        "events", "sessions", "assets", "files")}

    def study(self, name, strain, status, description):
        sid = uid()
        t = touch()
        self.cur.execute(
            "INSERT INTO studies (id,name,description,strain,status,created_at,updated_at)"
            " VALUES (?,?,?,?,?,?,?)",
            (sid, STUDY_PREFIX + name, description, strain, status, t, t))
        self.counts["studies"] += 1
        return sid

    def animal(self, study_id, identifier, sex, dob, mutation, group):
        aid = uid()
        t = touch()
        self.cur.execute(
            "INSERT INTO animals (id,study_id,animal_identifier,sex,date_of_birth,mutation,"
            "treatment_group,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
            (aid, study_id, identifier, sex, dob, mutation, group, t, t))
        self.counts["animals"] += 1
        return aid

    def observation(self, animal_id, observed_on, kind, value, scale=None, notes=None):
        t = touch()
        self.cur.execute(
            "INSERT INTO observations (id,animal_id,observed_on,kind,value,scale_name,notes,"
            "created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
            (uid(), animal_id, observed_on, kind, value, scale, notes, t, t))
        self.counts["observations"] += 1

    def protocol(self, study_id, name, steps):
        tid = uid()
        t = touch()
        self.cur.execute(
            "INSERT INTO protocol_templates (id,study_id,name,created_at,updated_at) VALUES (?,?,?,?,?)",
            (tid, study_id, name, t, t))
        self.counts["protocols"] += 1
        for order, (title, category, offset, notes) in enumerate(steps):
            st = touch()
            self.cur.execute(
                "INSERT INTO protocol_steps (id,protocol_template_id,title,category,offset_days,"
                "notes,display_order,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
                (uid(), tid, title, category, offset, notes, order, st, st))
            self.counts["steps"] += 1

    def event(self, animal_id, title, category, status, planned=None, completed=None, notes=None):
        eid = uid()
        t = touch()
        self.cur.execute(
            "INSERT INTO timeline_events (id,animal_id,title,category,status,planned_date,"
            "completed_date,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
            (eid, animal_id, title, category, status, planned, completed, notes, t, t))
        self.counts["events"] += 1
        return eid

    def session(self, event_id, title, region, acquisition, operator, notes=None):
        mid = uid()
        t = touch()
        self.cur.execute(
            "INSERT INTO mri_sessions (id,timeline_event_id,title,modality,anatomical_region,"
            "acquisition_date,operator,notes,created_at,updated_at) VALUES (?,?,?,'mri',?,?,?,?,?,?)",
            (mid, event_id, title, region, acquisition, operator, notes, t, t))
        self.counts["sessions"] += 1
        return mid

    def asset(self, session_id, asset_type, title, status, description=None, image_file=None):
        rid = uid()
        t = touch()
        # An attached image overrides status to "attached" (system-controlled).
        if image_file:
            status = "attached"
        self.cur.execute(
            "INSERT INTO research_assets (id,owner_type,owner_id,asset_type,title,description,"
            "status,created_at,updated_at) VALUES (?,'mri_session',?,?,?,?,?,?,?)",
            (rid, session_id, asset_type, title, description, status, t, t))
        self.counts["assets"] += 1
        if image_file:
            self._attach(rid, image_file)
        return rid

    def _attach(self, asset_id, image_file):
        meta = self.images[image_file]
        ext = Path(image_file).suffix.lstrip(".").lower()
        sid = uid()
        rel = f"images/{sid}.{ext}"
        self.images_dir.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(SAMPLE / "images" / image_file, self.images_dir / f"{sid}.{ext}")
        self.cur.execute(
            "INSERT INTO stored_files (id,research_asset_id,storage_type,relative_path,"
            "original_name,mime_type,checksum,created_at) VALUES (?,?,'local_managed',?,?,?,?,?)",
            (sid, asset_id, rel, image_file, meta["mime"], None, touch()))
        self.counts["files"] += 1


def build(seeder: Seeder) -> None:
    # ===================================================================== Study 1
    s1 = seeder.study(
        "SOD1-G93A survival cohort", "SOD1-G93A", "active",
        "Longitudinal survival study of the SOD1-G93A ALS mouse model with weekly "
        "body weight and hindlimb motor scoring, MRI at baseline and follow-up.")
    seeder.protocol(s1, STUDY_PREFIX + "SOD1-G93A protocol", [
        ("Confirm SOD1 genotype", "gene_confirmation", 0, "PCR genotyping"),
        ("Baseline behavioural assessment", "behavioral_assessment", 7, None),
        ("Baseline brain MRI", "mri", 14, "T2, brain"),
        ("Neurological examination", "neurological_examination", 21, None),
        ("Follow-up brain MRI", "mri", 56, None),
        ("Biochemical analysis", "biochemical_analysis", 70, "Neurofilament light"),
        ("Endpoint histopathology", "histopathology", 90, "Lumbar spinal cord"),
    ])

    m101 = seeder.animal(s1, "M-101", "female", d(-140), "SOD1-G93A", "Vehicle")
    m102 = seeder.animal(s1, "M-102", "male", d(-138), "SOD1-G93A", "Riluzole")
    m103 = seeder.animal(s1, "M-103", "male", d(-142), "SOD1-G93A", "Control")
    m104 = seeder.animal(s1, "M-104", "unknown", d(-140), "SOD1-G93A", "Edaravone")

    # Longitudinal body weights (declining) + motor scores for M-101.
    weights = [25.1, 24.8, 24.6, 24.0, 23.4, 22.7, 21.9, 21.0, 20.2, 19.6, 19.1, 18.7, 18.4]
    for i, w in enumerate(weights):
        day = -84 + i * 7
        seeder.observation(m101, d(day), "body_weight", w,
                           notes=("Baseline" if i == 0 else None))
    for i, score in enumerate([5, 5, 4, 4, 3, 3, 2]):
        seeder.observation(m101, d(-84 + i * 14), "motor_score", score, scale="Hindlimb 0-5",
                           notes=("Symptom onset noted" if score == 4 and i == 2 else None))
    # A few observations for the others (covers repeats, both kinds).
    for a, base in [(m102, 24.3), (m103, 25.6), (m104, 24.9)]:
        for i, dw in enumerate([0.0, -0.8, -1.7]):
            seeder.observation(a, d(-28 + i * 14), "body_weight", round(base + dw, 1))
        seeder.observation(a, d(0), "motor_score", 4, scale="Hindlimb 0-5")

    # --- M-101 timeline: completed history + today's-work + upcoming + MRI sessions
    seeder.event(m101, "Confirm SOD1 genotype", "gene_confirmation", "completed",
                 completed=d(-120), notes="Positive")
    seeder.event(m101, "Baseline behavioural assessment", "behavioral_assessment", "completed",
                 completed=d(-110))
    e_mri1 = seeder.event(m101, "Baseline brain MRI", "mri", "completed", completed=d(-100))
    seeder.event(m101, "Neurological examination", "neurological_examination", "completed",
                 completed=d(-2), notes="Mild hindlimb weakness")  # recently completed
    e_mri2 = seeder.event(m101, "Follow-up brain MRI", "mri", "completed", completed=d(-1))
    seeder.event(m101, "Weekly behavioural assessment", "behavioral_assessment", "planned",
                 planned=d(0))  # planned today
    seeder.event(m101, "Biochemical analysis (NfL)", "biochemical_analysis", "planned",
                 planned=d(-5), notes="Overdue")  # overdue
    seeder.event(m101, "Endpoint histopathology", "histopathology", "planned", planned=d(14))

    # --- M-102 timeline + MRI sessions
    e_mri3 = seeder.event(m102, "Baseline brain MRI", "mri", "completed", completed=d(-90))
    e_mri4 = seeder.event(m102, "Brainstem MRI", "mri", "completed", completed=d(-3))
    seeder.event(m102, "Cage enrichment change", "custom", "planned", planned=d(0))
    seeder.event(m102, "Endpoint histopathology", "histopathology", "planned", planned=d(-10))  # overdue

    # --- M-103 timeline + MRI session (TIFF image -> stored but not viewable)
    e_mri5 = seeder.event(m103, "Baseline brain MRI", "mri", "completed", completed=d(-60))
    seeder.event(m103, "Follow-up behavioural assessment", "behavioral_assessment", "planned",
                 planned=d(3))
    # M-104: a planned MRI (no session yet)
    seeder.event(m104, "Baseline brain MRI", "mri", "planned", planned=d(7))

    # --- MRI sessions + research assets (cover every asset type + status) ---
    ses1 = seeder.session(e_mri1, "Baseline brain MRI", "Brain", d(-100), "Dr. Chen",
                          "T2-weighted, 9.4T")
    seeder.asset(ses1, "mri_image", "Brain MRI — baseline (T2)", "attached",
                 image_file="mri-brain-baseline.jpg")
    seeder.asset(ses1, "histology_image", "Spinal cord histology (H&E)", "attached",
                 image_file="histology-spinalcord.jpg")
    seeder.asset(ses1, "pdf", "MRI session report (SAMPLE)", "pending_attachment",
                 description="See sample-data/docs/sample-mri-report.pdf (PDF viewing is a future feature)")

    ses2 = seeder.session(e_mri2, "Follow-up brain MRI", "Brain", d(-1), "Dr. Chen")
    seeder.asset(ses2, "mri_image", "Brain MRI — week 8 (T2)", "attached",
                 image_file="mri-brain-week8.png")
    seeder.asset(ses2, "spreadsheet", "Volumetric measurements (SAMPLE)", "pending_attachment",
                 description="See sample-data/docs/sample-observations.csv")

    ses3 = seeder.session(e_mri3, "Baseline brain MRI", "Brain", d(-90), "Sam Ortiz")
    seeder.asset(ses3, "mri_image", "Brain MRI — week 16 (T2)", "attached",
                 image_file="mri-brain-week16.jpg")
    seeder.asset(ses3, "microscopy_image", "Motor neuron microscopy", "planned")

    ses4 = seeder.session(e_mri4, "Brainstem MRI", "Brainstem", d(-3), "Sam Ortiz")
    seeder.asset(ses4, "mri_image", "Brainstem MRI (T2)", "attached",
                 image_file="mri-brainstem.png")
    seeder.asset(ses4, "video", "Gait recording (SAMPLE)", "planned")

    ses5 = seeder.session(e_mri5, "Baseline brain MRI", "Brain", d(-60), "Dr. Chen",
                          "High-resolution TIFF acquisition")
    seeder.asset(ses5, "mri_image", "Brain MRI — high resolution (TIFF)", "attached",
                 image_file="mri-brain-highres.tif")  # TIFF -> stored, not viewable in-app
    seeder.asset(ses5, "document", "Acquisition notes (SAMPLE)", "pending_attachment")
    seeder.asset(ses5, "other", "Raw k-space export", "planned")

    # ===================================================================== Study 2
    s2 = seeder.study(
        "TDP-43 riluzole trial", "TDP-43 (Q331K)", "planning",
        "Planned treatment trial comparing riluzole vs vehicle in a TDP-43 model.")
    t201 = seeder.animal(s2, "T-201", "female", d(-70), "TDP-43", "Riluzole")
    t202 = seeder.animal(s2, "T-202", "male", d(-72), "TDP-43", "Vehicle")
    for a in (t201, t202):
        seeder.observation(a, d(-14), "body_weight", 23.5)
        seeder.observation(a, d(0), "body_weight", 23.1)
    seeder.event(t201, "Confirm TDP-43 genotype", "gene_confirmation", "completed", completed=d(-30))
    seeder.event(t201, "Baseline brain MRI", "mri", "planned", planned=d(2))
    seeder.event(t202, "Baseline behavioural assessment", "behavioral_assessment", "planned",
                 planned=d(0))

    # ===================================================================== Study 3
    s3 = seeder.study(
        "C9orf72 histopathology", "C9orf72", "completed",
        "Completed endpoint histopathology study of a C9orf72 repeat-expansion model.")
    c301 = seeder.animal(s3, "C-301", "male", d(-200), "C9orf72", "Control")
    seeder.observation(c301, d(-30), "motor_score", 1, scale="Hindlimb 0-5", notes="Endpoint")
    seeder.event(c301, "Endpoint histopathology", "histopathology", "completed", completed=d(-25),
                 notes="Extensive motor neuron loss")

    # ===================================================================== Study 4
    s4 = seeder.study(
        "FUS pilot (archived)", "FUS", "archived",
        "Small archived pilot in a FUS model — kept read-only.")
    seeder.animal(s4, "F-401", "female", d(-90), "FUS", "Experimental drug")


# ---------------------------------------------------------------------------- main
def main() -> None:
    ap = argparse.ArgumentParser(description="Seed / clear SAMPLE data for ALS Research Companion.")
    ap.add_argument("--db", type=Path, default=default_db())
    ap.add_argument("--images-dir", type=Path, default=default_images_dir())
    ap.add_argument("--clear", action="store_true", help="Remove the SAMPLE data and exit.")
    args = ap.parse_args()

    print(f"Database   : {args.db}")
    print(f"Images dir : {args.images_dir}")

    if not args.db.exists():
        raise SystemExit(
            "\nERROR: database not found. Launch the desktop app once (so it creates and "
            "migrates the database), close it, then run this again.")

    try:
        con = sqlite3.connect(str(args.db), timeout=3)
        con.execute("PRAGMA foreign_keys=OFF")
        # Confirm the v8 schema is present.
        tables = {r[0] for r in con.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        for required in ("studies", "animals", "timeline_events", "mri_sessions",
                         "research_assets", "stored_files"):
            if required not in tables:
                raise SystemExit(f"\nERROR: table '{required}' missing — is this the app database "
                                 "(and has it been launched to apply migrations)?")

        removed = clear_samples(con, args.images_dir)
        if args.clear:
            print(f"\nCleared SAMPLE data: {removed['studies']} studies, "
                  f"{removed['stored_files']} stored files, "
                  f"{removed['images_unlinked']} image files removed.")
            con.close()
            return
        if removed["studies"]:
            print(f"(Replaced existing SAMPLE data: {removed['studies']} studies removed first.)")

        manifest_path = SAMPLE / "manifest.json"
        if not manifest_path.exists():
            raise SystemExit("\nERROR: sample-data/manifest.json not found. Run "
                             "`python scripts/make-sample-media.py` first.")
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))

        seeder = Seeder(con, args.images_dir, manifest)
        build(seeder)
        con.commit()
        con.close()

        c = seeder.counts
        print("\nSeeded SAMPLE data:")
        for k in ("studies", "animals", "observations", "protocols", "steps", "events",
                  "sessions", "assets", "files"):
            print(f"  {k:14}: {c[k]}")
        print("\nDone. Open the app to explore the Dashboard, Studies, MRI sessions,")
        print("attached images, and the MRI Compare workspace.")
        print("Remove it any time with:  python scripts/seed-sample-data.py --clear")
    except sqlite3.OperationalError as e:
        if "locked" in str(e).lower():
            raise SystemExit("\nERROR: the database is locked. CLOSE the ALS Research Companion "
                             "app, then run this again.")
        raise


if __name__ == "__main__":
    main()
