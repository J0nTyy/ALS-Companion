"""
Generate the SAMPLE media set for the ALS Research Companion demonstration dataset.

WHAT IT PRODUCES (all ANIMAL / laboratory imagery — never human clinical data):
  - Rodent/animal brain MRI-style images (PNG/JPEG + one TIFF for the "stored but
    not viewable" path).
  - Histology slides tagged by stain (H&E, GFAP, Iba1, Luxol Fast Blue, Nissl).
  - Microscopy (motor-neuron) images.
  - Locally-generated study GRAPHS (body-weight curve, motor score, biomarker bar).
  - Locally-generated PDF documents (protocols / reports) and a CSV.

Real images are downloaded from Wikimedia Commons (freely-licensed) with an explicit
HUMAN-content filter, biased toward mouse/rat/rodent sources; if a search yields no
suitable animal candidate (or there is no network), a clearly-labelled synthetic
placeholder is generated instead, so the media set ALWAYS completes. Every item is
captioned "SAMPLE" and is illustrative test data — not an actual transgenic-mouse scan.

Output: `sample-data/{images,docs}` + `manifest.json` (consumed by seed-sample-data.py)
and `SOURCES.md` (provenance + licenses).

Run:  python scripts/make-sample-media.py
"""

from __future__ import annotations
import io
import json
import math
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "sample-data"
IMAGES = OUT / "images"
DOCS = OUT / "docs"
API = "https://commons.wikimedia.org/w/api.php"
UA = "ALS-Research-Companion-sample-data/2.0 (local developer test dataset; animal imagery only)"

# Tokens that mark a candidate as human/clinical — excluded (this is an ANIMAL dataset).
# "glioma"/"tumor" et al. are here because generic "brain MRI" hits are overwhelmingly
# human clinical scans that don't literally say "human".
HUMAN_TOKENS = ("human", "patient", "homo sapiens", "clinical", "glioma", "tumor",
                "tumour", "man ", "woman", "child", "adult ", "years old")
# Tokens that positively confirm an ANIMAL model. A candidate MUST contain one of
# these to be downloaded — anything not clearly animal falls back to a generated
# placeholder, so no human imagery can ever slip in.
ANIMAL_TOKENS = ("mouse", "mice", "murine", "mus musculus", "rat", "rodent", "wistar",
                 "sprague", "c57", "bl/6", "bl6", "transgenic mouse", "animal", "zebrafish",
                 "porcine", "canine", "primate", "macaque")

