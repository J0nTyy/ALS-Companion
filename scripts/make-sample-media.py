"""
Generate the SAMPLE media set for testing ALS Research Companion.

Downloads REAL, freely-licensed images from Wikimedia Commons, normalizes them
with Pillow (resize + a small "SAMPLE" caption so they're distinguishable in the
viewer/comparison), ensures PNG / JPEG / TIFF coverage, and generates a couple of
sample documents (PDF + CSV). Writes everything to `sample-data/` plus a
`manifest.json` (consumed by seed-sample-data.py) and `SOURCES.md` (provenance +
licenses).

Run once (needs network):  python scripts/make-sample-media.py
"""

from __future__ import annotations
import io
import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "sample-data"
IMAGES = OUT / "images"
DOCS = OUT / "docs"
API = "https://commons.wikimedia.org/w/api.php"
UA = "ALS-Research-Companion-sample-data/1.0 (local developer test dataset)"

# Desired output images: (output filename, format, searches to draw a base from,
# caption, research-asset title, region). Formats chosen to cover the app's
# supported set — PNG/JPEG are viewable in-app; TIFF is stored but not viewable.
PLAN = [
    ("mri-brain-baseline.jpg", "JPEG", "brain MRI", "SAMPLE · Brain · Baseline",
     "Brain MRI — baseline (T2)", "Brain"),
    ("mri-brain-week8.png", "PNG", "brain MRI", "SAMPLE · Brain · Week 8",
     "Brain MRI — week 8 (T2)", "Brain"),
    ("mri-brain-week16.jpg", "JPEG", "brain MRI", "SAMPLE · Brain · Week 16",
     "Brain MRI — week 16 (T2)", "Brain"),
    ("mri-brainstem.png", "PNG", "brain MRI", "SAMPLE · Brainstem",
     "Brainstem MRI (T2)", "Brainstem"),
    ("mri-brain-highres.tif", "TIFF", "brain MRI", "SAMPLE · Brain · high-res (TIFF)",
     "Brain MRI — high resolution (TIFF)", "Brain"),
    ("histology-spinalcord.jpg", "JPEG", "spinal cord histology", "SAMPLE · Histology",
     "Spinal cord histology (H&E)", "Lumbar spinal cord"),
]


def fetch_candidates(search: str, limit: int = 12):
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
        mime = ii.get("mime", "")
        if mime not in ("image/jpeg", "image/png"):
            continue
        out.append({
            "title": page.get("title"),
            "url": ii.get("thumburl") or ii.get("url"),
            "descurl": ii.get("descriptionurl"),
            "mime": mime,
            "license": ii.get("extmetadata", {}).get("LicenseShortName", {}).get("value", "see source"),
            "author": _strip_html(ii.get("extmetadata", {}).get("Artist", {}).get("value", "Wikimedia Commons")),
        })
    return out


def _strip_html(value: str) -> str:
    import re
    return re.sub(r"<[^>]+>", "", value or "").strip()[:120] or "Wikimedia Commons"


def download(url: str, retries: int = 5) -> bytes:
    """Fetch with polite backoff — Wikimedia rate-limits rapid requests (HTTP 429)."""
    for attempt in range(retries):
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        try:
            return urllib.request.urlopen(req, timeout=90).read()
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < retries - 1:
                wait = 5 * (attempt + 1)
                print(f"    429 rate-limited; waiting {wait}s…")
                time.sleep(wait)
                continue
            raise
    raise RuntimeError("unreachable")


