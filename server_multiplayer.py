#!/usr/bin/env python3
"""
Fists of Doom: Toronto — local app server, updater API & multiplayer WebSocket relay (single port).

Model
-----
* Serves `index.html` and game assets locally (`http://localhost:8788` by default, or `$PORT`),
  plus `/api/version`, `/api/update/check`, `/api/update/apply`, `/api/quit`, and `/api/arcade-status`.
* Rooms come from the WebSocket URL:  ws://host/ws?room=6ix&name=MAPLE-FIST
* Each room has ONE host (the first player in; the oldest remaining player if the
  host leaves). The host's browser runs the robots / snatchers / civilians and
  streams snapshots ("world"); everyone else renders those and sends their hits
  back to the host ("enemy_hit"). The host tells players when a robot punched
  them ("enemy_dmg") and who earned points ("score_event").
* Co-op vs PvP is a ROOM setting held here, so one kid toggling PvP can't hurt
  someone who thinks they're in co-op. Player-vs-player "hit" packets are only
  relayed while the room is in PvP mode.

Runs locally (`./start.sh`, `launch.py`, or `python3 server_multiplayer.py`) or on Render/Fly (`$PORT`).
"""

from __future__ import annotations

import asyncio
import json
import mimetypes
import os
import re
import uuid
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, PlainTextResponse

import updater

PORT = int(os.environ.get("PORT", "8788"))
HOST = os.environ.get("HOST", "0.0.0.0")
BASE_DIR = Path(__file__).resolve().parent
DEFAULT_ROOM = "6ix"

updater.ensure_dirs()

PLAYER_COLORS = [
    0xEF4444,  # red
    0x00F0FF,  # cyan
    0xF59E0B,  # amber
    0x10B981,  # emerald
    0xC026D3,  # purple
    0xF43F5E,  # rose
    0x38BDF8,  # sky
    0xFFFFFF,  # white
]

STATE_KEYS = ("x", "y", "z", "yaw", "pitch", "anim", "isBerserk", "health", "armor", "score")

app = FastAPI(title="Fists of Doom: Toronto")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def no_cache(request: Request, call_next):
    resp = await call_next(request)
    resp.headers["Cache-Control"] = "no-store, must-revalidate"
    return resp


def clean_room(raw: str | None) -> str:
    r = re.sub(r"[^a-z0-9_-]", "", (raw or "").strip().lower())[:24]
    return r or DEFAULT_ROOM


def clean_name(raw: str | None, fallback: str) -> str:
    n = re.sub(r"[\x00-\x1f<>]", "", (raw or "").strip())[:20]
    return n or fallback


class Room:
    def __init__(self, name: str):
        self.name = name
        self.players: dict[str, dict] = {}  # pid -> {"ws": ws, "info": {...}}
        self.host: str | None = None
        self.pvp = False

    def conns(self, exclude: str | None = None) -> list[WebSocket]:
        return [p["ws"] for pid, p in self.players.items() if pid != exclude]

    def free_color(self) -> int:
        used = {p["info"]["color"] for p in self.players.values()}
        for c in PLAYER_COLORS:
            if c not in used:
                return c
        return PLAYER_COLORS[len(self.players) % len(PLAYER_COLORS)]


ROOMS: dict[str, Room] = {}


async def _safe_send(ws: WebSocket, payload: str) -> None:
    try:
        await ws.send_text(payload)
    except Exception:
        pass


def send_ws(ws: WebSocket, obj: dict) -> None:
    asyncio.create_task(_safe_send(ws, json.dumps(obj)))


def send_room(room: Room, obj: dict, exclude: str | None = None) -> None:
    conns = room.conns(exclude)
    if not conns:
        return
    payload = json.dumps(obj)
    for c in conns:
        asyncio.create_task(_safe_send(c, payload))


def dispatch_ws(room: Room, pid: str, info: dict, msg: dict) -> None:
    t = msg.get("type")
    is_host = room.host == pid

    if t == "state":
        out = {"type": "state", "id": pid}
        for k in STATE_KEYS:
            if k in msg:
                info[k] = msg[k]
                out[k] = msg[k]
        send_room(room, out, exclude=pid)

    elif t == "join_info":
        info["name"] = clean_name(msg.get("name"), info["name"])
        send_room(room, {"type": "player_updated", "player": info}, exclude=pid)

    elif t in ("attack", "taunt"):
        msg["id"] = pid
        msg["name"] = info["name"]
        send_room(room, msg, exclude=pid)

    elif t == "set_mode":
        room.pvp = bool(msg.get("pvp"))
        send_room(room, {"type": "mode", "pvp": room.pvp, "by": info["name"]})

    elif t == "hit":  # player-vs-player, only in PvP rooms
        target = room.players.get(msg.get("targetId"))
        if room.pvp and target:
            msg.update(attackerId=pid, attackerName=info["name"])
            send_ws(target["ws"], msg)

    elif t == "ko":
        msg.update(victimId=pid, victimName=info["name"])
        send_room(room, msg)

    # ---- host-authoritative NPC sync ----
    elif t == "world":
        if is_host:
            send_room(room, msg, exclude=pid)

    elif t == "enemy_hit":  # guest -> host
        host = room.players.get(room.host) if room.host else None
        if host and not is_host:
            msg["from"] = pid
            send_ws(host["ws"], msg)

    elif t in ("enemy_dmg", "score_event"):  # host -> one guest
        target = room.players.get(msg.get("targetId"))
        if is_host and target:
            send_ws(target["ws"], msg)


