"""Bluetooth LE provisioning: lets the phone hand its Wi-Fi network to the Pi.

GATT service (UUIDs shared with mobile-app/src/constants/ble.ts):
  STATUS   read   JSON {wifi, backend, pin, camera, model}
  NETWORKS read   JSON [{s: ssid, q: signal 0-100, l: secured}]
  COMMAND  write  framed JSON, see _on_command_chunk()

The phone writes in small chunks, so every message starts with 0x02 (STX)
and ends with 0x0A (newline); the Pi reassembles before parsing.
Requires BlueZ + `pip install bluezero` (needs python3-dbus, python3-gi).
"""

import json
import threading
import time

SERVICE_UUID = "9f3a0001-6c1d-4a8e-9b2f-4a7e1c0d5b10"
STATUS_UUID = "9f3a0002-6c1d-4a8e-9b2f-4a7e1c0d5b10"
NETWORKS_UUID = "9f3a0003-6c1d-4a8e-9b2f-4a7e1c0d5b10"
COMMAND_UUID = "9f3a0004-6c1d-4a8e-9b2f-4a7e1c0d5b10"

STX, NEWLINE = 0x02, 0x0A


class BleProvisioner:
    def __init__(self, config, wifi, status_provider, on_backend_url):
        self.cfg = config
        self.wifi = wifi
        self.status_provider = status_provider
        self.on_backend_url = on_backend_url
        self.error = None
        self.running = False
        self._buffer = bytearray()
        self._last_result = None  # result of the last command, echoed in STATUS

    # --- GATT callbacks -----------------------------------------------------
    @staticmethod
    def _slice(payload, options):
        offset = int((options or {}).get("offset", 0))
        return list(payload[offset:])

    def _status_payload(self):
        data = self.status_provider()
        data["pin"] = bool(self.cfg.ble_pin)
        data["last"] = self._last_result
        return json.dumps(data, separators=(",", ":")).encode()

    def _read_status(self, options):
        return self._slice(self._status_payload(), options)

    def _read_networks(self, options):
        networks = [{"s": n["ssid"], "q": n["signal"], "l": n["secure"]} for n in self.wifi.scan()[:12]]
        return self._slice(json.dumps(networks, separators=(",", ":")).encode(), options)

    def _on_command_chunk(self, value, options):
        chunk = bytes(value)
        if chunk[:1] == bytes([STX]):
            self._buffer = bytearray(chunk[1:])
        else:
            self._buffer.extend(chunk)
        if len(self._buffer) > 2048:  # garbage protection
            self._buffer.clear()
            return
        if NEWLINE in self._buffer:
            raw, _, _ = bytes(self._buffer).partition(bytes([NEWLINE]))
            self._buffer.clear()
            # Never run slow work on the BlueZ main loop.
            threading.Thread(target=self._handle_message, args=(raw,), daemon=True).start()

    def _handle_message(self, raw):
        try:
            message = json.loads(raw.decode("utf-8"))
        except ValueError:
            self._last_result = {"cmd": "?", "ok": False, "error": "Malformed message", "at": time.time()}
            return
        cmd = message.get("cmd")
        if self.cfg.ble_pin and str(message.get("pin", "")) != self.cfg.ble_pin:
            self._last_result = {"cmd": cmd, "ok": False, "error": "Wrong pairing PIN", "at": time.time()}
            print("[ble] Rejected command with wrong PIN")
            return
        if cmd == "scan":
            self.wifi.scan(max_age=0)
            self._last_result = {"cmd": "scan", "ok": True, "at": time.time()}
        elif cmd == "wifi":
            ssid = str(message.get("ssid", "")).strip()
            if not ssid:
                self._last_result = {"cmd": "wifi", "ok": False, "error": "Network name is required", "at": time.time()}
                return
            backend = str(message.get("backend", "")).strip().rstrip("/")
            if backend.startswith(("http://", "https://")):
                self.on_backend_url(backend)
            print(f"[ble] Phone shared network '{ssid}'")
            self._last_result = {"cmd": "wifi", "ok": True, "at": time.time()}
            self.wifi.connect_async(ssid, str(message.get("password", "")))
        elif cmd == "backend":
            backend = str(message.get("backend", "")).strip().rstrip("/")
            if backend.startswith(("http://", "https://")):
                self.on_backend_url(backend)
            self._last_result = {"cmd": "backend", "ok": True, "at": time.time()}
        else:
            self._last_result = {"cmd": cmd, "ok": False, "error": "Unknown command", "at": time.time()}

    # --- lifecycle ----------------------------------------------------------
    def start(self):
        if not self.cfg.ble_enabled:
            self.error = "disabled by BLE_ENABLED=false"
            return
        try:
            from bluezero import adapter, peripheral
        except ImportError as error:
            self.error = f"bluezero not installed ({error})"
            print(f"[ble] Disabled: {self.error}")
            return

        def run():
            try:
                adapters = list(adapter.Adapter.available())
                if not adapters:
                    raise RuntimeError("no Bluetooth adapter found")
                dongle = adapters[0]
                if not dongle.powered:
                    dongle.powered = True
                device = peripheral.Peripheral(dongle.address, local_name=self.cfg.ble_name)
                device.add_service(srv_id=1, uuid=SERVICE_UUID, primary=True)
                device.add_characteristic(srv_id=1, chr_id=1, uuid=STATUS_UUID, value=[], notifying=False, flags=["read"], read_callback=self._read_status)
                device.add_characteristic(srv_id=1, chr_id=2, uuid=NETWORKS_UUID, value=[], notifying=False, flags=["read"], read_callback=self._read_networks)
                device.add_characteristic(srv_id=1, chr_id=3, uuid=COMMAND_UUID, value=[], notifying=False, flags=["write", "write-without-response"], write_callback=self._on_command_chunk)
                device.on_connect = lambda: print("[ble] Phone connected")
                device.on_disconnect = lambda: print("[ble] Phone disconnected")
                self.running = True
                print(f"[ble] Advertising as '{self.cfg.ble_name}'")
                device.publish()  # blocks running the GLib main loop
            except Exception as error:
                self.error = str(error)
                print(f"[ble] Provisioning stopped: {error}")
            finally:
                self.running = False

        threading.Thread(target=run, name="ble", daemon=True).start()
