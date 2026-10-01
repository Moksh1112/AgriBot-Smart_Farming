"""Tiny JSON client for the AgriBot Express backend (robot-key authenticated)."""

import json
import urllib.error
import urllib.request

USER_AGENT = "AgriBot-Pi/2.0 (+https://github.com/Moksh1112/AgriBot-Smart_Farming)"


class BackendError(RuntimeError):
    pass


class BackendClient:
    def __init__(self, url_provider, robot_key):
        self._url_provider = url_provider
        self._key = robot_key

    @property
    def configured(self):
        return bool(self._url_provider() and self._key)

    def request(self, method, path, payload=None, timeout=10):
        base = self._url_provider()
        if not base or not self._key:
            raise BackendError("Set AGRIBOT_BACKEND_URL and ROBOT_INGEST_KEY (or share the network from the app).")
        body = json.dumps(payload).encode("utf-8") if payload is not None else None
        request = urllib.request.Request(
            f"{base}{path}",
            data=body,
            method=method,
            headers={"Content-Type": "application/json", "x-robot-key": self._key, "User-Agent": USER_AGENT},
        )
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                raw = response.read()
                return json.loads(raw) if raw else {}
        except urllib.error.HTTPError as error:
            try:
                message = json.loads(error.read()).get("message")
            except Exception:
                message = None
            raise BackendError(f"HTTP {error.code}: {message or error.reason}") from error
        except (urllib.error.URLError, TimeoutError, OSError) as error:
            raise BackendError(f"Backend unreachable: {getattr(error, 'reason', error)}") from error
