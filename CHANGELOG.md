# Changelog

## 1.0.0
- **One-Line Local Installer (Mac, Chromebook/Linux & Windows PC):**
  - Added `install.sh` (macOS `.app` bundle + Desktop shortcut & Chromebook `.desktop` Linux app launcher) and `install.ps1` (Windows PC PowerShell installer with Desktop & Start Menu `.lnk` shortcuts), powered by `uv` standalone Python 3.12 with zero manual setup.
  - Added cross-platform background supervisor & app-window launcher (`launch.py`, `start.sh`, `start.cmd`) running locally on port `8788` alongside Gemini Tutor (`8787`).
- **Start Screen Update Checker & Single-Button Update (`updater.py`, `server_multiplayer.py`, `index.html`, `game.js`):**
  - Automatically checks GitHub for newer releases on the Start Screen and upgrades in place with a single button click while preserving `data/` and `.env`, then restarts and reloads automatically.
- **Gemini Tutor Arcade Link Support:**
  - Added local discovery & arcade session hooks so students can earn Fists of Doom game time through active, verified writing in Gemini Tutor.
