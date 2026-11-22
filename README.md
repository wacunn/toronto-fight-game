# FISTS OF DOOM: TORONTO — DEFENDER OF THE 6IX

A first-person 3D retro-modern superhero street defense game set in an authentic 3D open-world downtown Toronto arena featuring the **553m CN Tower**, The Well, Rogers Centre, Scotiabank Arena, Union Station, and the Financial District. Protect innocent Toronto citizens from rogue combat androids and disguised alien body snatchers!

Live GitHub Pages: [https://wacunn.github.io/toronto-fight-game/](https://wacunn.github.io/toronto-fight-game/)

## 💻 One-Line Local Install (Mac, Chromebook & Windows PC)

For step-by-step instructions, see **[SETUP.md](SETUP.md)**. Installing locally adds a Desktop / Launcher app icon, **automatic Start Screen updates with one button**, and links seamlessly with **Gemini Tutor** so students can earn Fists of Doom game time through active writing!

- **Mac or Chromebook (Terminal):**
  ```bash
  curl -fsSL https://raw.githubusercontent.com/wacunn/toronto-fight-game/main/install.sh | bash
  ```
- **Windows PC (PowerShell):**
  ```powershell
  irm https://raw.githubusercontent.com/wacunn/toronto-fight-game/main/install.ps1 | iex
  ```
- **Running Locally from Source:**
  ```bash
  ./start.sh          # Mac / Chromebook / Linux -> http://localhost:8788
  start.cmd           # Windows PC -> http://localhost:8788
  ```

---

## 🛡️ Defender of the 6ix Mechanics

### 1. 👥 The Three Populations of Toronto
- **🟢 Innocent Citizens (Real Torontonians)**: Friendly citizens walking the streets. **DO NOT HIT!** Hurting citizens deducts 100 points (-250 on KO), but combos are preserved so you can keep momentum against real threats.
- **🔴 Humanoid Robots**: Rogue combat androids with a signature single-eye horizontal glowing optic visor, ear transceiver LEDs, and electric power fists. Destroy them for **+250 PTS** and sparks.
- **🟣 Body Snatchers**: Disguised alien parasites infiltrating Toronto! Look closely to spot their **glowing bioluminescent violet/magenta slit pupils** and **pulsating neck spore tendrils**. When attacked or approached, their disguise drops with an alien screech—purge them for **+400 PTS**!
- **👁️ HUD Bio-Scanner**: Point your crosshair at any character to identify their threat level (🟢 INNOCENT, 🔴 THREAT: HIGH, 🟣 BIO-ANOMALY).

### 2. 🎚️ Arena Difficulty Levels (Baddie vs. Good Citizen Ratios)
Toronto remains a densely packed, bustling metropolis on all difficulties (50 to 88 people), with difficulty adjusting the ratio of threats to innocent citizens:
- **🟢 EASY (TOURIST)**: 75% Civilians, 18% Robots, 7% Snatchers (50 citizens & threats). Relaxed stroll.
- **🔵 MEDIUM (DEFENDER)**: 50% Civilians, 35% Robots, 15% Snatchers (55 population). Balanced street defense.
- **🟡 HARD (INVASION)**: 25% Civilians, 50% Robots, 25% Snatchers (65 population). City under heavy siege.
- **🔴 IMPOSSIBLE (OVERRUN)**: 10% Civilians, 55% Robots, 35% Snatchers (88 population). Metropolis completely overrun!
- **In-Game Controls**:
  - Click the **`[◀]`** and **`[▶]`** step buttons in the top HUD or click the **`DIFF: ...`** badge.
  - Keyboard hotkeys: **`[`** (decrease difficulty) and **`]`** (increase difficulty).

### 3. 🏒 Canadian Berserk Mode & "O Canada" Anthem
- Building rage or finding Berserk stimpacks triggers **Canadian Berserker Mode**:
  - **Civilians are never hurt in Berserk mode** — the hockey stick just shoves them aside (no damage, no penalty). Robots and disguised snatchers still get the full slapshot, so anyone who *doesn't* get shoved aside is an alien.
  - The player's standard fists are replaced with a full 3D **Canadian Hockey Stick** (maple shaft, red/white Team Canada stripes, taped blade, and hockey gloves).
  - First-person **slapshot swing animations** with bone-cracking composite wood impact audio (`playHockeySlapshot`).
  - 3x slapshot damage and 2.2x knockback!
  - Background music seamlessly switches to a heavy dual-oscillator electric synth rock arrangement of **"O Canada"** with power chords, driving bass, and stadium kick drums.
- **⚡ Berserk Cheat Code**: Press **`Shift` + `1`** (or **`!`**) anytime during gameplay to instantly trigger Canadian Berserk mode with full duration!

---

## 🥊 3D Human Rival Fighters

- **Bruiser Tyson**: Heavyweight boxer with taped red fists, red boxing trunks, high-impact hooks, and tanky vitality.
- **Striker Damian**: Agile street fighter with red headband, combat cargo pants, cyan hand wraps, and rapid flurry jabs.
- **Cyber Rex**: Arena cyborg brawler in dark armor with golden brass knuckle wraps, neon green optic visor, and power crosses.
- **Iron Kai**: Muay Thai contender with purple shorts, white taped fists, and spiky topknot.

---

## 🎮 Controls

- **Move & Strafe**: `W`, `A`, `S`, `D`
- **Look & Aim**: `Mouse` (or Arrow Keys `←` `→` `↑` `↓` in Free Mouse Mode)
- **Primary Attack**: `Left Click` or `F`
- **Mighty Boot Kick**: `Right Click` or `E`
- **Jump**: `Spacebar`
- **Rush / Sprint**: `Shift`
- **💥 METEOR JUMP SLAM**: `Spacebar` (while airborne) + `Attack` (Massive radial ground-pound shockwave)
- **Select Attacks**: `1`, `2`, `3`, `4`
- **Cycle Difficulty In-Game**: `[` (decrease) / `]` (increase)
- **Canadian Berserk Cheat**: `Shift` + `1` (or `!`)
- **Release Mouse / Pause**: `ESC` or `P` (or click top left button)

---

## 📦 Supply Crate Weapon Upgrades

Smash crates around the exits of the Peace Sanctuary and across Toronto:
1. **Bare Knuckles [1]**: Fast standard jabs.
2. **Brass Knuckles [2]**: Heavy bone-crushing thunder hook.
3. **Combat Boots [3]**: Mighty boot kick that sends rivals flying.
4. **Meteor Gauntlet [4]**: Devastating airborne jump slam with radial ground shockwave.
5. **Berserk Stimpacks & Shields**: Vitality recovery and Canadian Hockey Stick Berserk mode.

---

## 🌐 Multiplayer (Squad Co-op / Brawl Duel)

**Play together at home (same Wi-Fi):**
1. On one computer: `pip install -r requirements.txt` then `python3 server_multiplayer.py`
2. Both players open `http://<that-computer's-IP>:8080/?room=family` (the host computer can use `http://localhost:8080/?room=family`).
3. Same `room` = same city. Different rooms are completely separate.

**How it works**
- The first player in a room is the **host**: their game runs the robots, snatchers and civilians and streams them to everyone else ~10×/s. Everyone fights the *same* robots; whoever lands the KO gets the points.
- If the host leaves, the next player takes over the city seamlessly (no reset).
- **Co-op vs PvP is a room setting** — toggling it changes it for everyone in the room, and the server refuses player-vs-player hits unless the room is in PvP.
- A paused or dead player doesn't freeze the city for the others, and robots won't attack someone sitting in the menu.
- Cars aren't synced (each screen has its own traffic). Missions and the CN Tower sky showdown are per-player.

**Online:** deploy with `render.yaml` (Render free tier), then open your Render URL. The GitHub Pages build connects to the Render relay by default; override with `?server=wss://your-host/ws`.
