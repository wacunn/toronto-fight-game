# Installing & Updating Fists of Doom: Toronto (Windows, Mac, ChromeOS & Linux)

Takes about **1–2 minutes one time**. No coding or Python setup needed—after installing, click the **Fists of Doom** icon, and updates happen with **one button right on the Start Screen**.

If **[Gemini Tutor](https://github.com/wacunn/gemini-tutor)** is also installed on the same computer, students can automatically earn *Fists of Doom* play time by doing active, verified writing in Gemini Tutor—and parents can customize the writing-to-game-time ratio (or lock standalone play when banked time is `0:00`) on Gemini Tutor's **Parent page** (`http://localhost:8787/parent`).

---

## Install on Your Computer

Choose your operating system below:

### Option A — Windows 11 / 10 (PC & 2-in-1 Laptops)

1. Open **PowerShell**: click **Start**, type `PowerShell`, and press `Enter`.
2. Copy this line, right-click inside PowerShell to paste it, and press `Enter`:

   ```powershell
   irm https://raw.githubusercontent.com/wacunn/toronto-fight-game/main/install.ps1 | iex
   ```

3. Wait about 1 minute until it says **Done!** Fists of Doom will open automatically, and you can close PowerShell.
4. **Every day after this:** double-click **Fists of Doom** on your **Desktop** (or in the **Start Menu**).

---

### Option B — Mac (Apple Silicon & Intel MacBook / iMac)

1. Open **Terminal**: press `⌘ Command` + `Space`, type `Terminal`, and press `Return`.
2. Copy this line, paste it into Terminal (`⌘ Command` + `V`), and press `Return`:

   ```bash
   curl -fsSL https://raw.githubusercontent.com/wacunn/toronto-fight-game/main/install.sh | bash
   ```

3. Wait about 1 minute until it says **Done!** Fists of Doom will open automatically, and you can close Terminal.
4. **Every day after this:** double-click **Fists of Doom** on your **Desktop** (or in `Applications`).

---

### Option C — ChromeOS (Chromebook / Googlebook)

If you haven't turned on Linux yet (one time, takes 3 minutes — skip to Step 3 if you already installed Gemini Tutor!):

1. Open **Settings** → **About ChromeOS** → **Developers** → **Linux development environment** → click **Turn On / Set up**.
2. Click **Next** → **Install** until the black **Terminal** window opens.

Then install Fists of Doom:

3. Copy this line, paste it into Terminal (`Ctrl` + `Shift` + `V`), and press `Enter`:

   ```bash
   curl -fsSL https://raw.githubusercontent.com/wacunn/toronto-fight-game/main/install.sh | bash
   ```

4. Wait about 1 minute until it says **Done!** Fists of Doom will open in ChromeOS Chrome (automatically tuned for smooth Chromebook performance).
5. **Every day after this:** click the **App Launcher** (bottom-left circle) → **Linux apps** → **Fists of Doom** *(right-click → **Pin to shelf**)*.

---

### Option D — Linux (Ubuntu, Debian, Fedora, Mint, Arch)

1. Open **Terminal** (`Ctrl` + `Alt` + `T`).
2. Paste this line and press `Enter`:

   ```bash
   curl -fsSL https://raw.githubusercontent.com/wacunn/toronto-fight-game/main/install.sh | bash
   ```

3. Wait about 1 minute until it says **Done!** Launch **Fists of Doom** anytime from your desktop app launcher (or run `~/FistsOfDoom/start.sh`).

---

## One-Button Updates on the Start Screen

Whenever a new version is pushed to GitHub:

1. Open **Fists of Doom** — the Start Screen automatically checks for updates.
2. When an update is ready, a glowing **⬆ UPDATE TO vX.Y.Z NOW** button appears right on the Start Screen.
3. Click it once — Fists of Doom downloads the update, keeps your saved data, restarts itself, and reloads automatically!
