"""In-app updates for Fists of Doom: check GitHub for a newer version, download it, keep local data, restart.

Works across macOS, Windows PC, and Chromebook (Linux) with zero git required.
The launcher (start.sh / start.cmd / launch.py) restarts the server automatically when it exits with code 42.
"""

from __future__ import annotations

import io
import os
import shutil
import ssl
import subprocess
import tarfile
import tempfile
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"

REPO = os.environ.get("FOD_REPO", "wacunn/toronto-fight-game")
BRANCH = os.environ.get("FOD_BRANCH", "main")
KEEP = {"data", ".env", ".venv", "logs", ".git", "checkpoints", "rl"}
RESTART_CODE = 42


def _ensure_ssl_certs() -> None:
    """Uses native OS certificate store (macOS Keychain / Windows Cert Store via truststore)
    with fallback to certifi so standalone Python in .app / .venv never fails SSL."""
    try:
        import truststore

        truststore.inject_into_ssl()
    except Exception:
        pass
    if os.environ.get("SSL_CERT_FILE") and Path(os.environ["SSL_CERT_FILE"]).exists():
        return
    vp = ssl.get_default_verify_paths()
    if vp.cafile and Path(vp.cafile).exists():
        return
    try:
        import certifi

        ca = certifi.where()
        if ca and Path(ca).exists():
            os.environ["SSL_CERT_FILE"] = ca
    except Exception:
        pass


_ensure_ssl_certs()


def ensure_dirs() -> None:
    DATA.mkdir(parents=True, exist_ok=True)
    (ROOT / "logs").mkdir(parents=True, exist_ok=True)


def local_version() -> str:
    try:
        return (ROOT / "VERSION").read_text(encoding="utf-8").strip() or "1.0.0"
    except OSError:
        return "1.0.0"


def _vtuple(v: str) -> tuple:
    out = []
    for p in v.strip().lstrip("vV").split("."):
        try:
            out.append(int(p))
        except ValueError:
            out.append(0)
    return tuple(out)


def _get(url: str, timeout: int = 20) -> bytes:
    _ensure_ssl_certs()
    req = urllib.request.Request(url, headers={"User-Agent": "fists-of-doom-updater"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def check() -> dict:
    current = local_version()
    ver_url = os.environ.get(
        "FOD_UPDATE_VERSION_URL",
        f"https://raw.githubusercontent.com/{REPO}/{BRANCH}/VERSION?t={int(time.time())}",
    )
    notes_url = os.environ.get(
        "FOD_UPDATE_CHANGELOG_URL",
        f"https://raw.githubusercontent.com/{REPO}/{BRANCH}/CHANGELOG.md?t={int(time.time())}",
    )
    try:
        latest = _get(ver_url).decode("utf-8").strip()
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return {"current": current, "latest": current, "available": False, "notes": ""}
        return {"current": current, "latest": None, "available": False, "error": f"GitHub HTTP {e.code}."}
    except Exception as e:
        return {
            "current": current,
            "latest": None,
            "available": False,
            "error": f"Offline — playing local version ({e.__class__.__name__}).",
        }
    notes = ""
    try:
        notes = _get(notes_url).decode("utf-8")[:1500]
    except Exception:
        pass
    return {
        "current": current,
        "latest": latest,
        "available": _vtuple(latest) > _vtuple(current),
        "notes": notes,
    }


def _uv() -> str | None:
    exe = "uv.exe" if os.name == "nt" else "uv"
    candidates = [
        shutil.which("uv"),
        str(Path.home() / ".local" / "bin" / exe),
        str(Path.home() / ".cargo" / "bin" / exe),
    ]
    if os.name == "nt":
        local_app = os.environ.get("LOCALAPPDATA")
        if local_app:
            candidates.append(str(Path(local_app) / "uv" / exe))
    for c in candidates:
        if c and Path(c).exists():
            return c
    return None


def _venv_python() -> Path | None:
    if os.name == "nt":
        p = ROOT / ".venv" / "Scripts" / "python.exe"
    else:
        p = ROOT / ".venv" / "bin" / "python"
    return p if p.exists() else None


def apply() -> dict:
    tar_url = os.environ.get(
        "FOD_UPDATE_TARBALL_URL",
        f"https://codeload.github.com/{REPO}/tar.gz/refs/heads/{BRANCH}",
    )
    data = _get(tar_url, timeout=120)
    with tempfile.TemporaryDirectory() as tmp:
        with tarfile.open(fileobj=io.BytesIO(data), mode="r:gz") as tf:
            tf.extractall(tmp)
        roots = [p for p in Path(tmp).iterdir() if p.is_dir()]
        if not roots:
            raise RuntimeError("download was empty")
        src = roots[0]
        if not (src / "index.html").exists() or not (src / "game.js").exists():
            raise RuntimeError("download doesn't look like Fists of Doom")
        for item in src.iterdir():
            if item.name in KEEP:
                continue
            dest = ROOT / item.name
            if dest.is_dir() and not dest.is_symlink():
                shutil.rmtree(dest)
            elif dest.exists() or dest.is_symlink():
                dest.unlink()
            if item.is_dir():
                shutil.copytree(item, dest)
            else:
                shutil.copy2(item, dest)
    if os.name != "nt":
        for script in ("start.sh", "install.sh"):
            p = ROOT / script
            if p.exists():
                try:
                    p.chmod(0o755)
                except OSError:
                    pass
    req_file = ROOT / "requirements.txt"
    if req_file.exists():
        uv = _uv()
        venv_py = _venv_python()
        if uv and venv_py:
            subprocess.run([uv, "pip", "install", "--python", str(venv_py), "-q", "-r", str(req_file)], check=False)
        elif venv_py:
            subprocess.run([str(venv_py), "-m", "pip", "install", "-q", "-r", str(req_file)], check=False)
    return {"ok": True, "version": local_version()}


def restart_soon(delay: float = 1.0) -> None:
    def _go():
        time.sleep(delay)
        os._exit(RESTART_CODE)

    threading.Thread(target=_go, daemon=True).start()


def quit_soon(delay: float = 0.5) -> None:
    def _go():
        time.sleep(delay)
        os._exit(0)

    threading.Thread(target=_go, daemon=True).start()
