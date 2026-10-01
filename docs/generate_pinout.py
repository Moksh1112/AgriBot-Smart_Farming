#!/usr/bin/env python3
"""Generates docs/pi-pinout.svg and the 40-pin table in docs/PINOUT.md.

Edit PINS below when wiring changes, then run:  python3 docs/generate_pinout.py
Sensor pins must match pi/agribot.env.example (DHT_PIN, RAIN_DO_PIN, SPI).
"""

from html import escape
from pathlib import Path

DOCS = Path(__file__).resolve().parent

# group -> (fill, text colour, legend label)
GROUPS = {
    "3v3": ("#F59E0B", "#111", "3.3 V power"),
    "5v": ("#DC2626", "#fff", "5 V power"),
    "gnd": ("#1F2937", "#fff", "Ground"),
    "spi": ("#2563EB", "#fff", "MCP3008 ADC (SPI0)"),
    "dht": ("#16A34A", "#fff", "DHT22 temp/humidity"),
    "rain": ("#0D9488", "#fff", "FC-37 rain sensor"),
    "motor": ("#7C3AED", "#fff", "Motor driver (L298N)"),
    "reserved": ("#D1D5DB", "#111", "Reserved, do not use"),
    "free": ("#FFFFFF", "#111", "Free GPIO"),
}

# physical pin -> (pin name, group, what it connects to)
PINS = {
    1: ("3V3", "3v3", "MCP3008 VDD + VREF, soil probe VCC"),
    2: ("5V", "5v", "Pi 5 power in (5 V / 5 A buck converter)"),
    3: ("GPIO2 / SDA", "reserved", "I2C (keep free for future sensors)"),
    4: ("5V", "5v", "Pi power in"),
    5: ("GPIO3 / SCL", "reserved", "I2C (keep free for future sensors)"),
    6: ("GND", "gnd", "MCP3008 AGND + DGND, sensor grounds"),
    7: ("GPIO4", "free", ""),
    8: ("GPIO14 / TXD", "reserved", "UART (GPS module later)"),
    9: ("GND", "gnd", "FC-37 GND"),
    10: ("GPIO15 / RXD", "reserved", "UART (GPS module later)"),
    11: ("GPIO17", "free", ""),
    12: ("GPIO18", "free", "Spare hardware PWM"),
    13: ("GPIO27", "rain", "FC-37 DO (wet = LOW)"),
    14: ("GND", "gnd", "DHT22 GND"),
    15: ("GPIO22", "free", ""),
    16: ("GPIO23", "free", ""),
    17: ("3V3", "3v3", "DHT22 VCC, FC-37 VCC"),
    18: ("GPIO24", "dht", "DHT22 DATA (+4.7-10 kΩ pull-up to 3V3)"),
    19: ("GPIO10 / MOSI", "spi", "MCP3008 DIN"),
    20: ("GND", "gnd", ""),
    21: ("GPIO9 / MISO", "spi", "MCP3008 DOUT"),
    22: ("GPIO25", "free", ""),
    23: ("GPIO11 / SCLK", "spi", "MCP3008 CLK"),
    24: ("GPIO8 / CE0", "spi", "MCP3008 CS/SHDN"),
    25: ("GND", "gnd", ""),
    26: ("GPIO7 / CE1", "reserved", "SPI CE1 (second ADC later)"),
    27: ("ID_SD", "reserved", "HAT EEPROM, never use"),
    28: ("ID_SC", "reserved", "HAT EEPROM, never use"),
    29: ("GPIO5", "motor", "L298N IN1 (left motors)"),
    30: ("GND", "gnd", ""),
    31: ("GPIO6", "motor", "L298N IN2 (left motors)"),
    32: ("GPIO12 / PWM0", "motor", "L298N ENA (left speed)"),
    33: ("GPIO13 / PWM1", "motor", "L298N ENB (right speed)"),
    34: ("GND", "gnd", ""),
    35: ("GPIO19", "free", ""),
    36: ("GPIO16", "motor", "L298N IN3 (right motors)"),
    37: ("GPIO26", "motor", "L298N IN4 (right motors)"),
    38: ("GPIO20", "free", ""),
    39: ("GND", "gnd", "L298N GND (common ground, required)"),
    40: ("GPIO21", "free", ""),
}


