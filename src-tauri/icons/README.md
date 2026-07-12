# App Icons

> ⚠️ **The current icons are TEMPORARY developer preview artwork** (generated
> 2026-07-12 from `assets/desktop-preview-icon.png` — a calm teal, non-clinical,
> text-free placeholder). **They MUST be replaced with approved release branding
> before any distribution.**

## Regenerate (one command)

From a single square source image (1024×1024 PNG recommended):

```bash
npm run tauri icon path/to/source.png
```

This regenerates every size referenced in `tauri.conf.json` (`32x32.png`,
`128x128.png`, `128x128@2x.png`, `icon.icns`, `icon.ico`, and the Windows Store
logos) into this folder, plus iOS/Android sets.

To swap in real branding: replace `assets/desktop-preview-icon.png` with the
approved 1024×1024 source and re-run the command above. See PROJECT_MEMORY.md →
"Prerequisites & known issues".