# Desired outputs: (filename, format, [search queries], role, extra fields, caption, title).
# role drives how the seeder attaches it; `stain`/`tissue`/`region` are optional hints.
PLAN = [
    # --- MRI (rodent brain) -------------------------------------------------
    dict(file="mri-brain-baseline.png", fmt="PNG", role="mri", region="Brain",
         q=["mouse brain MRI", "rodent brain MRI", "small animal MRI", "mouse brain"],
         cap="SAMPLE · Rodent brain · Baseline", title="Brain MRI — baseline (T2)"),
    dict(file="mri-brain-week4.jpg", fmt="JPEG", role="mri", region="Brain",
         q=["mouse brain MRI", "rodent brain MRI", "mouse brain"],
         cap="SAMPLE · Rodent brain · Week 4", title="Brain MRI — week 4 (T2)"),
    dict(file="mri-brain-week8.png", fmt="PNG", role="mri", region="Brain",
         q=["mouse brain MRI", "rodent brain MRI", "mouse brain"],
         cap="SAMPLE · Rodent brain · Week 8", title="Brain MRI — week 8 (T2)"),
    dict(file="mri-brain-week12.jpg", fmt="JPEG", role="mri", region="Brain",
         q=["mouse brain MRI", "rodent brain MRI", "mouse brain"],
         cap="SAMPLE · Rodent brain · Week 12", title="Brain MRI — week 12 (T2)"),
    dict(file="mri-spinalcord.png", fmt="PNG", role="mri", region="Lumbar spinal cord",
         q=["mouse spinal cord MRI", "rodent spinal cord", "spinal cord mouse"],
         cap="SAMPLE · Spinal cord", title="Spinal cord MRI (T2)"),
    dict(file="mri-brain-highres.tif", fmt="TIFF", role="mri", region="Brain",
         q=["mouse brain MRI", "rodent brain MRI", "mouse brain"],
         cap="SAMPLE · Rodent brain · high-res (TIFF)", title="Brain MRI — high resolution (TIFF)"),
    # --- Histology (rodent), tagged by stain --------------------------------
    dict(file="histo-he-spinalcord.jpg", fmt="JPEG", role="histology", stain="he",
         tissue="Lumbar spinal cord",
         q=["mouse spinal cord histology", "rodent spinal cord section", "mouse brain histology"],
         cap="SAMPLE · H&E", title="Spinal cord — H&E"),
    dict(file="histo-gfap-cortex.png", fmt="PNG", role="histology", stain="gfap",
         tissue="Motor cortex",
         q=["GFAP immunohistochemistry mouse", "GFAP astrocyte brain", "astrocyte immunostaining"],
         cap="SAMPLE · GFAP", title="Motor cortex — GFAP (astrocytes)"),
    dict(file="histo-iba1-spinalcord.jpg", fmt="JPEG", role="histology", stain="iba1",
         tissue="Lumbar spinal cord",
         q=["Iba1 microglia", "microglia immunohistochemistry mouse", "microglia brain"],
         cap="SAMPLE · Iba1", title="Spinal cord — Iba1 (microglia)"),
    dict(file="histo-luxol-whitematter.png", fmt="PNG", role="histology", stain="luxol_fast_blue",
         tissue="White matter",
         q=["Luxol fast blue myelin", "myelin staining mouse", "myelin histology"],
         cap="SAMPLE · Luxol Fast Blue", title="White matter — Luxol Fast Blue (myelin)"),
    dict(file="histo-nissl-motorcortex.jpg", fmt="JPEG", role="histology", stain="nissl",
         tissue="Motor cortex",
         q=["Nissl staining brain mouse", "Nissl stain cortex", "Nissl neuron"],
         cap="SAMPLE · Nissl", title="Motor cortex — Nissl"),
    # --- Microscopy ---------------------------------------------------------
    dict(file="microscopy-motor-neurons.jpg", fmt="JPEG", role="microscopy",
         tissue="Ventral horn",
         q=["motor neuron mouse", "spinal cord neuron microscopy", "neuron fluorescence microscopy"],
         cap="SAMPLE · Microscopy", title="Motor neurons — microscopy"),
]


def fetch_candidates(search: str, limit: int = 15):
    params = {
        "action": "query", "format": "json", "generator": "search",
        "gsrsearch": search, "gsrnamespace": "6", "gsrlimit": str(limit),
        "prop": "imageinfo", "iiprop": "url|extmetadata|mime|size",
        "iiurlwidth": "1024",
    }
    url = API + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    data = json.load(urllib.request.urlopen(req, timeout=60))
    out = []
    for page in data.get("query", {}).get("pages", {}).values():
        ii = (page.get("imageinfo") or [{}])[0]
        if ii.get("mime", "") not in ("image/jpeg", "image/png"):
            continue
        title = (page.get("title") or "")
        meta = ii.get("extmetadata", {})
        haystack = " ".join([
            title.lower(),
            _strip_html(meta.get("ImageDescription", {}).get("value", "")).lower(),
            _strip_html(meta.get("Categories", {}).get("value", "")).lower(),
        ])
        if any(tok in haystack for tok in HUMAN_TOKENS):
            continue  # never include human/clinical imagery
        out.append({
            "title": title,
            "url": ii.get("thumburl") or ii.get("url"),
            "descurl": ii.get("descriptionurl"),
            "mime": ii.get("mime"),
            "license": _strip_html(meta.get("LicenseShortName", {}).get("value", "see source")),
            "author": _strip_html(meta.get("Artist", {}).get("value", "Wikimedia Commons")),
            "animal": any(tok in haystack for tok in ANIMAL_TOKENS),
        })
    # Prefer explicitly-animal candidates.
    out.sort(key=lambda c: 0 if c["animal"] else 1)
    return out


