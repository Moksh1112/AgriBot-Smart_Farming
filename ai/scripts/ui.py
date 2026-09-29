#!/usr/bin/env python3
"""
AgriBot — Tomato Leaf Disease Testing UI
=========================================
A local Gradio web interface for testing the trained YOLO object-detection
model. Upload any image and get back the annotated image with bounding boxes
plus a structured detection table.

Run (from the ai/ directory with the venv activated):
    python scripts/ui.py
Then open http://localhost:7860 in your browser.
"""

import os
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Load model.env
# ---------------------------------------------------------------------------
try:
    from dotenv import load_dotenv
    _env_path = Path(__file__).resolve().parent.parent / "model.env"
    if _env_path.exists():
        load_dotenv(_env_path)
except ImportError:
    pass

# ---------------------------------------------------------------------------
# Validate dependencies
# ---------------------------------------------------------------------------
try:
    from ultralytics import YOLO
except ImportError:
    sys.exit("[ERROR] ultralytics not installed. Run: pip install -r requirements.txt")

try:
    import gradio as gr
except ImportError:
    sys.exit("[ERROR] gradio not installed. Run: pip install gradio")

import numpy as np

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
_ai_root = Path(__file__).resolve().parent.parent

MODEL_WEIGHTS_PATH = os.getenv("MODEL_WEIGHTS_PATH", "models/weights/best.pt")
DEFAULT_CONF = float(os.getenv("CONFIDENCE_THRESHOLD", "0.25"))
DEFAULT_IOU  = float(os.getenv("IOU_THRESHOLD", "0.45"))

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

CLASS_COLORS = {
    "Healthy":               "#22c55e",
    "Bacterial Spot":        "#f97316",
    "Early Blight":          "#eab308",
    "Late Blight":           "#ef4444",
    "Yellow Leaf Curl Virus":"#a855f7",
}

# ---------------------------------------------------------------------------
# Model — loaded once at startup
# ---------------------------------------------------------------------------
if not _weights.exists():
    sys.exit(
        f"[ERROR] Weights not found at {_weights}\n"
        "Place your .pt file in ai/models/weights/ and update model.env."
    )

print(f"[AgriBot UI] Loading model: {_weights.name}")
model = YOLO(str(_weights))
print("[AgriBot UI] Model ready.")

# ---------------------------------------------------------------------------
# Inference function
# ---------------------------------------------------------------------------
def run_inference(image: np.ndarray, conf: float, iou: float):
    """Called by Gradio on every submission."""
    if image is None:
        return None, "No image provided.", ""

    results = model.predict(
        source=image,
        conf=conf,
        iou=iou,
        save=False,
        verbose=False,
    )

    # Annotated image (numpy RGB array — Gradio displays it directly)
    annotated = results[0].plot()  # BGR by default from YOLO
    annotated_rgb = annotated[:, :, ::-1]  # convert to RGB

    boxes = results[0].boxes
    h, w = results[0].orig_shape

    if boxes is None or len(boxes) == 0:
        summary = "✅ No detections above confidence threshold."
        table_md = ""
        return annotated_rgb, summary, table_md

    rows = []
    for box in boxes:
        cls_id   = int(box.cls[0])
        conf_val = float(box.conf[0])
        x1, y1, x2, y2 = (int(v) for v in box.xyxy[0])
        cls_name = CLASS_NAMES.get(cls_id, f"class_{cls_id}")
        color    = CLASS_COLORS.get(cls_name, "#ffffff")
        badge    = f'<span style="background:{color};color:#000;padding:2px 8px;border-radius:4px;font-weight:600">{cls_name}</span>'
        rows.append((badge, f"{conf_val:.1%}", f"({x1}, {y1}) → ({x2}, {y2})"))

    # Sort by confidence descending
    rows.sort(key=lambda r: r[1], reverse=True)

    summary = f"🔍 **{len(rows)} detection{'s' if len(rows) != 1 else ''}** found in a {w}×{h} image."

    # Markdown table
    table_md = "| # | Class | Confidence | Bounding Box |\n"
    table_md += "|---|---|---|---|\n"
    for i, (badge, conf_str, bbox) in enumerate(rows):
        table_md += f"| {i} | {badge} | **{conf_str}** | `{bbox}` |\n"

    return annotated_rgb, summary, table_md


# ---------------------------------------------------------------------------
# Gradio UI
# ---------------------------------------------------------------------------
_css = """
body { font-family: 'Inter', sans-serif; }
#title { text-align: center; margin-bottom: 0.25em; }
#subtitle { text-align: center; color: #6b7280; margin-top: 0; }
.gr-button-primary { background: #16a34a !important; border-color: #16a34a !important; }
footer { display: none !important; }
"""

with gr.Blocks(title="AgriBot — Leaf Disease Detector") as demo:

    gr.HTML(f"""
        <h1 id="title">🌿 AgriBot Leaf Disease Detector</h1>
        <p id="subtitle">YOLO model · {_weights.name} · {len(CLASS_NAMES)} classes</p>
    """)

    with gr.Row():
        # ---- Left column: input ----
        with gr.Column(scale=1):
            image_input = gr.Image(
                label="Upload Tomato Leaf Image",
                type="numpy",
                sources=["upload", "clipboard"],
                height=380,
            )

            with gr.Accordion("⚙️ Inference Settings", open=False):
                conf_slider = gr.Slider(
                    minimum=0.05, maximum=0.95, value=DEFAULT_CONF, step=0.05,
                    label=f"Confidence Threshold  (default {DEFAULT_CONF})",
                )
                iou_slider = gr.Slider(
                    minimum=0.1, maximum=0.9, value=DEFAULT_IOU, step=0.05,
                    label=f"IoU Threshold  (default {DEFAULT_IOU})",
                )

            run_btn = gr.Button("🔍 Run Inference", variant="primary", size="lg")

        # ---- Right column: output ----
        with gr.Column(scale=1):
            image_output = gr.Image(
                label="Annotated Output",
                type="numpy",
                height=380,
                interactive=False,
            )

    summary_md = gr.Markdown(value="", label="")

    results_table = gr.Markdown(
        value="",
        label="Detections",
    )

    # ---- Class legend ----
    with gr.Accordion("📋 Class Reference", open=False):
        legend_html = "<div style='display:flex;gap:12px;flex-wrap:wrap;padding:8px'>"
        for name, color in CLASS_COLORS.items():
            legend_html += (
                f"<span style='background:{color};color:#000;padding:4px 14px;"
                f"border-radius:6px;font-weight:600;font-size:0.9em'>{name}</span>"
            )
        legend_html += "</div>"
        gr.HTML(legend_html)

    # ---- Wire up ----
    run_btn.click(
        fn=run_inference,
        inputs=[image_input, conf_slider, iou_slider],
        outputs=[image_output, summary_md, results_table],
    )

    # Also run when image is uploaded (optional convenience)
    image_input.upload(
        fn=run_inference,
        inputs=[image_input, conf_slider, iou_slider],
        outputs=[image_output, summary_md, results_table],
    )


# ---------------------------------------------------------------------------
# Launch
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    print("\n[AgriBot UI] Starting at http://localhost:7860\n")
    demo.launch(
        server_name="localhost",
        server_port=7860,
        inbrowser=True,
        show_error=True,
        theme=gr.themes.Soft(primary_hue="green", neutral_hue="slate"),
        css=_css,
    )
