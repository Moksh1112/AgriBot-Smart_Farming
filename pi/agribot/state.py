"""Small JSON store for settings the phone sends over Bluetooth (backend URL)."""

import json
import threading


class StateStore:
    def __init__(self, path):
        self._path = path
        self._lock = threading.Lock()
        try:
            self._data = json.loads(path.read_text())
        except (OSError, ValueError):
            self._data = {}

    def get(self, key, default=None):
        with self._lock:
            return self._data.get(key, default)

    def set(self, key, value):
        with self._lock:
            self._data[key] = value
            try:
                self._path.parent.mkdir(parents=True, exist_ok=True)
                tmp = self._path.with_suffix(".tmp")
                tmp.write_text(json.dumps(self._data, indent=2))
                tmp.replace(self._path)
            except OSError as error:
                print(f"[state] Could not save {self._path}: {error}")
