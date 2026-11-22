# Changelog

## 1.0.1
- **Chromebook / ARM64 Startup & Performance Fix ("Page Unresponsive" Resolved):**
  - Added automatic Chromebook / ARM / low-RAM hardware profile (`FOD_HW.lite`) that cuts procedural Canvas2D texture VRAM by **4.6x** (~474 MB → ~103 MB RGBA) and disables expensive multi-pass post-processing (`UnrealBloomPass`), shadow maps, and cubemap `PMREMGenerator` passes on integrated mobile GPUs.
  - Split startup into non-blocking progressive stages (`city` → Start Screen UI paint → `traffic` → `enemies` → `islands`) and throttled Start Screen background rendering so the menu & update bar respond immediately without triggering Chrome's 15-second watchdog.
  - Optimized spatial collision lookups, wall coplanar checks, single-pass island heightfield generation, shared heritage cottage geometries, and direct-array mesh merging (`mergeGroupByMaterial`).

## 1.0.0
- **One-Line Local Installer (Mac, Chromebook/Linux & Windows PC):**
  - Added `install.sh` (macOS `.app` bundle + Desktop shortcut & Chromebook `.desktop` Linux app launcher) and `install.ps1` (Windows PC PowerShell installer with Desktop & Start Menu `.lnk` shortcuts), powered by `uv` standalone Python 3.12 with zero manual setup.
  - Added cross-platform background supervisor & app-window launcher (`launch.py`, `start.sh`, `start.cmd`) running locally on port `8788` alongside Gemini Tutor (`8787`).
- **Start Screen Update Checker & Single-Button Update (`updater.py`, `server_multiplayer.py`, `index.html`, `game.js`):**
  - Automatically checks GitHub for newer releases on the Start Screen and upgrades in place with a single button click while preserving `data/` and `.env`, then restarts and reloads automatically.
- **Gemini Tutor Arcade Link Support:**
  - Added local discovery & arcade session hooks so students can earn Fists of Doom game time through active, verified writing in Gemini Tutor.
