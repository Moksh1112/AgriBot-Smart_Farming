#!/usr/bin/env python3
"""Local HTTP server for AgriBot's Raspberry Pi sensors.

It is deliberately a separate process from ps5.py, so motor control cannot
block a sensor read.  Read one sensor at a time while wiring it, then use
POST /sensors/publish to send a complete reading to the AgriBot backend.
"""

import json
import os
import threading
import time
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

try:
    import adafruit_dht
    import board
    from gpiozero import DigitalInputDevice, MCP3008
except ImportError as error:
    raise SystemExit(
        "Missing Pi sensor packages. Run: pip3 install -r requirements-sensors.txt"
    ) from error


HOST = os.getenv("SENSOR_SERVER_HOST", "0.0.0.0")
PORT = int(os.getenv("SENSOR_SERVER_PORT", "8000"))
BACKEND_URL = os.getenv("AGRIBOT_BACKEND_URL", "").rstrip("/")
ROBOT_KEY = os.getenv("ROBOT_INGEST_KEY", "")
LATITUDE = float(os.getenv("ROBOT_LATITUDE", "0"))
LONGITUDE = float(os.getenv("ROBOT_LONGITUDE", "0"))

# BCM GPIO numbering. The MCP3008 channels are analog inputs, 0 through 7.
DHT_PIN = board.D24
SOIL_ADC_CHANNEL = int(os.getenv("SOIL_ADC_CHANNEL", "0"))
RAIN_DO_PIN = int(os.getenv("RAIN_DO_PIN", "27"))
PH_ADC_CHANNEL = int(os.getenv("PH_ADC_CHANNEL", "2"))
# FC-37 comparator boards normally drive DO low when water is detected. Set
# RAIN_WET_DIGITAL_VALUE=1 in sensor.env if your module behaves oppositely.
RAIN_WET_DIGITAL_VALUE = int(os.getenv("RAIN_WET_DIGITAL_VALUE", "0"))

# Calibrate these with the manual endpoints before relying on percentages.
# gpiozero's MCP3008.value is 0.0 to 1.0; many capacitive probes read lower
# in wet soil, hence dry is normally larger than wet.
SOIL_DRY_VALUE = float(os.getenv("SOIL_DRY_VALUE", "0.75"))
SOIL_WET_VALUE = float(os.getenv("SOIL_WET_VALUE", "0.35"))
PUBLISH_INTERVAL_SECONDS = int(os.getenv("PUBLISH_INTERVAL_SECONDS", "30"))


def env_flag(name, default):
    return os.getenv(name, default).strip().lower() in {"1", "true", "yes", "on"}


# These are intentional demo values until the analog probes are wired and
# calibrated. DHT22 and FC-37 always read their connected hardware.
USE_FAKE_SOIL_MOISTURE = env_flag("USE_FAKE_SOIL_MOISTURE", "true")
FAKE_SOIL_MOISTURE = float(os.getenv("FAKE_SOIL_MOISTURE", "48"))
USE_FAKE_PH = env_flag("USE_FAKE_PH", "true")
FAKE_PH = float(os.getenv("FAKE_PH", "6.8"))
AUTO_PUBLISH_ENABLED = env_flag("AUTO_PUBLISH_ENABLED", "true")

dht = adafruit_dht.DHT22(DHT_PIN, use_pulseio=False)
soil_adc = None if USE_FAKE_SOIL_MOISTURE else MCP3008(channel=SOIL_ADC_CHANNEL)
rain_do = DigitalInputDevice(RAIN_DO_PIN, pull_up=False)
sensor_lock = threading.Lock()


def clamp(value, minimum=0.0, maximum=100.0):
    return max(minimum, min(value, maximum))


def scaled_percent(raw_value, dry_value, wet_value):
    if dry_value == wet_value:
        raise ValueError("Dry and wet calibration values must differ.")
    return round(clamp((raw_value - dry_value) * 100 / (wet_value - dry_value)), 1)


def read_soil_moisture():
    if USE_FAKE_SOIL_MOISTURE:
        return {"raw": None, "percent": round(clamp(FAKE_SOIL_MOISTURE), 1), "source": "simulated"}
    raw = soil_adc.value
    return {"raw": round(raw, 4), "percent": scaled_percent(raw, SOIL_DRY_VALUE, SOIL_WET_VALUE), "source": "hardware"}


def read_rainfall():
    digital_value = int(rain_do.value)
    is_wet = digital_value == RAIN_WET_DIGITAL_VALUE
    return {
        "digital": digital_value,
        "isWet": is_wet,
        # The backend retains a numeric field. 100 means rain detected; 0 dry.
        "percent": 100 if is_wet else 0,
    }


