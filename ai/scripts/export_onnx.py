#!/usr/bin/env python3
"""Export the trained YOLO weights to ONNX for the Raspberry Pi service.

The Pi runs the model with ONNX Runtime only (no PyTorch), which is far
lighter. Run from the ai/ directory with the venv active:

    python scripts/export_onnx.py                  # models/weights/best.pt -> best.onnx
    python scripts/export_onnx.py path/to/best.pt --imgsz 640

Then copy the .onnx file to the same path on the Pi
(AgriBot-Smart_Farming/ai/models/weights/best.onnx).
"""

import argparse
from pathlib import Path

from ultralytics import YOLO

AI_ROOT = Path(__file__).resolve().parent.parent


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("weights", nargs="?", default=str(AI_ROOT / "models" / "weights" / "best.pt"))
    parser.add_argument("--imgsz", type=int, default=640, help="Input size; must match training (default 640).")
    args = parser.parse_args()

    model = YOLO(args.weights)
    print(f"Classes: {model.names}")
    # Static shape + simplify keeps the graph small and fast on the Pi CPU.
    output = model.export(format="onnx", imgsz=args.imgsz, simplify=True, dynamic=False)
    print(f"\nExported: {output}\nCopy it to the Pi at ai/models/weights/best.onnx")


if __name__ == "__main__":
    main()
