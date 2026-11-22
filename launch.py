"""Cross-platform background supervisor & app-window launcher for Fists of Doom (macOS, Windows, Chromebook/Linux)."""

from __future__ import annotations

import os
import shutil
import socket
import subprocess
import sys
import time
import urllib.request
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PORT = int(os.environ.get("PORT", "8788"))
URL = f"http://localhost:{PORT}"
LOGS = ROOT / "logs"


def is_up() -> bool:
    try:
        with urllib.request.urlopen(f"{URL}/api/version", timeout=1.0) as r:
            return r.status == 200
    except Exception:
        return False


def open_app() -> None:
    if sys.platform == "darwin":
        for chrome in ("/Applications/Google Chrome.app", str(Path.home() / "Applications/Google Chrome.app")):
            if Path(chrome).exists():
                subprocess.Popen(["open", "-na", chrome, "--args", f"--app={URL}", "--window-size=1360,880"])
                return
        webbrowser.open(URL)
        return

    if os.name == "nt":
        candidates = [
            os.path.expandvars(r"%ProgramFiles%\Google\Chrome\Application\chrome.exe"),
            os.path.expandvars(r"%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"),
            os.path.expandvars(r"%LocalAppData%\Google\Chrome\Application\chrome.exe"),
            os.path.expandvars(r"%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"),
            os.path.expandvars(r"%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"),
        ]
        for browser in candidates:
            if Path(browser).exists():
                subprocess.Popen([browser, f"--app={URL}", "--window-size=1360,880"])
                return
        webbrowser.open(URL)
        return

    for opener in ("xdg-open", "garcon-url-handler"):
        if shutil.which(opener):
            subprocess.Popen([opener, URL], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            return
    webbrowser.open(URL)


def supervise() -> None:
    LOGS.mkdir(parents=True, exist_ok=True)
    host = "127.0.0.1"
    if (
        Path("/dev/.cros_milestone").exists()
        or socket.gethostname() == "penguin"
        or os.environ.get("FOD_LAN") == "1"
    ):
        host = "0.0.0.0"
    py = sys.executable
    log_path = LOGS / "server.log"
    while True:
        with log_path.open("a", encoding="utf-8") as lf:
            proc = subprocess.run(
                [
                    py,
                    "-m",
                    "uvicorn",
                    "server_multiplayer:app",
                    "--host",
                    host,
                    "--port",
                    str(PORT),
                    "--ws-max-size",
                    str(2**20),
                ],
                cwd=str(ROOT),
                stdout=lf,
                stderr=lf,
            )
        if proc.returncode != 42:  # 42 = restart after one-click software update
            break


def main() -> None:
    if "--supervise" in sys.argv:
        supervise()
        return

    no_open = "--no-open" in sys.argv

    if is_up():
        if not no_open:
            open_app()
        return

    py = sys.executable
    if os.name == "nt":
        pyw = Path(py).with_name("pythonw.exe")
        if pyw.exists():
            py = str(pyw)
        flags = subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP
        subprocess.Popen([py, str(ROOT / "launch.py"), "--supervise"], cwd=str(ROOT), creationflags=flags)
    else:
        subprocess.Popen(
            [py, str(ROOT / "launch.py"), "--supervise"],
            cwd=str(ROOT),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True,
        )

    for _ in range(80):
        if is_up():
            break
        time.sleep(0.25)
    if not no_open:
        open_app()


if __name__ == "__main__":
    main()