# ------------------------------------------------------------------ API Routes


@app.get("/health", response_class=PlainTextResponse)
@app.get("/ping", response_class=PlainTextResponse)
def health():
    return "pong"


@app.get("/api/version")
def api_version():
    return {
        "app": "fists-of-doom",
        "version": updater.local_version(),
        "repo": updater.REPO,
        "local_install": True,
    }


@app.get("/api/arcade-status")
def api_arcade_status():
    """Checks whether Gemini Tutor is installed locally with standalone lock active."""
    tutor_dir = Path(os.environ.get("TUTOR_DIR") or (Path.home() / "GeminiTutor"))
    learner_file = tutor_dir / "data" / "learner.json"
    tutor_port = int(os.environ.get("TUTOR_PORT", "8787"))
    if not learner_file.is_file():
        return {"tutor_installed": False, "locked": False}
    try:
        rec = json.loads(learner_file.read_text(encoding="utf-8"))
        arc = rec.get("arcade") or {}
        enabled = bool(arc.get("enabled", True))
        lock_standalone = bool(arc.get("lock_standalone", False))
        rem = max(0.0, float(arc.get("game_seconds_available") or 0.0))
        return {
            "tutor_installed": True,
            "locked": bool(enabled and lock_standalone and rem <= 0),
            "remaining_seconds": round(rem, 1),
            "tutor_url": f"http://localhost:{tutor_port}",
        }
    except Exception:
        return {"tutor_installed": True, "locked": False}


@app.get("/api/update/check")
async def api_update_check():
    return await asyncio.to_thread(updater.check)


@app.post("/api/update/apply")
async def api_update_apply():
    try:
        res = await asyncio.to_thread(updater.apply)
    except Exception as e:
        raise HTTPException(500, f"Update failed: {e}")
    updater.restart_soon()
    return res


@app.post("/api/quit")
def api_quit():
    updater.quit_soon()
    return {"ok": True}


# ------------------------------------------------------------------ WebSocket


@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    await ws.accept()
    room_name = clean_room(ws.query_params.get("room"))
    room = ROOMS.get(room_name)
    if room is None:
        room = ROOMS[room_name] = Room(room_name)

    pid = "p_" + uuid.uuid4().hex[:8]
    info = {
        "id": pid,
        "name": clean_name(ws.query_params.get("name"), f"DEFENDER-{len(room.players) + 1}"),
        "color": room.free_color(),
        "x": 0,
        "y": 0,
        "z": 0,
        "yaw": 0,
        "pitch": 0,
        "anim": "idle",
        "isBerserk": False,
        "health": 100,
        "armor": 50,
        "score": 0,
    }
    room.players[pid] = {"ws": ws, "info": info}
    if room.host is None:
        room.host = pid
    print(f"[+] {info['name']} ({pid}) joined [{room_name}] host={room.host} n={len(room.players)}")

    send_ws(
        ws,
        {
            "type": "welcome",
            "id": pid,
            "color": info["color"],
            "name": info["name"],
            "room": room_name,
            "hostId": room.host,
            "pvp": room.pvp,
            "players": [p["info"] for k, p in room.players.items() if k != pid],
        },
    )
    send_room(room, {"type": "player_joined", "player": info}, exclude=pid)

    try:
        while True:
            raw = await ws.receive_text()
            try:
                msg = json.loads(raw)
                if isinstance(msg, dict):
                    dispatch_ws(room, pid, info, msg)
            except Exception as e:
                print(f"  bad packet from {pid}: {e}")
    except (WebSocketDisconnect, RuntimeError, Exception):
        pass
    finally:
        room.players.pop(pid, None)
        host_changed = False
        if room.host == pid:
            room.host = next(iter(room.players), None)
            host_changed = True
        print(f"[-] {info['name']} ({pid}) left [{room_name}] n={len(room.players)} host={room.host}")
        if not room.players:
            ROOMS.pop(room_name, None)
        else:
            send_room(room, {"type": "player_left", "id": pid, "name": info["name"]})
            if host_changed:
                send_room(room, {"type": "host", "hostId": room.host})


# ------------------------------------------------------------------ Static Files


@app.get("/")
def root_index():
    target = BASE_DIR / "index.html"
    if not target.is_file():
        target = BASE_DIR / "play.html"
    return FileResponse(str(target), media_type="text/html")


@app.get("/{rel_path:path}")
def serve_static(rel_path: str):
    clean = rel_path.strip("/") or "index.html"
    if any(part.startswith(".") for part in clean.split("/")):
        raise HTTPException(404, "Not Found")
    file_path = (BASE_DIR / clean).resolve()
    if not file_path.is_relative_to(BASE_DIR) or not file_path.is_file():
        raise HTTPException(404, "Not Found")
    mime = mimetypes.guess_type(str(file_path))[0] or {
        ".js": "application/javascript",
        ".css": "text/css",
        ".json": "application/json",
        ".ico": "image/x-icon",
    }.get(file_path.suffix, "application/octet-stream")
    return FileResponse(str(file_path), media_type=mime)


if __name__ == "__main__":
    import uvicorn

    print("=" * 60)
    print("FISTS OF DOOM: TORONTO — local app & multiplayer server")
    print(f"http://{HOST}:{PORT}   ws://{HOST}:{PORT}/ws?room=<name>")
    print("=" * 60)
    uvicorn.run(app, host=HOST, port=PORT, ws_max_size=2**20, ws_ping_interval=20, ws_ping_timeout=60)