def build_svg():
    row_h, top, width = 30, 96, 1180
    cx_odd, cx_even = 560, 620  # pin centres
    rows = []
    for row in range(20):
        y = top + row * row_h
        for pin, cx, side in ((row * 2 + 1, cx_odd, "left"), (row * 2 + 2, cx_even, "right")):
            name, group, use = PINS[pin]
            fill, fg, _ = GROUPS[group]
            shape = f'<rect x="{cx - 12}" y="{y - 12}" width="24" height="24" rx="4"' if pin == 1 else f'<circle cx="{cx}" cy="{y}" r="12"'
            rows.append(f'{shape} fill="{fill}" stroke="#111" stroke-width="1.5"/>')
            rows.append(f'<text x="{cx}" y="{y + 4}" font-size="11" font-weight="700" text-anchor="middle" fill="{fg}">{pin}</text>')
            label_fill = fill if group != "free" else "#F3F4F6"
            if side == "left":
                rows.append(f'<rect x="{cx - 170}" y="{y - 11}" width="140" height="22" rx="11" fill="{label_fill}" stroke="#111" stroke-opacity="0.15"/>')
                rows.append(f'<text x="{cx - 100}" y="{y + 4}" font-size="12" font-weight="700" text-anchor="middle" fill="{fg if group != "free" else "#111"}">{escape(name)}</text>')
                if use:
                    rows.append(f'<text x="{cx - 182}" y="{y + 4}" font-size="12" text-anchor="end" fill="#374151">{escape(use)}</text>')
            else:
                rows.append(f'<rect x="{cx + 30}" y="{y - 11}" width="140" height="22" rx="11" fill="{label_fill}" stroke="#111" stroke-opacity="0.15"/>')
                rows.append(f'<text x="{cx + 100}" y="{y + 4}" font-size="12" font-weight="700" text-anchor="middle" fill="{fg if group != "free" else "#111"}">{escape(name)}</text>')
                if use:
                    rows.append(f'<text x="{cx + 182}" y="{y + 4}" font-size="12" fill="#374151">{escape(use)}</text>')

    legend, lx, ly = [], 40, top + 20 * row_h + 20
    for i, (fill, _, label) in enumerate(GROUPS.values()):
        x = lx + (i % 5) * 225
        y = ly + (i // 5) * 28
        legend.append(f'<rect x="{x}" y="{y - 11}" width="18" height="18" rx="4" fill="{fill}" stroke="#111" stroke-width="1"/>')
        legend.append(f'<text x="{x + 26}" y="{y + 3}" font-size="13" fill="#111">{escape(label)}</text>')

    height = ly + 70
    header_box = f'<rect x="{cx_odd - 24}" y="{top - 24}" width="{cx_even - cx_odd + 48}" height="{20 * row_h + 18}" rx="8" fill="#1F2937" opacity="0.08"/>'
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}" font-family="Helvetica, Arial, sans-serif" role="img" aria-label="AgriBot Raspberry Pi 40-pin wiring">
<rect width="{width}" height="{height}" rx="16" fill="#FFFFFF"/>
<text x="40" y="44" font-size="24" font-weight="800" fill="#123B29">AgriBot Raspberry Pi wiring (40-pin header, BCM numbering)</text>
<text x="40" y="68" font-size="13" fill="#4B5563">Pin 1 (square) is the corner nearest the SD card. Odd pins on the left, even pins on the right. Generated by docs/generate_pinout.py</text>
{header_box}
{"".join(rows)}
{"".join(legend)}
</svg>
'''


def build_table():
    lines = ["| Pin | Name | Connects to | | Pin | Name | Connects to |", "|---:|---|---|---|---:|---|---|"]
    for row in range(20):
        a, b = row * 2 + 1, row * 2 + 2
        na, _, ua = PINS[a]
        nb, _, ub = PINS[b]
        lines.append(f"| {a} | {na} | {ua or '—'} | | {b} | {nb} | {ub or '—'} |")
    return "\n".join(lines)


def main():
    (DOCS / "pi-pinout.svg").write_text(build_svg())
    md_path = DOCS / "PINOUT.md"
    start, end = "<!-- PIN-TABLE:START -->", "<!-- PIN-TABLE:END -->"
    md = md_path.read_text()
    head, rest = md.split(start, 1)
    _, tail = rest.split(end, 1)
    md_path.write_text(f"{head}{start}\n{build_table()}\n{end}{tail}")
    print("Wrote docs/pi-pinout.svg and updated docs/PINOUT.md")


if __name__ == "__main__":
    main()
