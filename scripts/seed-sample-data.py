"""
Seed a clearly-labelled SAMPLE dataset into the ALS Research Companion database so
you can explore EVERY feature with realistic, animal-only laboratory data.

WHAT IT DOES
  - Inserts SAMPLE studies / animals / protocols / timeline / observations / MRI +
    histology sessions / research assets / biomarker samples + results into your
    LOCAL app database, and copies the generated sample media into the app's managed
    image folder (so images appear in the viewer, comparison, and annotations).
  - Creates annotations on stored images and longitudinal annotation LINKS across
    sessions, so the annotation + comparison + progression features have real data.
  - Everything hangs off studies whose name starts with "SAMPLE — " and is fully
    reversible with --clear (which removes ONLY those studies and everything under
    them — never your own data).

IMPORTANT
  - CLOSE the app before running (SQLite is single-writer).
  - Run scripts/make-sample-media.py first (creates sample-data/manifest.json).

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
# Legacy marker (older builds prefixed sample study names). Kept ONLY so --clear can
# still find and remove data seeded by an older version. New sample studies use
# believable, unprefixed names and are tracked by id in `seeded-studies.json`.
STUDY_PREFIX = "SAMPLE — "
SEEDED_IDS = SAMPLE / "seeded-studies.json"

NOW = datetime.now(timezone.utc)
TODAY = date.today()
_counter = 0


def default_db() -> Path:
    return Path(os.environ.get("APPDATA", Path.home())) / IDENTIFIER / "als_research_companion.db"


def default_images_dir() -> Path:
    base = os.environ.get("LOCALAPPDATA") or os.environ.get("APPDATA") or str(Path.home())
    return Path(base) / IDENTIFIER / "images"


def touch() -> str:
    global _counter
    ts = NOW - timedelta(minutes=6 * _counter)
    _counter += 1
    return ts.strftime("%Y-%m-%dT%H:%M:%S.") + f"{ts.microsecond // 1000:03d}Z"


def d(days: int) -> str:
    return (TODAY + timedelta(days=days)).isoformat()


def uid() -> str:
    return uuid.uuid4().hex


# --------------------------------------------------------------------------- clear
def _ids(cur, sql, params):
    return [r[0] for r in cur.execute(sql, params)]


def _in(ids):
    return ",".join("?" * len(ids))


def _seeded_study_ids(cur) -> list[str]:
    """The sample study ids to remove: those recorded in `seeded-studies.json`
    (current builds) plus any legacy `SAMPLE — ` prefixed studies (older builds)."""
    ids: list[str] = []
    if SEEDED_IDS.exists():
        try:
            ids = list(json.loads(SEEDED_IDS.read_text(encoding="utf-8")).get("study_ids", []))
        except Exception:
            ids = []
    # Keep only ids that still exist, then add any legacy prefixed studies.
    existing = set(_ids(cur, "SELECT id FROM studies", ()))
    ids = [i for i in ids if i in existing]
    legacy = _ids(cur, "SELECT id FROM studies WHERE name LIKE ?", (STUDY_PREFIX + "%",))
    for i in legacy:
        if i not in ids:
            ids.append(i)
    return ids


def clear_samples(con: sqlite3.Connection, images_dir: Path) -> dict:
    """Remove ONLY the sample studies and every descendant, across all v2.0 tables."""
    cur = con.cursor()
    removed = {k: 0 for k in ("studies", "stored_files", "annotations",
                              "annotation_links", "biomarker_samples",
                              "biomarker_results", "images_unlinked")}
    study_ids = _seeded_study_ids(cur)
    if not study_ids:
        return removed

    animal_ids = _ids(cur, f"SELECT id FROM animals WHERE study_id IN ({_in(study_ids)})", study_ids)
    event_ids = _ids(cur, f"SELECT id FROM timeline_events WHERE animal_id IN ({_in(animal_ids)})",
                     animal_ids) if animal_ids else []

    mri_ids, histo_ids, sample_ids = [], [], []
    if event_ids:
        qe = _in(event_ids)
        mri_ids = _ids(cur, f"SELECT id FROM mri_sessions WHERE timeline_event_id IN ({qe})", event_ids)
        histo_ids = _ids(cur, f"SELECT id FROM histology_sessions WHERE timeline_event_id IN ({qe})", event_ids)
        sample_ids = _ids(cur, f"SELECT id FROM biomarker_samples WHERE timeline_event_id IN ({qe})", event_ids)

    # research_assets are polymorphic over mri_session + histology_session owners.
    asset_ids = []
    for owner_type, owner_ids in (("mri_session", mri_ids), ("histology_session", histo_ids)):
        if owner_ids:
            asset_ids += _ids(cur,
                              f"SELECT id FROM research_assets WHERE owner_type=? AND owner_id IN ({_in(owner_ids)})",
                              [owner_type, *owner_ids])

    file_ids = []
    if asset_ids:
        qr = _in(asset_ids)
        rows = cur.execute(f"SELECT id, relative_path FROM stored_files WHERE research_asset_id IN ({qr})", asset_ids).fetchall()
        file_ids = [r[0] for r in rows]
        for _, rel in rows:
            f = images_dir.parent / rel  # relative_path is "images/<id>.<ext>"
            if f.exists():
                f.unlink()
                removed["images_unlinked"] += 1

    # annotation_links -> annotations -> stored_files (FK order; FKs are OFF but be correct anyway).
    if file_ids:
        qf = _in(file_ids)
        annotation_ids = _ids(cur, f"SELECT id FROM annotations WHERE stored_file_id IN ({qf})", file_ids)
        if annotation_ids:
            qan = _in(annotation_ids)
            removed["annotation_links"] = cur.execute(
                f"DELETE FROM annotation_links WHERE source_annotation_id IN ({qan}) "
                f"OR target_annotation_id IN ({qan})", [*annotation_ids, *annotation_ids]).rowcount
            removed["annotations"] = cur.execute(
                f"DELETE FROM annotations WHERE id IN ({qan})", annotation_ids).rowcount
        removed["stored_files"] = cur.execute(
            f"DELETE FROM stored_files WHERE id IN ({qf})", file_ids).rowcount
    if asset_ids:
        cur.execute(f"DELETE FROM research_assets WHERE id IN ({_in(asset_ids)})", asset_ids)
    if mri_ids:
        cur.execute(f"DELETE FROM mri_sessions WHERE id IN ({_in(mri_ids)})", mri_ids)
    if histo_ids:
        cur.execute(f"DELETE FROM histology_sessions WHERE id IN ({_in(histo_ids)})", histo_ids)
    if sample_ids:
        qs = _in(sample_ids)
        removed["biomarker_results"] = cur.execute(
            f"DELETE FROM biomarker_results WHERE biomarker_sample_id IN ({qs})", sample_ids).rowcount
        removed["biomarker_samples"] = cur.execute(
            f"DELETE FROM biomarker_samples WHERE id IN ({qs})", sample_ids).rowcount
    if event_ids:
        cur.execute(f"DELETE FROM timeline_events WHERE id IN ({_in(event_ids)})", event_ids)
    if animal_ids:
        cur.execute(f"DELETE FROM observations WHERE animal_id IN ({_in(animal_ids)})", animal_ids)
    for sid in study_ids:
        tpl = _ids(cur, "SELECT id FROM protocol_templates WHERE study_id=?", (sid,))
        for tid in tpl:
            cur.execute("DELETE FROM protocol_steps WHERE protocol_template_id=?", (tid,))
        cur.execute("DELETE FROM protocol_templates WHERE study_id=?", (sid,))
    if animal_ids:
        cur.execute(f"DELETE FROM animals WHERE id IN ({_in(animal_ids)})", animal_ids)
    removed["studies"] = cur.execute(f"DELETE FROM studies WHERE id IN ({_in(study_ids)})", study_ids).rowcount
    con.commit()
    # The seeded-ids record is now stale — drop it so a later run starts clean.
    try:
        SEEDED_IDS.unlink(missing_ok=True)
    except Exception:
        pass
    return removed


# ---------------------------------------------------------------------------- seed
class Seeder:
    def __init__(self, con, images_dir, manifest):
        self.con = con
        self.cur = con.cursor()
        self.images_dir = images_dir
        # A combined media map (images + documents), each tagged with its source folder.
        self.media = {}
        for i in manifest.get("images", []):
            self.media[i["file"]] = {**i, "folder": "images"}
        for dd in manifest.get("docs", []):
            self.media[dd["file"]] = {**dd, "folder": "docs"}
        self.study_ids: list[str] = []
        self.counts = {k: 0 for k in
                       ("studies", "animals", "observations", "protocols", "steps",
                        "events", "mri_sessions", "histology_sessions", "assets",
                        "files", "annotations", "links", "biomarker_samples",
                        "biomarker_results")}

    def study(self, name, strain, status, description):
        sid, t = uid(), touch()
        self.cur.execute(
            "INSERT INTO studies (id,name,description,strain,status,created_at,updated_at)"
            " VALUES (?,?,?,?,?,?,?)",
            (sid, name, description, strain, status, t, t))
        self.study_ids.append(sid)
        self.counts["studies"] += 1
        return sid

    def animal(self, study_id, identifier, sex, dob, mutation, group):
        aid, t = uid(), touch()
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
        tid, t = uid(), touch()
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
        eid, t = uid(), touch()
        self.cur.execute(
            "INSERT INTO timeline_events (id,animal_id,title,category,status,planned_date,"
            "completed_date,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
            (eid, animal_id, title, category, status, planned, completed, notes, t, t))
        self.counts["events"] += 1
        return eid

    def mri_session(self, event_id, title, region, acquisition, operator, notes=None):
        mid, t = uid(), touch()
        self.cur.execute(
            "INSERT INTO mri_sessions (id,timeline_event_id,title,modality,anatomical_region,"
            "acquisition_date,operator,notes,created_at,updated_at) VALUES (?,?,?,'mri',?,?,?,?,?,?)",
            (mid, event_id, title, region, acquisition, operator, notes, t, t))
        self.counts["mri_sessions"] += 1
        return mid

    def histology_session(self, event_id, stain, tissue, acquisition, operator, notes=None,
                          magnification=None):
        hid, t = uid(), touch()
        self.cur.execute(
            "INSERT INTO histology_sessions (id,timeline_event_id,stain,tissue,magnification,"
            "acquisition_date,operator,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
            (hid, event_id, stain, tissue, magnification, acquisition, operator, notes, t, t))
        self.counts["histology_sessions"] += 1
        return hid

    def asset(self, owner_type, owner_id, asset_type, title, status="planned",
              description=None, image_file=None):
        rid, t = uid(), touch()
        meta = self.media.get(image_file) if image_file else None
        if meta and (SAMPLE / meta["folder"] / image_file).exists():
            status = "attached"
        self.cur.execute(
            "INSERT INTO research_assets (id,owner_type,owner_id,asset_type,title,description,"
            "status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
            (rid, owner_type, owner_id, asset_type, title, description, status, t, t))
        self.counts["assets"] += 1
        file_id = None
        if status == "attached" and image_file:
            file_id = self._attach(rid, image_file)
        return rid, file_id

    def _attach(self, asset_id, image_file):
        meta = self.media[image_file]
        ext = Path(image_file).suffix.lstrip(".").lower()
        fid = uid()
        rel = f"images/{fid}.{ext}"
        self.images_dir.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(SAMPLE / meta["folder"] / image_file, self.images_dir / f"{fid}.{ext}")
        self.cur.execute(
            "INSERT INTO stored_files (id,research_asset_id,storage_type,relative_path,"
            "original_name,mime_type,checksum,created_at) VALUES (?,?,'local_managed',?,?,?,?,?)",
            (fid, asset_id, rel, image_file, meta["mime"], None, touch()))
        self.counts["files"] += 1
        return fid

    def annotation(self, stored_file_id, geometry, label=None, notes=None):
        if stored_file_id is None:
            return None
        aid, t = uid(), touch()
        atype = geometry["kind"]
        self.cur.execute(
            "INSERT INTO annotations (id,stored_file_id,annotation_type,label,geometry,notes,"
            "created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)",
            (aid, stored_file_id, atype, label, json.dumps(geometry), notes, t, t))
        self.counts["annotations"] += 1
        return aid

    def link(self, source_id, target_id, relationship, notes=None):
        if source_id is None or target_id is None:
            return
        self.cur.execute(
            "INSERT INTO annotation_links (id,source_annotation_id,target_annotation_id,"
            "relationship_type,notes,created_at) VALUES (?,?,?,?,?,?)",
            (uid(), source_id, target_id, relationship, notes, touch()))
        self.counts["links"] += 1

    def biomarker_sample(self, event_id, sample_type, collection_date, operator=None, notes=None):
        sid, t = uid(), touch()
        self.cur.execute(
            "INSERT INTO biomarker_samples (id,timeline_event_id,sample_type,collection_date,"
            "operator,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)",
            (sid, event_id, sample_type, collection_date, operator, notes, t, t))
        self.counts["biomarker_samples"] += 1
        return sid

    def biomarker_result(self, sample_id, name, value, unit=None, method=None, notes=None):
        self.cur.execute(
            "INSERT INTO biomarker_results (id,biomarker_sample_id,biomarker_name,value,unit,"
            "method,notes,created_at) VALUES (?,?,?,?,?,?,?,?)",
            (uid(), sample_id, name, value, unit, method, notes, touch()))
        self.counts["biomarker_results"] += 1


# geometry helpers
def point(x, y):
    return {"kind": "point", "x": x, "y": y}


def rect(x, y, w, h):
    return {"kind": "rectangle", "x": x, "y": y, "width": w, "height": h}


def build(s: Seeder) -> None:
    # ============================================================= Study 1 (main)
    s1 = s.study(
        "SOD1-G93A Longitudinal Progression Cohort", "SOD1-G93A", "active",
        "Longitudinal progression study of the SOD1-G93A model with weekly weight + "
        "hindlimb scoring, MRI at baseline/week4/week8/week12, endpoint histopathology, "
        "and serum/CSF biomarker panels.")
    s.protocol(s1, "SOD1-G93A survival protocol", [
        ("Confirm SOD1 genotype", "gene_confirmation", 0, "PCR genotyping"),
        ("Baseline behavioural assessment", "behavioral_assessment", 7, None),
        ("Baseline brain MRI", "mri", 14, "T2, brain"),
        ("Weekly weight + hindlimb score", "behavioral_assessment", 21, None),
        ("Follow-up MRI (week 8)", "mri", 70, None),
        ("Biochemical analysis (NfL/GFAP)", "biochemical_analysis", 77, "Serum + CSF"),
        ("Endpoint histopathology", "histopathology", 90, "Lumbar spinal cord"),
    ])

    # Cohort: SOD1-G93A (treated/untreated) + wild-type controls, mixed sex/age.
    m101 = s.animal(s1, "M-101", "female", d(-150), "SOD1-G93A", "Vehicle")
    m102 = s.animal(s1, "M-102", "male", d(-148), "SOD1-G93A", "Riluzole")
    m103 = s.animal(s1, "M-103", "male", d(-152), "SOD1-G93A", "Edaravone")
    m104 = s.animal(s1, "M-104", "female", d(-150), "SOD1-G93A", "Vehicle")
    m105 = s.animal(s1, "M-105", "female", d(-149), "Wild Type", "Control")
    m106 = s.animal(s1, "M-106", "male", d(-151), "Wild Type", "Control")

    # Longitudinal weights (declining for SOD1, stable for WT) + multi-scale motor tests.
    sod1_weights = [25.1, 24.8, 24.6, 24.0, 23.4, 22.7, 21.9, 21.0, 20.2, 19.6, 19.1, 18.7, 18.4]
    for i, w in enumerate(sod1_weights):
        s.observation(m101, d(-84 + i * 7), "body_weight", w, notes=("Baseline" if i == 0 else None))
    for i, sc in enumerate([5, 5, 4, 4, 3, 3, 2]):
        s.observation(m101, d(-84 + i * 14), "motor_score", sc, scale="Hindlimb 0-5",
                      notes=("Symptom onset (tremor, splay)" if sc == 4 and i == 2 else None))
    for i, lat in enumerate([210, 190, 150, 95, 60]):
        s.observation(m101, d(-84 + i * 21), "motor_score", lat, scale="Rotarod latency (s)")
    for i, g in enumerate([98, 90, 74, 58, 40]):
        s.observation(m101, d(-84 + i * 21), "motor_score", g, scale="Grip strength (g)")
    # WT control stays healthy.
    for i, w in enumerate([25.6, 25.5, 25.7, 25.4, 25.6, 25.8, 25.7]):
        s.observation(m105, d(-84 + i * 14), "body_weight", w)
        s.observation(m105, d(-84 + i * 14), "motor_score", 5, scale="Hindlimb 0-5")
    for a, base in [(m102, 24.3), (m103, 24.9), (m104, 24.6), (m106, 25.9)]:
        for i, dw in enumerate([0.0, -0.8, -1.7, -2.5]):
            s.observation(a, d(-42 + i * 14), "body_weight", round(base + dw, 1))
        s.observation(a, d(0), "motor_score", 4, scale="Hindlimb 0-5", notes="Routine check")

    # M-101: full completed history + today's-work + upcoming, with MRI + histology + biomarkers.
    s.event(m101, "Confirm SOD1 genotype", "gene_confirmation", "completed", completed=d(-126), notes="Positive")
    s.event(m101, "Baseline behavioural assessment", "behavioral_assessment", "completed", completed=d(-118))
    e_mri_bl = s.event(m101, "Baseline brain MRI", "mri", "completed", completed=d(-112))
    e_mri_w8 = s.event(m101, "Follow-up brain MRI (week 8)", "mri", "completed", completed=d(-2))
    s.event(m101, "Neurological examination", "neurological_examination", "completed", completed=d(-3),
            notes="Mild hindlimb weakness")
    e_bio = s.event(m101, "Biochemical analysis (NfL/GFAP)", "biochemical_analysis", "completed", completed=d(-1))
    e_histo = s.event(m101, "Endpoint histopathology", "histopathology", "completed", completed=d(-1))
    s.event(m101, "Weekly behavioural assessment", "behavioral_assessment", "planned", planned=d(0))
    s.event(m101, "Repeat biochemical panel", "biochemical_analysis", "planned", planned=d(-4), notes="Overdue")

    # MRI baseline + week 8 (annotated + linked for progression).
    ses_bl = s.mri_session(e_mri_bl, "Baseline brain MRI", "Brain", d(-112), "Dr. Chen", "T2-weighted, 9.4T")
    _, f_bl = s.asset("mri_session", ses_bl, "mri_image", "Brain MRI — baseline (T2)",
                      image_file="mri-brain-baseline.png")
    a_bl = s.annotation(f_bl, rect(0.42, 0.34, 0.16, 0.14), "Ventricle ROI", "Baseline ventricle size")
    a_bl_pt = s.annotation(f_bl, point(0.5, 0.55), "Midline reference")
    s.asset("mri_session", ses_bl, "pdf", "Study protocol (SAMPLE)", image_file="study-protocol.pdf")
    s.asset("mri_session", ses_bl, "other", "Body-weight curve (SAMPLE)", image_file="graph-bodyweight.png")

    ses_w8 = s.mri_session(e_mri_w8, "Follow-up brain MRI (week 8)", "Brain", d(-2), "Dr. Chen", "T2-weighted, 9.4T")
    _, f_w8 = s.asset("mri_session", ses_w8, "mri_image", "Brain MRI — week 8 (T2)",
                      image_file="mri-brain-week8.png")
    a_w8 = s.annotation(f_w8, rect(0.40, 0.32, 0.20, 0.18), "Ventricle ROI", "Enlarged vs baseline")
    # Longitudinal link: same structure across sessions.
    s.link(a_bl, a_w8, "follow_up", "Ventricle enlargement over 8 weeks")

    # Endpoint histology (all four stains) + microscopy, some annotated.
    h_he = s.histology_session(e_histo, "he", "Lumbar spinal cord", d(-1), "Sam Ortiz", magnification="20×")
    _, fh_he = s.asset("histology_session", h_he, "histology_image", "Spinal cord — H&E",
                       image_file="histo-he-spinalcord.jpg")
    s.annotation(fh_he, rect(0.30, 0.30, 0.18, 0.16), "Ventral horn", "Motor neuron loss")
    h_gfap = s.histology_session(e_histo, "gfap", "Motor cortex", d(-1), "Sam Ortiz", magnification="40×")
    _, fh_gfap = s.asset("histology_session", h_gfap, "histology_image", "Motor cortex — GFAP",
                         image_file="histo-gfap-cortex.png")
    s.annotation(fh_gfap, point(0.55, 0.45), "Reactive astrocytes")
    h_iba1 = s.histology_session(e_histo, "iba1", "Lumbar spinal cord", d(-1), "Sam Ortiz", magnification="40×")
    s.asset("histology_session", h_iba1, "histology_image", "Spinal cord — Iba1",
            image_file="histo-iba1-spinalcord.jpg")
    s.asset("histology_session", h_iba1, "document", "Histopathology report (SAMPLE)",
            image_file="histology-report.pdf")
    h_lfb = s.histology_session(e_histo, "luxol_fast_blue", "White matter", d(-1), "Sam Ortiz")
    s.asset("histology_session", h_lfb, "histology_image", "White matter — Luxol Fast Blue",
            image_file="histo-luxol-whitematter.png")
    s.asset("histology_session", h_lfb, "microscopy_image", "Motor neurons — microscopy",
            image_file="microscopy-motor-neurons.jpg")

    # Biomarker panels (serum, CSF, tissue) with realistic multi-analyte results.
    bs_serum = s.biomarker_sample(e_bio, "blood", d(-1), "Dr. Chen", "Serum, terminal bleed")
    s.biomarker_result(bs_serum, "Neurofilament Light (NfL)", "128", "pg/mL", "Simoa", "Elevated vs WT")
    s.biomarker_result(bs_serum, "GFAP", "342", "pg/mL", "Simoa")
    s.biomarker_result(bs_serum, "IL-6", "18.4", "pg/mL", "ELISA")
    s.biomarker_result(bs_serum, "TNF-α", "12.1", "pg/mL", "ELISA")
    s.biomarker_result(bs_serum, "BDNF", "< 0.5", "ng/mL", "ELISA", "Below LOD")
    bs_csf = s.biomarker_sample(e_bio, "csf", d(-1), "Dr. Chen", "CSF, cisterna magna")
    s.biomarker_result(bs_csf, "Neurofilament Light (NfL)", "2450", "pg/mL", "Simoa")
    s.biomarker_result(bs_csf, "pNF-H", "1890", "pg/mL", "ELISA")
    s.biomarker_result(bs_csf, "S100B", "0.42", "µg/L", "ELISA")
    bs_cord = s.biomarker_sample(e_bio, "spinal_cord", d(-1), "Sam Ortiz", "Lumbar homogenate")
    s.biomarker_result(bs_cord, "TDP-43", "not detected", None, "Western blot", "No cytoplasmic aggregates")
    s.biomarker_result(bs_cord, "Oxidative Stress (4-HNE)", "2.3", "fold vs WT", "Western blot")

    # M-102 (riluzole) — a shorter arm with an MRI + biomarker.
    e_mri_102 = s.event(m102, "Baseline brain MRI", "mri", "completed", completed=d(-90))
    ses_102 = s.mri_session(e_mri_102, "Baseline brain MRI", "Brain", d(-90), "Sam Ortiz")
    s.asset("mri_session", ses_102, "mri_image", "Brain MRI — week 12 (T2)", image_file="mri-brain-week12.jpg")
    e_bio_102 = s.event(m102, "Biochemical analysis", "biochemical_analysis", "completed", completed=d(-30))
    bs_102 = s.biomarker_sample(e_bio_102, "blood", d(-30), "Dr. Chen", "Serum")
    s.biomarker_result(bs_102, "Neurofilament Light (NfL)", "74", "pg/mL", "Simoa", "Lower under riluzole")
    s.biomarker_result(bs_102, "GFAP", "210", "pg/mL", "Simoa")
    s.event(m102, "Endpoint histopathology", "histopathology", "planned", planned=d(-8), notes="Overdue")

    # M-103: high-resolution TIFF MRI (stored but not viewable in-app).
    e_mri_103 = s.event(m103, "Baseline brain MRI", "mri", "completed", completed=d(-60))
    ses_103 = s.mri_session(e_mri_103, "Baseline brain MRI (high-res)", "Brain", d(-60), "Dr. Chen",
                            "High-resolution TIFF acquisition")
    s.asset("mri_session", ses_103, "mri_image", "Brain MRI — high resolution (TIFF)",
            image_file="mri-brain-highres.tif")
    s.asset("mri_session", ses_103, "other", "Raw k-space export", status="planned")
    # M-104: spinal cord MRI.
    e_mri_104 = s.event(m104, "Spinal cord MRI", "mri", "completed", completed=d(-40))
    ses_104 = s.mri_session(e_mri_104, "Lumbar spinal cord MRI", "Lumbar spinal cord", d(-40), "Sam Ortiz")
    _, f104 = s.asset("mri_session", ses_104, "mri_image", "Spinal cord MRI (T2)", image_file="mri-spinalcord.png")
    s.annotation(f104, point(0.5, 0.5), "Cord cross-section")
    # WT controls: planned upcoming work.
    s.event(m105, "Baseline brain MRI", "mri", "planned", planned=d(5))
    s.event(m106, "Weekly behavioural assessment", "behavioral_assessment", "planned", planned=d(2))

    # Two more fully-populated example animals (weights + multi-scale motor tests +
    # MRI session with an attached image + a serum biomarker panel).
    m107 = s.animal(s1, "M-107", "male", d(-147), "SOD1-G93A", "Riluzole")
    m108 = s.animal(s1, "M-108", "female", d(-149), "Wild Type", "Control")
    for i, w in enumerate([24.9, 24.5, 23.9, 23.1, 22.4, 21.8]):
        s.observation(m107, d(-70 + i * 14), "body_weight", w,
                      notes=("Baseline" if i == 0 else None))
    for i, sc in enumerate([5, 5, 4, 3]):
        s.observation(m107, d(-70 + i * 21), "motor_score", sc, scale="Hindlimb 0-5")
    for i, g in enumerate([96, 88, 70, 55]):
        s.observation(m107, d(-70 + i * 21), "motor_score", g, scale="Grip strength (g)")
    for i, w in enumerate([25.4, 25.6, 25.5, 25.7]):
        s.observation(m108, d(-70 + i * 21), "body_weight", w)
        s.observation(m108, d(-70 + i * 21), "motor_score", 5, scale="Hindlimb 0-5")

    e_mri_107 = s.event(m107, "Baseline brain MRI", "mri", "completed", completed=d(-70))
    ses_107 = s.mri_session(e_mri_107, "Baseline brain MRI", "Brain", d(-70), "Dr. Chen", "T2-weighted")
    _, f107 = s.asset("mri_session", ses_107, "mri_image", "Brain MRI — week 4 (T2)",
                      image_file="mri-brain-week4.jpg")
    s.annotation(f107, point(0.48, 0.5), "Cortex reference")
    e_bio_107 = s.event(m107, "Biochemical analysis", "biochemical_analysis", "completed", completed=d(-14))
    bs_107 = s.biomarker_sample(e_bio_107, "blood", d(-14), "Sam Ortiz", "Serum")
    s.biomarker_result(bs_107, "Neurofilament Light (NfL)", "88", "pg/mL", "Simoa")
    s.biomarker_result(bs_107, "IL-6", "9.7", "pg/mL", "ELISA")
    s.event(m108, "Baseline behavioural assessment", "behavioral_assessment", "planned", planned=d(4))

    # ===================================================== Study 2 (exercise trial)
    s2 = s.study(
        "Voluntary Wheel-Running Exercise Trial (SOD1-G93A)", "SOD1-G93A", "active",
        "Voluntary-wheel exercise vs sedentary in SOD1-G93A, tracking rotarod, grip "
        "strength, and serum NfL.")
    ex = []
    for i in range(4):
        grp = "Exercise" if i % 2 == 0 else "Sedentary"
        sex = "female" if i % 2 == 0 else "male"
        a = s.animal(s2, f"E-2{i:02d}", sex, d(-120 + i), "SOD1-G93A", grp)
        ex.append(a)
        for w_i, w in enumerate([24.0, 23.6, 23.0, 22.5]):
            s.observation(a, d(-42 + w_i * 14), "body_weight", round(w + (0.4 if grp == "Exercise" else -0.4), 1))
        s.observation(a, d(0), "motor_score", 180 if grp == "Exercise" else 120, scale="Rotarod latency (s)",
                      notes=("Better endurance" if grp == "Exercise" else None))
    e_ex_bio = s.event(ex[0], "Biochemical analysis", "biochemical_analysis", "completed", completed=d(-7))
    bs_ex = s.biomarker_sample(e_ex_bio, "blood", d(-7), "Sam Ortiz", "Serum")
    s.biomarker_result(bs_ex, "Neurofilament Light (NfL)", "61", "pg/mL", "Simoa")
    s.biomarker_result(bs_ex, "BDNF", "3.8", "ng/mL", "ELISA", "Higher in exercise arm")
    s.event(ex[1], "Baseline brain MRI", "mri", "planned", planned=d(3))

    # ================================================= Study 3 (biomarker validation)
    s3 = s.study(
        "Serum & CSF Biomarker Validation (SOD1-G93A vs Wild-Type)", "Mixed (SOD1-G93A, WT)", "active",
        "Cross-sectional validation of serum/CSF biomarkers against disease stage in "
        "SOD1-G93A vs wild-type controls.")
    for i in range(4):
        mut = "SOD1-G93A" if i < 3 else "Wild Type"
        grp = "Control" if mut == "Wild Type" else ("Early" if i == 0 else "Late")
        a = s.animal(s3, f"B-3{i:02d}", "female" if i % 2 else "male", d(-160 + i * 3), mut, grp)
        e = s.event(a, "Biochemical analysis", "biochemical_analysis", "completed", completed=d(-20 + i))
        stype = ["blood", "csf", "brain_tissue", "blood"][i]
        bs = s.biomarker_sample(e, stype, d(-20 + i), "Dr. Chen")
        nfl = {"Control": "9", "Early": "40", "Late": "150"}[grp]
        s.biomarker_result(bs, "Neurofilament Light (NfL)", nfl, "pg/mL", "Simoa", f"{grp} stage")
        s.biomarker_result(bs, "GFAP", {"Control": "45", "Early": "180", "Late": "360"}[grp], "pg/mL", "Simoa")

    # ===================================================== Study 4 (archived pilot)
    s4 = s.study(
        "TDP-43 (Q331K) Cytoplasmic Aggregation Pilot", "TDP-43 (Q331K)", "archived",
        "Small archived pilot in a TDP-43 (Q331K) model — kept read-only for reference.")
    t401 = s.animal(s4, "T-401", "female", d(-90), "TDP-43 (Q331K)", "Vehicle")
    t402 = s.animal(s4, "T-402", "male", d(-92), "TDP-43 (Q331K)", "Vehicle")
    for i, w in enumerate([23.8, 23.4, 22.9, 22.6]):
        s.observation(t401, d(-56 + i * 14), "body_weight", w)
    e_t401 = s.event(t401, "Endpoint histopathology", "histopathology", "completed", completed=d(-30))
    h_t401 = s.histology_session(e_t401, "he", "Motor cortex", d(-30), "Sam Ortiz", magnification="20×")
    s.asset("histology_session", h_t401, "histology_image", "Motor cortex — H&E",
            image_file="histo-nissl-motorcortex.jpg")

    # ============================================== Study 5 (Tofersen SOD1 ASO trial)
    # Tofersen (Qalsody) is a real antisense oligonucleotide lowering SOD1; modelled
    # here as intrathecal ASO vs vehicle in SOD1-G93A, tracked by serum/CSF NfL.
    s5 = s.study(
        "Tofersen (SOD1 Antisense Oligonucleotide) Efficacy Study", "SOD1-G93A", "active",
        "Intrathecal antisense oligonucleotide (SOD1-lowering) vs vehicle in SOD1-G93A, "
        "with monthly serum/CSF neurofilament, motor scoring, and follow-up MRI.")
    s.protocol(s5, "ASO dosing & monitoring protocol", [
        ("Confirm SOD1 genotype", "gene_confirmation", 0, "PCR genotyping"),
        ("Baseline CSF neurofilament", "biochemical_analysis", 7, "Pre-dose CSF NfL"),
        ("Intrathecal ASO / vehicle dose 1", "custom", 14, "Lumbar puncture"),
        ("Monthly motor + weight assessment", "behavioral_assessment", 28, None),
        ("Follow-up brain MRI", "mri", 56, "T2, brain"),
        ("Terminal CSF/serum panel", "biochemical_analysis", 84, "NfL / GFAP / pNF-H"),
    ])
    aso_animals = []
    for i in range(6):
        grp = "Tofersen ASO" if i % 2 == 0 else "Vehicle (scrambled ASO)"
        sex = "male" if i % 2 else "female"
        a = s.animal(s5, f"A-5{i:02d}", sex, d(-140 + i), "SOD1-G93A", grp)
        aso_animals.append((a, grp))
        # ASO arm declines more slowly than vehicle.
        drop = [0.0, -0.4, -0.9, -1.4, -1.9] if "Tofersen" in grp else [0.0, -0.9, -2.0, -3.1, -4.0]
        base = 24.6
        for w_i, dw in enumerate(drop):
            s.observation(a, d(-70 + w_i * 14), "body_weight", round(base + dw, 1),
                          notes=("Baseline" if w_i == 0 else None))
        for w_i, sc in enumerate([5, 5, 4, 4] if "Tofersen" in grp else [5, 4, 3, 2]):
            s.observation(a, d(-70 + w_i * 21), "motor_score", sc, scale="Hindlimb 0-5")
    # Dose event + treatment-administration timeline + CSF panels showing NfL lowering.
    aso_lead, aso_lead_grp = aso_animals[0]
    e_dose = s.event(aso_lead, "Intrathecal ASO dose 1", "custom", "completed",
                     completed=d(-56), notes="10 µg intrathecal, lumbar")
    e_aso_pre = s.event(aso_lead, "Pre-dose CSF neurofilament", "biochemical_analysis", "completed",
                        completed=d(-63))
    bs_pre = s.biomarker_sample(e_aso_pre, "csf", d(-63), "Dr. Chen", "Pre-dose CSF")
    s.biomarker_result(bs_pre, "Neurofilament Light (NfL)", "2380", "pg/mL", "Simoa", "Baseline")
    e_aso_post = s.event(aso_lead, "Terminal CSF/serum panel", "biochemical_analysis", "completed",
                         completed=d(-3))
    bs_post = s.biomarker_sample(e_aso_post, "csf", d(-3), "Dr. Chen", "Post-treatment CSF")
    s.biomarker_result(bs_post, "Neurofilament Light (NfL)", "1120", "pg/mL", "Simoa", "≈53% reduction under ASO")
    s.biomarker_result(bs_post, "GFAP", "205", "pg/mL", "Simoa")
    bs_post_serum = s.biomarker_sample(e_aso_post, "blood", d(-3), "Dr. Chen", "Serum")
    s.biomarker_result(bs_post_serum, "Neurofilament Light (NfL)", "58", "pg/mL", "Simoa")
    s.biomarker_result(bs_post_serum, "SOD1 protein", "0.34", "fold vs vehicle", "ELISA", "Target engagement")
    e_aso_mri = s.event(aso_lead, "Follow-up brain MRI", "mri", "completed", completed=d(-14))
    ses_aso = s.mri_session(e_aso_mri, "Follow-up brain MRI", "Brain", d(-14), "Dr. Chen", "T2-weighted, 9.4T")
    _, f_aso = s.asset("mri_session", ses_aso, "mri_image", "Brain MRI — post-ASO (T2)",
                       image_file="mri-brain-week8.png")
    s.annotation(f_aso, rect(0.41, 0.33, 0.17, 0.15), "Ventricle ROI", "Stable vs baseline under ASO")
    s.asset("mri_session", ses_aso, "other", "Serum NfL by group (SAMPLE)", image_file="graph-nfl.png")
    # Vehicle arm: overdue endpoint (drives the "attention needed" surfaces).
    s.event(aso_animals[1][0], "Endpoint histopathology", "histopathology", "planned",
            planned=d(-5), notes="Overdue")

    # ============================================ Study 6 (C9orf72 natural history)
    # C9orf72 repeat expansion is the most common genetic cause of ALS/FTD.
    s6 = s.study(
        "C9orf72 Repeat-Expansion Natural History", "C9orf72 (BAC transgenic)", "active",
        "Observational natural-history cohort of a C9orf72 repeat-expansion model — "
        "baseline characterisation, behavioural tracking, and planned imaging/biomarker work.")
    s.protocol(s6, "Natural-history observation protocol", [
        ("Confirm C9orf72 repeat expansion", "gene_confirmation", 0, "Repeat-primed PCR"),
        ("Baseline behavioural assessment", "behavioral_assessment", 7, None),
        ("Baseline brain MRI", "mri", 14, None),
        ("Quarterly behavioural assessment", "behavioral_assessment", 90, None),
    ])
    c9_animals = []
    for i in range(5):
        mut = "C9orf72 (BAC)" if i < 4 else "Wild Type"
        grp = "Control" if mut == "Wild Type" else "Observational"
        a = s.animal(s6, f"C-6{i:02d}", "female" if i % 2 else "male", d(-200 + i * 2), mut, grp)
        c9_animals.append(a)
        for w_i, w in enumerate([26.0, 25.7, 25.5, 25.2]):
            s.observation(a, d(-84 + w_i * 21), "body_weight", round(w - (0.3 * i if mut != "Wild Type" else 0), 1))
        s.observation(a, d(0), "motor_score", 5, scale="Hindlimb 0-5", notes="No deficit at baseline")
    c9_lead = c9_animals[0]
    s.event(c9_lead, "Confirm C9orf72 repeat expansion", "gene_confirmation", "completed",
            completed=d(-180), notes="Expansion confirmed (repeat-primed PCR)")
    e_c9_mri = s.event(c9_lead, "Baseline brain MRI", "mri", "completed", completed=d(-120))
    ses_c9 = s.mri_session(e_c9_mri, "Baseline brain MRI", "Brain", d(-120), "Sam Ortiz", "T2-weighted")
    _, f_c9 = s.asset("mri_session", ses_c9, "mri_image", "Brain MRI — baseline (T2)",
                      image_file="mri-brain-week4.jpg")
    s.annotation(f_c9, point(0.5, 0.48), "Cortex reference")
    s.event(c9_lead, "Quarterly behavioural assessment", "behavioral_assessment", "planned", planned=d(7))
    s.event(c9_animals[1], "Baseline brain MRI", "mri", "planned", planned=d(10))


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
        tables = {r[0] for r in con.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        required = ("studies", "animals", "timeline_events", "mri_sessions", "histology_sessions",
                    "research_assets", "stored_files", "annotations", "annotation_links",
                    "biomarker_samples", "biomarker_results")
        missing = [t for t in required if t not in tables]
        if missing:
            raise SystemExit(f"\nERROR: tables missing {missing} — is this the app database, "
                             "launched so migrations v1–v13 applied?")

        removed = clear_samples(con, args.images_dir)
        if args.clear:
            print("\nCleared SAMPLE data:")
            for k, v in removed.items():
                print(f"  {k:18}: {v}")
            con.close()
            return
        if removed["studies"]:
            print(f"(Replaced existing SAMPLE data: {removed['studies']} studies removed first.)")

        manifest_path = SAMPLE / "manifest.json"
        manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else {"images": []}
        if not manifest_path.exists():
            print("(No sample-data/manifest.json — seeding metadata only, without images. "
                  "Run scripts/make-sample-media.py first for images.)")

        seeder = Seeder(con, args.images_dir, manifest)
        build(seeder)
        con.commit()
        con.close()

        # Record the seeded study ids so --clear can remove EXACTLY this data later
        # (the study names are believable and unprefixed, so we track them by id).
        SEEDED_IDS.parent.mkdir(parents=True, exist_ok=True)
        SEEDED_IDS.write_text(
            json.dumps({"study_ids": seeder.study_ids,
                        "seeded_at": NOW.isoformat()}, indent=2),
            encoding="utf-8")

        print("\nSeeded sample data:")
        for k in seeder.counts:
            print(f"  {k:18}: {seeder.counts[k]}")
        print("\nDone. Open the app to explore the Dashboard, Studies, timelines, MRI + "
              "histology sessions, biomarker panels, annotations, comparison, and export.")
        print("Remove it any time with:  python scripts/seed-sample-data.py --clear")
    except sqlite3.OperationalError as e:
        if "locked" in str(e).lower():
            raise SystemExit("\nERROR: the database is locked. CLOSE the app, then run again.")
        raise


if __name__ == "__main__":
    main()
