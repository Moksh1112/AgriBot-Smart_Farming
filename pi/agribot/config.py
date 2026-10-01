"""Configuration loaded once from environment variables (see agribot.env.example)."""

import os
from dataclasses import dataclass
from pathlib import Path

PI_ROOT = Path(__file__).resolve().parent.parent
REPO_ROOT = PI_ROOT.parent


def _env(name, default=""):
    return os.getenv(name, default).strip()


def _flag(name, default):
    return _env(name, default).lower() in {"1", "true", "yes", "on"}


def _float(name, default):
    return float(_env(name, str(default)))


def _int(name, default):
    return int(_env(name, str(default)))


def _path(name, default):
    path = Path(_env(name, default)).expanduser()
    return path if path.is_absolute() else (PI_ROOT / path).resolve()


def _unquote(value):
    """Strip one pair of matching quotes; everything else is kept literally."""
    if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
        return value[1:-1]
    return value


def load_env_file(path):
    """Read KEY=VALUE lines literally (no $ expansion or escapes), so secrets
    may contain any characters. Real environment variables take precedence."""
    if not path.exists():
        return False
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), _unquote(value.strip()))
    return True


def env_file_candidates():
    explicit = os.getenv("AGRIBOT_ENV_FILE")
    return [Path(explicit)] if explicit else [Path("/etc/agribot.env"), PI_ROOT / "agribot.env"]


@dataclass(frozen=True)
class Config:
    # Local HTTP API (diagnostics and manual tests).
    host: str
    port: int
    # Backend connection.
    backend_url: str
    robot_key: str
    latitude: float
    longitude: float
    publish_interval: int
    heartbeat_interval: int
    state_file: Path
    # Sensors.
    simulate_sensors: str  # auto | true | false
    dht_pin: int
    soil_adc_channel: int
    rain_do_pin: int
    rain_wet_value: int
    ph_adc_channel: int
    soil_dry_value: float
    soil_wet_value: float
    use_fake_soil: bool
    fake_soil: float
    use_fake_ph: bool
    fake_ph: float
    # Vision.
    model_path: Path
    confidence: float
    iou: float
    camera: str  # auto | picamera | usb | none
    camera_index: int
    camera_width: int
    camera_height: int
    auto_scan_interval: int
    # Bluetooth provisioning.
    ble_enabled: bool
    ble_name: str
    ble_pin: str
    wifi_interface: str


def load_config():
    for candidate in env_file_candidates():
        if load_env_file(candidate):
            print(f"[config] Loaded {candidate}")
            break
    return Config(
        host=_env("AGRIBOT_HOST", "0.0.0.0"),
        port=_int("AGRIBOT_PORT", 8000),
        backend_url=_env("AGRIBOT_BACKEND_URL").rstrip("/"),
        robot_key=_env("ROBOT_INGEST_KEY"),
        latitude=_float("ROBOT_LATITUDE", 19.047838),
        longitude=_float("ROBOT_LONGITUDE", 72.872712),
        publish_interval=_int("PUBLISH_INTERVAL_SECONDS", 30),
        heartbeat_interval=_int("HEARTBEAT_SECONDS", 3),
        state_file=_path("STATE_FILE", "state.json"),
        simulate_sensors=_env("SIMULATE_SENSORS", "auto").lower(),
        dht_pin=_int("DHT_PIN", 24),
        soil_adc_channel=_int("SOIL_ADC_CHANNEL", 0),
        rain_do_pin=_int("RAIN_DO_PIN", 27),
        rain_wet_value=_int("RAIN_WET_DIGITAL_VALUE", 0),
        ph_adc_channel=_int("PH_ADC_CHANNEL", 2),
        soil_dry_value=_float("SOIL_DRY_VALUE", 0.75),
        soil_wet_value=_float("SOIL_WET_VALUE", 0.35),
        use_fake_soil=_flag("USE_FAKE_SOIL_MOISTURE", "true"),
        fake_soil=_float("FAKE_SOIL_MOISTURE", 48),
        use_fake_ph=_flag("USE_FAKE_PH", "true"),
        fake_ph=_float("FAKE_PH", 6.8),
        model_path=_path("MODEL_PATH", str(REPO_ROOT / "ai" / "models" / "weights" / "best.onnx")),
        confidence=_float("CONFIDENCE_THRESHOLD", 0.35),
        iou=_float("IOU_THRESHOLD", 0.45),
        camera=_env("CAMERA", "auto").lower(),
        camera_index=_int("CAMERA_INDEX", 0),
        camera_width=_int("CAMERA_WIDTH", 1280),
        camera_height=_int("CAMERA_HEIGHT", 960),
        auto_scan_interval=_int("AUTO_SCAN_INTERVAL_SECONDS", 0),
        ble_enabled=_flag("BLE_ENABLED", "true"),
        ble_name=_env("BLE_NAME", "AgriBot"),
        ble_pin=_env("BLE_PAIRING_PIN"),
        wifi_interface=_env("WIFI_INTERFACE", "wlan0"),
    )
