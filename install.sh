#!/usr/bin/env bash
# Fists of Doom: Toronto installer for Mac and Chromebook (Linux).
#   curl -fsSL https://raw.githubusercontent.com/wacunn/toronto-fight-game/main/install.sh | bash
# Safe to run again: it updates the code and keeps your local data.
set -euo pipefail

REPO="${FOD_REPO:-wacunn/toronto-fight-game}"
BRANCH="${FOD_BRANCH:-main}"
DIR="${FOD_DIR:-$HOME/FistsOfDoom}"
say() { printf "\n\033[1m%s\033[0m\n" "$*"; }

say "Installing Fists of Doom: Toronto into $DIR"

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is missing. On a Chromebook run: sudo apt-get install -y curl"; exit 1
fi

# 1) uv: a small tool that brings its own Python, so nothing else needs installing.
if ! command -v uv >/dev/null 2>&1 && [[ ! -x "$HOME/.local/bin/uv" ]]; then
  say "Step 1 of 4: getting uv (brings its own Python)…"
  curl -LsSf https://astral.sh/uv/install.sh | sh >/dev/null
else
  say "Step 1 of 4: uv already installed."
fi
UV="$(command -v uv 2>/dev/null || echo "$HOME/.local/bin/uv")"

# 2) Fists of Doom game code (keeps data/ and .env if this is a reinstall).
say "Step 2 of 4: downloading Fists of Doom…"
mkdir -p "$DIR" "$DIR/data"
if [[ -n "${FOD_SRC:-}" ]]; then
  (cd "$FOD_SRC" && tar -cf - \
    --exclude=./data \
    --exclude=./.env \
    --exclude=./.venv \
    --exclude=./.git \
    --exclude=./logs \
    --exclude=./scratch \
    --exclude=./checkpoints \
    --exclude=./rl .) | (cd "$DIR" && tar -xf -)
else
  TMP="$(mktemp -d)"
  curl -fsSL "https://codeload.github.com/$REPO/tar.gz/refs/heads/$BRANCH" | tar -xz -C "$TMP"
  SRC="$(find "$TMP" -mindepth 1 -maxdepth 1 -type d | head -n1)"
  (cd "$SRC" && tar -cf - --exclude=./data --exclude=./.env --exclude=./.venv --exclude=./.git .) | (cd "$DIR" && tar -xf -)
  rm -rf "$TMP"
fi
chmod +x "$DIR/start.sh" "$DIR/install.sh"

# 3) Python and libraries (one time, about 30 seconds).
say "Step 3 of 4: setting up Python…"
if [[ ! -x "$DIR/.venv/bin/python" ]]; then
  "$UV" venv --python 3.12 "$DIR/.venv" -q
fi
"$UV" pip install --python "$DIR/.venv/bin/python" -q -r "$DIR/requirements.txt"

# 4) An app icon on Desktop / Applications (Mac) or Linux apps menu (Chromebook).
say "Step 4 of 4: adding the Fists of Doom icon…"
if [[ -n "${FOD_NO_SHORTCUT:-}" ]]; then
  WHERE="(shortcut skipped)"
elif [[ "$(uname)" == "Darwin" ]]; then
  mkdir -p "$HOME/Applications"
  APP="$HOME/Applications/Fists of Doom.app"
  rm -rf "$APP"
  mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
  cat > "$APP/Contents/MacOS/FistsOfDoom" <<EOF
#!/bin/bash
exec "$DIR/start.sh"
EOF
  chmod +x "$APP/Contents/MacOS/FistsOfDoom"
  if command -v sips >/dev/null && command -v iconutil >/dev/null && [[ -f "$DIR/static/icon-512.png" ]]; then
    IS="$(mktemp -d)/AppIcon.iconset"; mkdir -p "$IS"
    for s in 16 32 64 128 256 512; do sips -z $s $s "$DIR/static/icon-512.png" --out "$IS/icon_${s}x${s}.png" >/dev/null; done
    cp "$IS/icon_32x32.png" "$IS/icon_16x16@2x.png"; cp "$IS/icon_64x64.png" "$IS/icon_32x32@2x.png"
    cp "$IS/icon_256x256.png" "$IS/icon_128x128@2x.png"; cp "$IS/icon_512x512.png" "$IS/icon_256x256@2x.png"
    iconutil -c icns "$IS" -o "$APP/Contents/Resources/AppIcon.icns" 2>/dev/null || true
  fi
  cat > "$APP/Contents/Info.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleName</key><string>Fists of Doom</string>
  <key>CFBundleDisplayName</key><string>Fists of Doom</string>
  <key>CFBundleIdentifier</key><string>com.github.fistsofdoom</string>
  <key>CFBundleExecutable</key><string>FistsOfDoom</string>
  <key>CFBundleIconFile</key><string>AppIcon</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>LSUIElement</key><true/>
</dict></plist>
EOF
  ln -sfn "$APP" "$HOME/Desktop/Fists of Doom.app" 2>/dev/null || true
  WHERE="on your Desktop and in Applications"
else
  mkdir -p "$HOME/.local/share/applications"
  cat > "$HOME/.local/share/applications/fists-of-doom.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Fists of Doom
Comment=Fists of Doom: Toronto — Defender of the 6ix
Exec=$DIR/start.sh
Icon=$DIR/static/icon-512.png
Terminal=false
Categories=Game;ActionGame;
EOF
  WHERE="in your app launcher (inside the 'Linux apps' folder)"
fi

say "Done! Opening Fists of Doom now. Next time, click the Fists of Doom icon $WHERE."
[[ -n "${FOD_NO_LAUNCH:-}" ]] || "$DIR/start.sh"
