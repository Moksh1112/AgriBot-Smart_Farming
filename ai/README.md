# AgriBot AI — Machine Learning Workspace

This directory is the isolated AI/ML component of the AgriBot Smart Farming project.
It does **not** modify the `backend`, `mobile-app`, or `pi` components.

---

## 👋 For Teammates — Start Here

> Just cloned the repo? Follow these steps in order. All commands are run from
> inside the `ai/` folder.

### Prerequisites

Make sure these are installed on your Windows machine before anything else:

- **Python 3.10+** → https://www.python.org/downloads/ *(tick "Add Python to PATH" during install)*
- **Git** → https://git-scm.com/download/win

Verify Python is working by opening PowerShell and running:

```powershell
python --version
```

You should see something like `Python 3.11.x`. If you get an error, Python is not
on your PATH — reinstall and tick the checkbox.

---

### Step 1 — Navigate into the `ai/` folder

After cloning the repo, open PowerShell and `cd` into the AI workspace:

```powershell
cd AgriBot-Smart_Farming\ai
```

---

### Step 2 — Allow PowerShell scripts (one-time, first time only)

Windows blocks unsigned scripts by default. Run this once:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Type `Y` and press Enter when prompted.

---

### Step 3 — Create a Python virtual environment

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

Your terminal prompt should now show `(venv)` at the start. **Keep this active
for all the steps below.** If you open a new terminal you need to run
`.\venv\Scripts\Activate.ps1` again.

---

### Step 4 — Install dependencies

```powershell
pip install -r requirements.txt
```

This installs PyTorch, Ultralytics YOLO, OpenCV, and Gradio. It will take a
couple of minutes the first time (PyTorch alone is ~120 MB).

---

### Step 5 — Get the model weights file ⚠️

> **The weights file is NOT included in the GitHub repo** (it is too large and
> is git-ignored). You need to get it separately.

Ask vyom to share `best.pt` with you, once you have it, copy it here:

```
AgriBot-Smart_Farming/
└── ai/
    └── models/
        └── weights/
            └── best.pt   ← put it here
```

---

### Step 6 — Create your local config file

```powershell
Copy-Item model.env.example model.env
```

The default config already points to `models/weights/best.pt` so if you named
the file `best.pt` you don't need to edit anything.

---

### Step 7 — Launch the testing UI

```powershell
python scripts/ui.py
```

A browser tab will open at **http://localhost:7860**. Upload any tomato leaf
image and the model will detect diseases in it.

To stop the UI press `Ctrl+C` in the terminal.

---

### Every time after the first

Next time you open a terminal you only need to do:

```powershell
cd AgriBot-Smart_Farming\ai
.\venv\Scripts\Activate.ps1
python scripts/ui.py
```

---

## Model

**Architecture:** YOLO26 Small (via Ultralytics, 640 px input)
**Task:** Tomato leaf disease object detection
**Trained on:** Roboflow tomato leaf disease dataset

### Classes

| ID | Class |
|----|-------|
| 0  | Bacterial Spot |
| 1  | Early Blight |
| 2  | Healthy |
| 3  | Late Blight |
| 4  | Yellow Leaf Curl Virus |

The scripts read these names from the weights file (`model.names`), so they
always match the trained order.

---

## Directory Structure

```
ai/
├── models/
│   └── weights/          ← Place your .pt weights file here (git-ignored)
├── dataset/              ← Roboflow exported dataset (git-ignored)
├── scripts/
│   ├── infer_image.py    ← CLI inference script
│   └── ui.py             ← Gradio testing UI
├── test_images/          ← Drop test images here (git-ignored)
├── runs/                 ← Annotated output images (git-ignored, auto-created)
├── venv/                 ← Python virtual environment (git-ignored, local only)
├── requirements.txt      ← Python dependencies
├── model.env.example     ← Config template
└── README.md             ← This file
```

---

## Running Inference (CLI)

Activate the virtual environment first, then run from the `ai/` directory:

```powershell
# Single image
python scripts/infer_image.py test_images\leaf.jpg

# Multiple images
python scripts/infer_image.py test_images\leaf1.jpg test_images\leaf2.jpg

# Entire folder
python scripts/infer_image.py test_images\

# Without saving annotated output
python scripts/infer_image.py test_images\leaf.jpg --no-save

# Override confidence threshold
python scripts/infer_image.py test_images\leaf.jpg --conf 0.4
```

### Example output

```
[AgriBot Inference]
  Weights    : best.pt
  Confidence : 0.25
  IoU        : 0.45
  Save output: True
  Images     : 1

============================================================
  Image : leaf.jpg
  Model : best.pt
  Size  : 640×480 px
============================================================
  Detections: 2

  #    Class                       Conf  Bounding Box (x1,y1,x2,y2)
  ----------------------------------------------------------------------
  0    Early Blight               87.34%  (42, 108, 310, 390)
  1    Healthy                    61.20%  (380, 90, 590, 420)

[INFO] Annotated images saved to: ai/runs/detect
```

---

## What is git-ignored

The following are local-only and will never be committed:

- `venv/` — Python virtual environment
- `model.env` — your local config with real paths
- `models/weights/*.pt` — trained model weight files
- `dataset/` — Roboflow exported dataset
- `test_images/` — local test images
- `runs/` — annotated inference outputs
- `__pycache__/`

---

## Roadmap

- [x] Stage 1 — Local image inference
- [x] Stage 1b — Local testing UI (Gradio)
- [ ] Stage 2 — Live webcam inference
- [x] Stage 3 — Raspberry Pi camera inference (ONNX Runtime, see `pi/`)
- [x] Stage 4 — Integration with AgriBot backend and mobile app

## Deploying to the Raspberry Pi

The Pi does not run PyTorch. Export the weights to ONNX on a laptop and copy
the file across:

```bash
python scripts/export_onnx.py          # writes models/weights/best.onnx
scp models/weights/best.onnx PI_USER@PI_IP:~/AgriBot-Smart_Farming/ai/models/weights/
```

The Pi service (`pi/agribot/vision.py`) letterboxes camera frames to 640 px,
runs ONNX Runtime, applies NMS and uploads an annotated JPEG with the results.


