"""Wi-Fi management through NetworkManager's nmcli (Raspberry Pi OS Bookworm+)."""

import shutil
import socket
import subprocess
import threading
import time


def _split_terse(line):
    """Split one `nmcli -t` line, honouring backslash-escaped colons."""
    fields, current, escaped = [], "", False
    for char in line:
        if escaped:
            current += char
            escaped = False
        elif char == "\\":
            escaped = True
        elif char == ":":
            fields.append(current)
            current = ""
        else:
            current += char
    fields.append(current)
    return fields


class WifiManager:
    def __init__(self, interface="wlan0"):
        self.interface = interface
        self.available = shutil.which("nmcli") is not None
        self._lock = threading.Lock()
        self._job = {"state": "idle", "ssid": None, "error": None, "at": 0}
        self._networks = []
        self._networks_at = 0

    def _nmcli(self, *args, timeout=20):
        result = subprocess.run(["nmcli", *args], capture_output=True, text=True, timeout=timeout)
        if result.returncode != 0:
            message = (result.stderr or result.stdout).strip().replace("Error: ", "")
            raise RuntimeError(message or f"nmcli exited with {result.returncode}")
        return result.stdout

    @staticmethod
    def has_internet(timeout=2.5):
        for host in (("1.1.1.1", 53), ("8.8.8.8", 53)):
            try:
                with socket.create_connection(host, timeout=timeout):
                    return True
            except OSError:
                continue
        return False

    def current(self):
        """Return {ssid, ip} of the active Wi-Fi connection, or None values."""
        if not self.available:
            return {"ssid": None, "ip": None}
        ssid = ip = None
        try:
            for line in self._nmcli("-t", "-f", "DEVICE,TYPE,STATE,CONNECTION", "device").splitlines():
                device, kind, state, connection = (_split_terse(line) + ["", "", "", ""])[:4]
                if device == self.interface and kind == "wifi" and state == "connected":
                    ssid = connection or None
            out = self._nmcli("-g", "IP4.ADDRESS", "device", "show", self.interface)
            ip = out.split("|")[0].split("/")[0].strip() or None
        except Exception:
            pass
        return {"ssid": ssid, "ip": ip}

    def status(self):
        with self._lock:
            job = dict(self._job)
        info = self.current()
        if not self.available:
            state = "unavailable"
        elif job["state"] in {"connecting", "failed"} and time.time() - job["at"] < 120:
            state = job["state"]
        else:
            state = "connected" if info["ssid"] else "disconnected"
        return {"state": state, "ssid": info["ssid"], "ip": info["ip"], "target": job["ssid"], "error": job["error"] if state == "failed" else None}

    def scan(self, max_age=20):
        """Nearby networks sorted by signal; cached for `max_age` seconds."""
        if not self.available:
            return []
        if time.time() - self._networks_at < max_age:
            return self._networks
        networks = {}
        try:
            out = self._nmcli("-t", "-f", "SSID,SIGNAL,SECURITY", "device", "wifi", "list", "--rescan", "yes", timeout=30)
            for line in out.splitlines():
                ssid, signal, security = (_split_terse(line) + ["", "0", ""])[:3]
                if not ssid:
                    continue
                entry = {"ssid": ssid, "signal": int(signal or 0), "secure": bool(security and security != "--")}
                if ssid not in networks or networks[ssid]["signal"] < entry["signal"]:
                    networks[ssid] = entry
        except Exception as error:
            print(f"[wifi] scan failed: {error}")
        self._networks = sorted(networks.values(), key=lambda n: n["signal"], reverse=True)
        self._networks_at = time.time()
        return self._networks

    def connect_async(self, ssid, password, on_done=None):
        """Start connecting in a background thread; poll status() for progress."""
        with self._lock:
            self._job = {"state": "connecting", "ssid": ssid, "error": None, "at": time.time()}

        def worker():
            error = None
            try:
                if not self.available:
                    raise RuntimeError("nmcli is not installed on this device.")
                args = ["device", "wifi", "connect", ssid, "ifname", self.interface]
                if password:
                    args += ["password", password]
                # Rescan first so freshly enabled hotspots are visible.
                try:
                    self._nmcli("device", "wifi", "rescan", "ifname", self.interface, timeout=15)
                    time.sleep(3)
                except Exception:
                    pass
                self._nmcli(*args, timeout=60)
            except Exception as exc:
                error = str(exc)
            with self._lock:
                self._job = {"state": "failed" if error else "idle", "ssid": ssid, "error": error, "at": time.time()}
            print(f"[wifi] connect to '{ssid}': {'failed: ' + error if error else 'ok'}")
            if on_done:
                on_done(error)

        threading.Thread(target=worker, name="wifi-connect", daemon=True).start()
