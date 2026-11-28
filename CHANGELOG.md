# Changelog

## 1.1.0
- **Windows Laptop / Lenovo Yoga GPU & Precision Trackpad Optimization (`launch.py`, `city.js`, `game.js`, `styles.css`, `index.html`):**
  - **Windows GPU Auto-Tiering (`⚡ GFX: LAPTOP`)**: Added live WebGL `UNMASKED_RENDERER_WEBGL` probing in `FOD_HW` (`ultra` / `balanced` / `lite`), auto-selecting `balanced` on Windows integrated GPUs (Lenovo Yoga Intel UHD / Iris Xe / Arc / AMD Radeon iGPU / Adreno) to skip shadows, MSAA, offscreen bloom, and DWM `backdrop-filter` blur readbacks (`html.win-perf`), cap pixel ratio at `1.0` with a Live Adaptive FPS Resolution Governor, and launch Chrome/Edge on Windows with `--ignore-gpu-blocklist`, `--enable-gpu-rasterization`, and `--disable-features=OverscrollHistoryNavigation`.
  - **Windows Precision Trackpad, Yoga Touchscreen & Keyboard Aim**: Added `requestSafePointerLock({ unadjustedMovement: true })` with graceful fallback, spike-rejected `applyLookDelta()` (`>160px` ignored, clamped `±65px`), 1-finger left-click drag-look + quick tap-to-punch in Free Mouse Mode, native touchscreen drag-look & tap-to-punch, 2-finger horizontal trackpad pan, `overscroll-behavior: none; touch-action: none;`, `J/L/I/K` keyboard aim (immune to Windows WASD touchpad palm-rejection), clickable `#gfx-tier-badge` switcher, and `-` / `+` live sensitivity tuning.

## 1.0.3
- **Gemini Tutor Parent Override Support (`server_multiplayer.py`):**
  - `/api/arcade-status` now honors Gemini Tutor's `parent_override_until` (`30m`, `1 hr`, `Rest of Today`, or `Until Turned Off`) so standalone *Fists of Doom* unlocks automatically during Parent Free Play Override even when banked game time is `0:00` and `lock_standalone` is enabled.

## 1.0.2
- **Windows 11 Clean Reinstall & Windowless Updater Polish (`install.ps1`, `updater.py`, `launch.py`):**
  - `install.ps1` now gracefully stops any running local server (`/api/quit`) before replacing files so Windows never hits file-in-use locks, and `updater.py` uses `CREATE_NO_WINDOW` during silent dependency updates.

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
