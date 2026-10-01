"""Sensor reads for DHT22, FC-37 rain module and MCP3008 analog probes.

When the GPIO libraries are missing (e.g. running on a laptop) and
SIMULATE_SENSORS=auto, readings come from a gentle random walk instead so
the rest of the service can still be exercised end to end.
"""

import random
import threading
import time


def _now():
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def _clamp(value, low=0.0, high=100.0):
    return max(low, min(value, high))


class SensorHub:
    def __init__(self, config):
        self.cfg = config
        self._lock = threading.Lock()
        self.simulated = config.simulate_sensors == "true"
        self.error = None
        self._dht = self._soil_adc = self._rain = None
        self._walk = {"soil": config.fake_soil, "temp": 27.0, "hum": 62.0}

        if not self.simulated:
            try:
                self._open_hardware()
            except Exception as error:  # ImportError, GPIO errors, missing SPI...
                if config.simulate_sensors == "false":
                    raise
                self.simulated = True
                self.error = f"hardware unavailable ({error}); using simulated readings"
                print(f"[sensors] {self.error}")

    def _open_hardware(self):
        import adafruit_dht
        import board
        from gpiozero import DigitalInputDevice, MCP3008

        self._dht = adafruit_dht.DHT22(getattr(board, f"D{self.cfg.dht_pin}"), use_pulseio=False)
        self._rain = DigitalInputDevice(self.cfg.rain_do_pin, pull_up=False)
        if not self.cfg.use_fake_soil:
            self._soil_adc = MCP3008(channel=self.cfg.soil_adc_channel)

    @property
    def mode(self):
        return "simulated" if self.simulated else "hardware"

    # --- individual sensors -------------------------------------------------
    def _drift(self, key, step, low, high):
        self._walk[key] = _clamp(self._walk[key] + random.uniform(-step, step), low, high)
        return round(self._walk[key], 1)

    def read_soil(self):
        if self.cfg.use_fake_soil or self.simulated:
            value = self._drift("soil", 1.2, 20, 85) if self.simulated else _clamp(self.cfg.fake_soil)
            return {"percent": round(value, 1), "raw": None, "source": "simulated"}
        raw = self._soil_adc.value
        dry, wet = self.cfg.soil_dry_value, self.cfg.soil_wet_value
        if dry == wet:
            raise ValueError("SOIL_DRY_VALUE and SOIL_WET_VALUE must differ.")
        percent = round(_clamp((raw - dry) * 100 / (wet - dry)), 1)
        return {"percent": percent, "raw": round(raw, 4), "source": "hardware"}

    def read_dht22(self):
        if self.simulated:
            return {"temperatureC": self._drift("temp", 0.4, 18, 38), "humidity": self._drift("hum", 1.5, 35, 95), "source": "simulated"}
        last_error = None
        for _ in range(3):  # DHT22 reads fail occasionally; retry a few times.
            try:
                return {"temperatureC": round(float(self._dht.temperature), 1), "humidity": round(float(self._dht.humidity), 1), "source": "hardware"}
            except (RuntimeError, TypeError) as error:
                last_error = error
                time.sleep(2)
        raise RuntimeError(f"DHT22 did not return a reading: {last_error}")

    def read_rain(self):
        if self.simulated:
            return {"isWet": False, "digital": None, "percent": 0, "source": "simulated"}
        digital = int(self._rain.value)
        wet = digital == self.cfg.rain_wet_value
        return {"isWet": wet, "digital": digital, "percent": 100 if wet else 0, "source": "hardware"}

    def read_ph(self):
        if self.cfg.use_fake_ph or self.simulated:
            return {"value": round(self.cfg.fake_ph, 2), "source": "simulated"}
        return {"value": None, "source": f"not wired (reserved MCP3008 CH{self.cfg.ph_adc_channel})"}

    # --- public API ---------------------------------------------------------
    def read_one(self, name):
        readers = {"soil-moisture": self.read_soil, "dht22": self.read_dht22, "rainfall": self.read_rain, "ph": self.read_ph}
        if name not in readers:
            raise KeyError("Unknown sensor. Use soil-moisture, dht22, rainfall or ph.")
        with self._lock:
            return {"sensor": name, "reading": readers[name](), "timestamp": _now()}

    def read_all(self):
        with self._lock:
            soil, climate, rain, ph = self.read_soil(), self.read_dht22(), self.read_rain(), self.read_ph()
        return {
            "sensors": {
                "soilMoisture": soil["percent"],
                "temperature": climate["temperatureC"],
                "humidity": climate["humidity"],
                "rainfall": rain["percent"],
                "ph": ph["value"],
            },
            "sources": {"soilMoisture": soil["source"], "dht22": climate["source"], "rainfall": rain["source"], "ph": ph["source"]},
            "timestamp": _now(),
        }

    def close(self):
        for device in (self._dht and getattr(self._dht, "exit", None), self._soil_adc and self._soil_adc.close, self._rain and self._rain.close):
            if device:
                try:
                    device()
                except Exception:
                    pass