def _strip_html(value: str) -> str:
    return re.sub(r"<[^>]+>", "", value or "").strip()[:160]


def download(url: str, retries: int = 4) -> bytes:
    for attempt in range(retries):
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        try:
            return urllib.request.urlopen(req, timeout=90).read()
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < retries - 1:
                time.sleep(5 * (attempt + 1))
                continue
            raise
    raise RuntimeError("unreachable")


def _font(size: int):
    for name in ("arial.ttf", "DejaVuSans.ttf", "LiberationSans-Regular.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except Exception:
            continue
    return ImageFont.load_default()


def caption(img: Image.Image, text: str) -> Image.Image:
    img = img.convert("RGB")
    w, h = img.size
    draw = ImageDraw.Draw(img, "RGBA")
    bar_h = max(28, h // 16)
    draw.rectangle([0, h - bar_h, w, h], fill=(0, 0, 0, 150))
    draw.text((10, h - bar_h + bar_h // 4), text, fill=(255, 255, 255), font=_font(max(14, bar_h // 2)))
    return img


def synthetic(role: str, cap: str) -> Image.Image:
    """A clearly-labelled placeholder when no suitable animal image is available."""
    w = h = 768
    base = {"mri": (18, 20, 28), "histology": (60, 30, 55),
            "microscopy": (10, 30, 40)}.get(role, (30, 30, 30))
    img = Image.new("RGB", (w, h), base)
    draw = ImageDraw.Draw(img)
    # A soft radial-ish blob so the viewer/zoom has something to look at.
    cx, cy = w // 2, h // 2
    for r in range(min(w, h) // 2, 0, -6):
        t = 1 - r / (min(w, h) / 2)
        col = tuple(min(255, int(b + t * 150)) for b in base)
        draw.ellipse([cx - r, cy - int(r * 0.8), cx + r, cy + int(r * 0.8)], fill=col)
    draw.text((20, 20), "SAMPLE (generated placeholder)", fill=(255, 255, 255), font=_font(22))
    return caption(img, cap)


def make_image(spec: dict, used: set[str]) -> dict:
    filename, fmt, role = spec["file"], spec["fmt"], spec["role"]
    chosen = None
    for query in spec["q"]:
        try:
            for cand in fetch_candidates(query):
                # STRICT animal-only: only download candidates that positively name an
                # animal model. Everything else falls through to a synthetic placeholder,
                # so human/clinical imagery can never enter the dataset.
                if cand["url"] and cand["animal"] and cand["url"] not in used:
                    chosen = cand
                    break
        except Exception as e:  # network / API hiccup — fall through to synthetic
            print(f"    ({query!r} lookup failed: {type(e).__name__})")
        if chosen:
            break

    provenance = {}
    if chosen:
        try:
            raw = download(chosen["url"])
            time.sleep(1.5)  # polite to Wikimedia
            img = Image.open(io.BytesIO(raw))
            img.thumbnail((1024, 1024))
            img = caption(img, spec["cap"])
            used.add(chosen["url"])
            provenance = {"source": chosen["descurl"], "license": chosen["license"],
                          "author": chosen["author"], "title": chosen["title"]}
            print(f"  wrote {filename}  <- {chosen['title']}")
        except Exception as e:
            print(f"    download failed ({type(e).__name__}); using placeholder for {filename}")
            chosen = None
    if not chosen:
        img = synthetic(role, spec["cap"])
        provenance = {"source": "generated locally (no suitable animal candidate)",
                      "license": "CC0 (generated)", "author": "ALS Research Companion", "title": "generated"}
        print(f"  wrote {filename}  <- generated placeholder")

    dest = IMAGES / filename
    save_kwargs = {"quality": 88} if fmt == "JPEG" else {}
    img.save(dest, format=fmt, **save_kwargs)
    mime = {"JPEG": "image/jpeg", "PNG": "image/png", "TIFF": "image/tiff"}[fmt]
    entry = {"file": filename, "mime": mime, "role": role, "title": spec["title"],
             "viewable": fmt in ("JPEG", "PNG")}
    for k in ("stain", "tissue", "region"):
        if spec.get(k):
            entry[k] = spec[k]
    return {"entry": entry, "provenance": provenance}


# --------------------------------------------------------------- generated graphs
def make_graph_bodyweight(path: Path) -> None:
    W, H = 900, 560
    img = Image.new("RGB", (W, H), "white")
    d = ImageDraw.Draw(img)
    m = 70
    d.text((m, 18), "SAMPLE — Body weight over time (SOD1-G93A vs Control)", fill=(20, 20, 20), font=_font(22))
    d.rectangle([m, 60, W - 30, H - 60], outline=(120, 120, 120))
    series = {(200, 60, 60): [25.1, 24.6, 23.4, 21.9, 20.2, 19.1, 18.4],
              (60, 120, 200): [25.6, 25.5, 25.7, 25.4, 25.6, 25.5, 25.8]}
    lo, hi = 17, 27
    n = 7
    for color, ys in series.items():
        pts = []
        for i, y in enumerate(ys):
            px = m + i * (W - 30 - m) / (n - 1)
            py = (H - 60) - (y - lo) / (hi - lo) * (H - 120)
            pts.append((px, py))
        d.line(pts, fill=color, width=4)
        for p in pts:
            d.ellipse([p[0] - 4, p[1] - 4, p[0] + 4, p[1] + 4], fill=color)
    d.text((m, H - 45), "Weeks 0–12   ·   red = SOD1-G93A, blue = Control   ·   grams", fill=(80, 80, 80), font=_font(16))
    img.save(path, "PNG")
    print(f"  wrote {path.relative_to(ROOT)}")


def make_graph_bars(path: Path, title: str, labels, values, color) -> None:
    W, H = 900, 560
    img = Image.new("RGB", (W, H), "white")
    d = ImageDraw.Draw(img)
    m = 70
    d.text((m, 18), title, fill=(20, 20, 20), font=_font(22))
    d.rectangle([m, 60, W - 30, H - 70], outline=(120, 120, 120))
    hi = max(values) * 1.2
    bw = (W - 30 - m) / (len(values) * 2)
    for i, (lab, v) in enumerate(zip(labels, values)):
        x = m + (i * 2 + 0.5) * bw
        top = (H - 70) - v / hi * (H - 140)
        d.rectangle([x, top, x + bw, H - 70], fill=color)
        d.text((x, H - 60), lab, fill=(70, 70, 70), font=_font(14))
    img.save(path, "PNG")
    print(f"  wrote {path.relative_to(ROOT)}")


def make_pdf(path: Path, title: str, lines: list[str]) -> None:
    W, H = 1240, 1754
    img = Image.new("RGB", (W, H), "white")
    d = ImageDraw.Draw(img)
    d.text((90, 110), title, fill=(20, 20, 20), font=_font(46))
    y = 210
    for line in lines:
        d.text((90, y), line, fill=(40, 40, 40), font=_font(30))
        y += 48
    img.save(path, "PDF", resolution=150.0)
    print(f"  wrote {path.relative_to(ROOT)}")


def make_csv(path: Path, rows: list[str]) -> None:
    path.write_text("\n".join(rows) + "\n", encoding="utf-8")
    print(f"  wrote {path.relative_to(ROOT)}")


def main() -> None:
    IMAGES.mkdir(parents=True, exist_ok=True)
    DOCS.mkdir(parents=True, exist_ok=True)

    used: set[str] = set()
    images, provs = [], []
    for spec in PLAN:
        result = make_image(spec, used)
        images.append(result["entry"])
        provs.append((result["entry"]["file"], result["entry"]["mime"],
                      result["entry"]["title"], result["provenance"]))

    # Generated graphs (clearly SAMPLE; no licensing concerns).
    make_graph_bodyweight(IMAGES / "graph-bodyweight.png")
    make_graph_bars(IMAGES / "graph-nfl.png", "SAMPLE — Serum NfL by group (pg/mL)",
                    ["WT", "SOD1 early", "SOD1 late"], [8, 34, 120], (200, 60, 60))
    make_graph_bars(IMAGES / "graph-motorscore.png", "SAMPLE — Hindlimb score by week",
                    ["W0", "W4", "W8", "W12"], [5, 4, 3, 2], (90, 120, 60))
    for f, t in [("graph-bodyweight.png", "Body-weight curve (SAMPLE)"),
                 ("graph-nfl.png", "Serum NfL by group (SAMPLE)"),
                 ("graph-motorscore.png", "Hindlimb motor score (SAMPLE)")]:
        images.append({"file": f, "mime": "image/png", "role": "graph", "title": t, "viewable": True})
        provs.append((f, "image/png", t, {"source": "generated locally", "license": "CC0 (generated)",
                                           "author": "ALS Research Companion", "title": "generated"}))

    # Documents.
    docs = []
    make_pdf(DOCS / "study-protocol.pdf", "SAMPLE — Study protocol",
             ["SOD1-G93A survival cohort", "1. Gene confirmation (day 0)",
              "2. Baseline behaviour + MRI (day 14)", "3. Weekly weight + hindlimb score",
              "4. Biochemical analysis — serum/CSF NfL, GFAP", "5. Endpoint histopathology",
              "", "Generated SAMPLE content — not a real protocol."])
    docs.append({"file": "study-protocol.pdf", "mime": "application/pdf", "assetType": "pdf",
                 "title": "Study protocol (SAMPLE)"})
    make_pdf(DOCS / "histology-report.pdf", "SAMPLE — Histopathology report",
             ["Lumbar spinal cord · H&E / GFAP / Iba1", "Findings: illustrative sample text only.",
              "Motor neuron counts, gliosis grading (placeholder).", "",
              "Generated SAMPLE content for testing document handling."])
    docs.append({"file": "histology-report.pdf", "mime": "application/pdf", "assetType": "document",
                 "title": "Histopathology report (SAMPLE)"})
    make_pdf(DOCS / "biomarker-report.pdf", "SAMPLE — Biomarker panel report",
             ["Serum + CSF panel: NfL, GFAP, IL-6, TNF-alpha, BDNF, S100B",
              "Assays: ELISA / Simoa (placeholder).", "",
              "Generated SAMPLE content — values are illustrative."])
    docs.append({"file": "biomarker-report.pdf", "mime": "application/pdf", "assetType": "document",
                 "title": "Biomarker panel report (SAMPLE)"})
    make_csv(DOCS / "observations.csv",
             ["animal,observed_on,kind,value,scale",
              "M-101,2026-05-01,body_weight,24.8,",
              "M-101,2026-05-15,motor_score,4,Hindlimb 0-5"])
    docs.append({"file": "observations.csv", "mime": "text/csv", "assetType": "spreadsheet",
                 "title": "Observations export (SAMPLE)"})

    (OUT / "manifest.json").write_text(
        json.dumps({
            "note": "Generated sample media for ALS Research Companion. Images are ANIMAL/"
                    "laboratory imagery (rodent MRI/histology/microscopy) — real CC-licensed "
                    "files from Wikimedia Commons where available (see SOURCES.md), else "
                    "locally-generated placeholders. Graphs and documents are generated "
                    "locally. All items are clearly-labelled SAMPLE test data; no human data.",
            "images": images, "docs": docs,
        }, indent=2), encoding="utf-8")

    lines = ["# Sample media — sources & licenses", "",
             "ANIMAL / laboratory imagery only (no human data). Real images are downloaded",
             "from Wikimedia Commons under their own licenses (attribution below); where no",
             "suitable freely-licensed animal image was found, a locally-generated CC0",
             "placeholder was used. Graphs and documents are generated locally (CC0).", ""]
    for file, mime, title, p in provs:
        lines.append(f"- **{file}** ({mime}) — {title}")
        lines.append(f"  - source: {p['source']}")
        lines.append(f"  - license: {p['license']} · author: {p['author']}")
    (OUT / "SOURCES.md").write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(f"\nDone: {len(images)} images, {len(docs)} documents -> {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
