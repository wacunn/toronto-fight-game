#!/usr/bin/env bash
# Starts Fists of Doom in the background (if it isn't already running) and opens it in an app window.
cd "$(dirname "$0")" || exit 1
PORT="${PORT:-8788}"
URL="http://localhost:${PORT}"
mkdir -p logs data

is_up() { curl -fs -o /dev/null --max-time 1 "$URL/api/version"; }

open_app() {
  [[ "${FOD_NO_OPEN:-}" == "1" ]] && return 0
  if [[ "$(uname)" == "Darwin" ]]; then
    if [[ -d "/Applications/Google Chrome.app" || -d "$HOME/Applications/Google Chrome.app" ]]; then
      open -na "Google Chrome" --args --app="$URL" --window-size=1360,880
    else
      open "$URL"
    fi
  else
    # On a Chromebook this opens the page in Chrome.
    xdg-open "$URL" >/dev/null 2>&1 || garcon-url-handler "$URL" >/dev/null 2>&1 || echo "Open $URL in Chrome"
  fi
}

if is_up; then open_app; exit 0; fi

# Only this computer can reach it unless FOD_LAN=1. (A Chromebook's Linux container needs 0.0.0.0, which is still private to the Chromebook.)
HOST=127.0.0.1
if [[ -e /dev/.cros_milestone || "$(hostname)" == "penguin" ]]; then HOST=0.0.0.0; fi
[[ "${FOD_LAN:-}" == "1" ]] && HOST=0.0.0.0

PY=".venv/bin/python"
[[ -x "$PY" ]] || PY="$(command -v python3)"

nohup bash -c "
  while true; do
    '$PY' -m uvicorn server_multiplayer:app --host '$HOST' --port '$PORT' --ws-max-size 1048576 >> logs/server.log 2>&1
    code=\$?
    [[ \$code -eq 42 ]] || break   # 42 = restart after an update
  done
" >/dev/null 2>&1 &
disown || true

for _ in $(seq 1 80); do is_up && break; sleep 0.25; done
open_app