def read_dht22():
    # DHT22 reads occasionally fail; a retry makes manual testing less noisy.
    last_error = None
    for _ in range(3):
        try:
            return {"temperatureC": round(float(dht.temperature), 1), "humidity": round(float(dht.humidity), 1)}
        except RuntimeError as error:
            last_error = error
            time.sleep(2)
    raise RuntimeError(f"DHT22 did not return a reading: {last_error}")


def read_sensor(sensor_name):
    readers = {
        "soil-moisture": read_soil_moisture,
        "dht22": read_dht22,
        "rainfall": read_rainfall,
        "ph": read_ph,
    }
    if sensor_name not in readers:
        raise KeyError("Unknown sensor. Use soil-moisture, dht22, rainfall, or ph.")
    with sensor_lock:
        reading = readers[sensor_name]()
    return {"sensor": sensor_name, "reading": reading, "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}


def read_ph():
    if USE_FAKE_PH:
        return {"value": round(FAKE_PH, 2), "source": "simulated"}
    return {"value": None, "status": f"future stub; reserve MCP3008 CH{PH_ADC_CHANNEL} for the pH probe"}


def read_all():
    with sensor_lock:
        soil = read_soil_moisture()
        climate = read_dht22()
        rain = read_rainfall()
        ph = read_ph()
    return {
        "sensors": {
            "soilMoisture": soil["percent"],
            "temperature": climate["temperatureC"],
            "humidity": climate["humidity"],
            "rainfall": rain["percent"],
            "ph": ph["value"],
        },
        "raw": {"soilMoisture": soil["raw"], "rainfallDigital": rain["digital"]},
        "sources": {"soilMoisture": soil["source"], "dht22": "hardware", "rainfall": "hardware", "ph": ph.get("source", "future stub")},
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }


def publish_reading():
    if not BACKEND_URL or not ROBOT_KEY:
        raise RuntimeError("Set AGRIBOT_BACKEND_URL and ROBOT_INGEST_KEY before publishing.")
    reading = read_all()
    payload = {
        "sensors": reading["sensors"],
        "robot": {"status": "online"},
        "location": {"latitude": LATITUDE, "longitude": LONGITUDE},
    }
    request = urllib.request.Request(
        f"{BACKEND_URL}/api/robot/data",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "x-robot-key": ROBOT_KEY},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=10) as response:
        return {"published": True, "backendStatus": response.status, "reading": reading}


class SensorRequestHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        print(f"{self.client_address[0]} - {format % args}")

    def send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def handle_request(self):
        try:
            if self.path == "/health":
                self.send_json(200, {"success": True, "service": "agribot-pi-sensors"})
            elif self.path == "/sensors":
                self.send_json(200, {"success": True, "data": read_all()})
            elif self.path.startswith("/sensors/") and self.command == "GET":
                self.send_json(200, {"success": True, "data": read_sensor(self.path.rsplit("/", 1)[-1])})
            elif self.path == "/sensors/publish" and self.command == "POST":
                self.send_json(200, {"success": True, "data": publish_reading()})
            else:
                self.send_json(404, {"success": False, "message": "Endpoint not found."})
        except KeyError as error:
            self.send_json(404, {"success": False, "message": str(error)})
        except (RuntimeError, ValueError, urllib.error.URLError) as error:
            self.send_json(503, {"success": False, "message": str(error)})
        except Exception as error:
            print(f"Sensor server error: {error}")
            self.send_json(500, {"success": False, "message": "Unexpected sensor error."})

    def do_GET(self):
        self.handle_request()

    def do_POST(self):
        self.handle_request()


def publish_forever(stop_event):
    while not stop_event.is_set():
        try:
            result = publish_reading()
            print(f"Dashboard updated (HTTP {result['backendStatus']}).")
        except Exception as error:
            print(f"Dashboard publish failed; retrying later: {error}")
        stop_event.wait(PUBLISH_INTERVAL_SECONDS)


def main():
    server = ThreadingHTTPServer((HOST, PORT), SensorRequestHandler)
    print(f"AgriBot Pi sensor server listening at http://{HOST}:{PORT}")
    stop_event = threading.Event()
    publisher = None
    if AUTO_PUBLISH_ENABLED:
        publisher = threading.Thread(target=publish_forever, args=(stop_event,), daemon=True)
        publisher.start()
        print(f"Automatic dashboard publishing enabled every {PUBLISH_INTERVAL_SECONDS} seconds.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping Pi sensor server...")
    finally:
        stop_event.set()
        if publisher:
            publisher.join(timeout=2)
        server.server_close()
        dht.exit()
        if soil_adc:
            soil_adc.close()
        rain_do.close()


if __name__ == "__main__":
    main()
