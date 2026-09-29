#!/usr/bin/env python3
"""
AgriBot — Tomato Leaf Disease Inference Script
===============================================
Runs a trained YOLO model against one or more images and reports every
detection (class, confidence, bounding box).  Annotated images are
optionally saved to ai/runs/detect/.

Usage (from the ai/ directory with the venv activated):
    python scripts/infer_image.py test_images/leaf.jpg
    python scripts/infer_image.py test_images/leaf.jpg --no-save
    python scripts/infer_image.py test_images/             # whole folder

Classes (as trained):
    0 — Healthy
    1 — Bacterial Spot
    2 — Early Blight
    3 — Late Blight
    4 — Yellow Leaf Curl Virus
"""

import argparse
import os
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Load config from model.env (created by copying model.env.example).
# Falls back to sensible defaults so the script still runs without the file.
# ---------------------------------------------------------------------------
try:
    from dotenv import load_dotenv

    _env_path = Path(__file__).resolve().parent.parent / "model.env"
    if _env_path.exists():
        load_dotenv(_env_path)
    else:
        print(
            "[WARNING] ai/model.env not found. "
            "Copy model.env.example to model.env and set MODEL_WEIGHTS_PATH."
        )
except ImportError:
    pass  # python-dotenv not installed yet — env vars must be set externally

# ---------------------------------------------------------------------------
# Validate that ultralytics is available before doing anything else.
# ---------------------------------------------------------------------------
try:
    from ultralytics import YOLO
except ImportError:
    sys.exit(
        "[ERROR] 'ultralytics' is not installed.\n"
        "Activate the virtual environment and run:  pip install -r requirements.txt"
    )

# ---------------------------------------------------------------------------
# Config — reads from environment (populated by model.env via dotenv).
# ---------------------------------------------------------------------------
_ai_root = Path(__file__).resolve().parent.parent  # …/AgriBot-Smart_Farming/ai

MODEL_WEIGHTS_PATH = os.getenv("MODEL_WEIGHTS_PATH", "models/weights/best.pt")
CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", "0.25"))
IOU_THRESHOLD = float(os.getenv("IOU_THRESHOLD", "0.45"))
MAX_DETECTIONS = int(os.getenv("MAX_DETECTIONS", "300"))
SAVE_OUTPUT = os.getenv("SAVE_OUTPUT", "true").strip().lower() in {"1", "true", "yes"}

# Resolve the weights path relative to ai/ so the script works from any cwd.
_weights = Path(MODEL_WEIGHTS_PATH)
if not _weights.is_absolute():
    _weights = _ai_root / _weights

CLASS_NAMES = {
    0: "Healthy",
    1: "Bacterial Spot",
    2: "Early Blight",
    3: "Late Blight",
    4: "Yellow Leaf Curl Virus",
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _check_weights() -> Path:
    """Abort early with a helpful message if the weights file is missing."""
    if not _weights.exists():
        sys.exit(
            f"[ERROR] Model weights not found at: {_weights}\n"
            f"  1. Copy your downloaded .pt file to:  ai/models/weights/\n"
            f"  2. Update MODEL_WEIGHTS_PATH in ai/model.env to match the filename."
        )
    return _weights


def _collect_images(inputs: list[str]) -> list[Path]:
    """Expand file/folder arguments into a flat list of image paths."""
    image_extensions = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tiff"}
    images: list[Path] = []
    for raw in inputs:
        p = Path(raw)
        if not p.exists():
            print(f"[WARNING] Path does not exist, skipping: {p}")
            continue
        if p.is_dir():
            found = [f for f in p.iterdir() if f.suffix.lower() in image_extensions]
            if not found:
                print(f"[WARNING] No images found in directory: {p}")
            images.extend(sorted(found))
        elif p.suffix.lower() in image_extensions:
            images.append(p)
        else:
            print(f"[WARNING] Unsupported file type, skipping: {p}")
    return images


def _print_results(image_path: Path, results) -> None:
    """Pretty-print every detection for one image."""
    boxes = results[0].boxes
    print(f"\n{'='*60}")
    print(f"  Image : {image_path.name}")
    print(f"  Model : {_weights.name}")
    print(f"  Size  : {results[0].orig_shape[1]}×{results[0].orig_shape[0]} px")
    print(f"{'='*60}")

    if boxes is None or len(boxes) == 0:
        print("  No detections above confidence threshold.\n")
        return

    print(f"  Detections: {len(boxes)}\n")
    print(f"  {'#':<4} {'Class':<26} {'Conf':>6}  {'Bounding Box (x1,y1,x2,y2)'}")
    print(f"  {'-'*70}")

    for i, box in enumerate(boxes):
        cls_id = int(box.cls[0])
        conf = float(box.conf[0])
        x1, y1, x2, y2 = (int(v) for v in box.xyxy[0])
        cls_name = CLASS_NAMES.get(cls_id, f"class_{cls_id}")
        print(f"  {i:<4} {cls_name:<26} {conf:>6.2%}  ({x1}, {y1}, {x2}, {y2})")

    print()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="AgriBot tomato leaf disease inference using a trained YOLO model.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "images",
        nargs="+",
        help="Image file(s) or folder(s) to run inference on.",
    )
    parser.add_argument(
        "--no-save",
        action="store_true",
        help="Skip saving annotated output images (overrides SAVE_OUTPUT in model.env).",
    )
    parser.add_argument(
        "--conf",
        type=float,
        default=None,
        help=f"Confidence threshold override (default: {CONFIDENCE_THRESHOLD}).",
    )
    parser.add_argument(
        "--iou",
        type=float,
        default=None,
        help=f"IoU threshold override (default: {IOU_THRESHOLD}).",
    )
    args = parser.parse_args()

    weights_path = _check_weights()
    images = _collect_images(args.images)

    if not images:
        sys.exit("[ERROR] No valid images found. Provide at least one image path.")

    save = SAVE_OUTPUT and not args.no_save
    conf = args.conf if args.conf is not None else CONFIDENCE_THRESHOLD
    iou = args.iou if args.iou is not None else IOU_THRESHOLD

    print(f"\n[AgriBot Inference]")
    print(f"  Weights    : {weights_path}")
    print(f"  Confidence : {conf}")
    print(f"  IoU        : {iou}")
    print(f"  Save output: {save}")
    print(f"  Images     : {len(images)}\n")

    # Load model once; run on each image individually for clear per-image output.
    model = YOLO(str(weights_path))

    save_dir = _ai_root / "runs" / "detect"

    for image_path in images:
        results = model.predict(
            source=str(image_path),
            conf=conf,
            iou=iou,
            max_det=MAX_DETECTIONS,
            save=save,
            project=str(save_dir),
            verbose=False,
        )
        _print_results(image_path, results)

    if save:
        print(f"[INFO] Annotated images saved to: {save_dir}")


if __name__ == "__main__":
    main()