def caption(img: Image.Image, text: str) -> Image.Image:
    """Add a subtle bottom caption bar so sample images are distinguishable."""
    img = img.convert("RGB")
    w, h = img.size
    draw = ImageDraw.Draw(img, "RGBA")
    bar_h = max(28, h // 16)
    draw.rectangle([0, h - bar_h, w, h], fill=(0, 0, 0, 150))
    try:
        font = ImageFont.truetype("arial.ttf", size=max(14, bar_h // 2))
    except Exception:
        font = ImageFont.load_default()
    draw.text((10, h - bar_h + bar_h // 4), text, fill=(255, 255, 255), font=font)
    return img


def main() -> None:
    IMAGES.mkdir(parents=True, exist_ok=True)
    DOCS.mkdir(parents=True, exist_ok=True)

    # Gather candidates per search, de-duplicated, so each output gets a distinct base.
    pools: dict[str, list] = {}
    used_urls: set[str] = set()

    manifest_images = []
    sources = ["# Sample media — sources & licenses",
               "",
               "All images below are REAL files downloaded from Wikimedia Commons and used",
               "here only as **sample test data** for the ALS Research Companion. Each keeps",
               "its original license; attribution is listed. They are illustrative imagery for",
               "exercising the viewer/comparison — not actual ALS transgenic-mouse scans.",
               ""]

    for filename, fmt, search, cap, title, region in PLAN:
        if search not in pools:
            pools[search] = fetch_candidates(search)
        # pick next unused candidate
        chosen = None
        for cand in pools[search]:
            if cand["url"] and cand["url"] not in used_urls:
                chosen = cand
                break
        if chosen is None:
            # fall back to any brain MRI candidate
            for cand in pools.get("brain MRI", []):
                if cand["url"] and cand["url"] not in used_urls:
                    chosen = cand
                    break
        if chosen is None:
            print(f"! no candidate for {filename} (search: {search}); skipping")
            continue
        used_urls.add(chosen["url"])

        raw = download(chosen["url"])
        time.sleep(2)  # be polite to Wikimedia between downloads
        img = Image.open(io.BytesIO(raw))
        img.thumbnail((1024, 1024))
        img = caption(img, cap)

        dest = IMAGES / filename
        save_kwargs = {}
        if fmt == "JPEG":
            save_kwargs = {"quality": 88}
        img.save(dest, format=fmt, **save_kwargs)
        mime = {"JPEG": "image/jpeg", "PNG": "image/png", "TIFF": "image/tiff"}[fmt]
        manifest_images.append({
            "file": filename, "mime": mime, "title": title, "region": region,
            "viewable": fmt in ("JPEG", "PNG"),
        })
        sources.append(f"- **{filename}** ({mime}) — {title}")
        sources.append(f"  - source: {chosen['descurl']}")
        sources.append(f"  - license: {chosen['license']} · author: {chosen['author']}")
        print(f"  wrote {dest.relative_to(ROOT)}  <- {chosen['title']}")

    # ---- documents (generated locally) ----
    docs = []
    _make_pdf(DOCS / "sample-study-protocol.pdf",
              "SAMPLE — Study protocol",
              ["SOD1-G93A survival cohort",
               "1. Gene confirmation (day 0)",
               "2. Baseline behavioural assessment (day 7)",
               "3. Baseline brain MRI (day 14)",
               "4. Weekly body weight + hindlimb motor score",
               "5. Endpoint histopathology",
               "",
               "This is generated SAMPLE test content, not a real protocol."])
    docs.append({"file": "sample-study-protocol.pdf", "mime": "application/pdf",
                 "assetType": "pdf", "title": "Study protocol (SAMPLE)"})

    _make_pdf(DOCS / "sample-mri-report.pdf",
              "SAMPLE — MRI session report",
              ["Animal M-101 · Brain · T2",
               "Acquisition: baseline",
               "Findings: illustrative sample text only.",
               "",
               "Generated SAMPLE content for testing document handling."])
    docs.append({"file": "sample-mri-report.pdf", "mime": "application/pdf",
                 "assetType": "document", "title": "MRI session report (SAMPLE)"})

    _make_csv(DOCS / "sample-observations.csv",
              ["animal,observed_on,kind,value,scale",
               "M-101,2026-05-01,body_weight,24.8,",
               "M-101,2026-05-08,body_weight,24.1,",
               "M-101,2026-05-15,body_weight,23.0,",
               "M-101,2026-05-15,motor_score,4,Hindlimb 0-5",
               "M-102,2026-05-15,motor_score,3,Hindlimb 0-5"])
    docs.append({"file": "sample-observations.csv", "mime": "text/csv",
                 "assetType": "spreadsheet", "title": "Observations export (SAMPLE)"})

    manifest = {
        "note": "Generated sample media for ALS Research Companion. Images are real "
                "CC-licensed files from Wikimedia Commons (see SOURCES.md); documents "
                "are locally generated. Everything here is clearly-labelled SAMPLE test data.",
        "images": manifest_images,
        "docs": docs,
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    (OUT / "SOURCES.md").write_text("\n".join(sources) + "\n", encoding="utf-8")
    print(f"\nDone: {len(manifest_images)} images, {len(docs)} documents -> {OUT.relative_to(ROOT)}")


def _make_pdf(path: Path, title: str, lines: list[str]) -> None:
    """Render text onto an A4-ish page image and save as a real PDF (via Pillow)."""
    W, H = 1240, 1754
    img = Image.new("RGB", (W, H), "white")
    draw = ImageDraw.Draw(img)
    try:
        title_font = ImageFont.truetype("arialbd.ttf", 46)
        body_font = ImageFont.truetype("arial.ttf", 30)
    except Exception:
        title_font = ImageFont.load_default()
        body_font = ImageFont.load_default()
    draw.text((90, 110), title, fill=(20, 20, 20), font=title_font)
    y = 210
    for line in lines:
        draw.text((90, y), line, fill=(40, 40, 40), font=body_font)
        y += 48
    img.save(path, "PDF", resolution=150.0)
    print(f"  wrote {path.relative_to(ROOT)}")


def _make_csv(path: Path, rows: list[str]) -> None:
    path.write_text("\n".join(rows) + "\n", encoding="utf-8")
    print(f"  wrote {path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
