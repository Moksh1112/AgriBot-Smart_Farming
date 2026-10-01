# AgriBot

AgriBot is an IoT-based smart farming prototype. A robot collects soil and environmental readings, sends them to an Express backend, and the farmer mobile app displays the latest information and live updates.

This repository contains these parts:

- `backend`: Node.js, Express, MongoDB/Mongoose, JWT authentication, and Socket.IO.
- `flutter_app`: **the current farmer app**, written in Flutter, with the same screens and features as below. See [flutter_app/README.md](flutter_app/README.md).
- `mobile-app`: the earlier React Native (Expo) version of the app, kept for reference. It uses React Native with Expo Router, SecureStore authentication, Socket.IO updates, a Leaflet field map, crop-disease scans, and Bluetooth Wi-Fi sharing.
- `pi`: one lightweight Python service for the Raspberry Pi. It reads the sensors, runs the tomato-leaf disease model on the camera, takes commands from the app, and accepts Wi-Fi details from the phone over Bluetooth.
- `ai`: training-side tools for the YOLO26s tomato-leaf disease model and its ONNX export.

The physical robot is not required for development. The development simulator sends the same ingestion request that an ESP32 or Raspberry Pi will eventually send.

## Architecture

```text
                 Bluetooth LE (share Wi-Fi + server address)
   Phone app  <------------------------------------------->  Raspberry Pi service
      |                                                         |  sensors, camera,
      | REST + Socket.IO (farmer JWT)                           |  ONNX disease model
      v                                                         v
   Express backend  <---- readings, scans, heartbeat (x-robot-key) ----
      |    \---- queued commands (scan, refresh) returned in heartbeat ---->
      v
   MongoDB
```

Original sensor data flow:

```text
ESP32 / Raspberry Pi / Simulator
        |
        | POST /api/robot/data
        | x-robot-key
        v
Node.js + Express
        |
        v
MongoDB Community Server
        |
        | Socket.IO: robot:data
        v
React Native Farmer App
        |
        | GET /api/robot/dashboard + farmer JWT
        v
Latest dashboard data
```

For farmer authentication:

```text
Mobile app
    |
    | POST /api/auth/login
    v
Express + bcryptjs + JWT
    |
    | JWT stored in SecureStore
    v
Protected dashboard and Socket.IO connections
```

## Technology Stack

Versions below are taken from the current `package.json` files. Node.js itself is not pinned by an `engines` field; use a current Node.js LTS release. The backend uses built-in `fetch`, so Node.js 18+ is the practical minimum.

### Backend

- Node.js LTS: JavaScript runtime. Node 18+ is recommended because the simulator uses built-in `fetch`.
- Express `^5.2.1`: HTTP server and API routes.
- Mongoose `^9.10.1`: MongoDB connection and schemas.
- dotenv `^18.0.1`: Loads local backend environment variables.
- cors `^2.8.6`: Allows the mobile client to make HTTP requests during development.
- bcryptjs `^3.0.3`: Hashes and verifies farmer passwords.
- jsonwebtoken `^9.0.3`: Creates and verifies farmer JWTs.
- socket.io `^4.8.3`: Authenticated real-time server connections and `robot:data` events.
- nodemon `^3.1.14`: Restarts the backend during development.

### Mobile app

- Expo `~57.0.24`: React Native development platform and Expo Go workflow.
- React Native `0.86.3`: Mobile UI framework.
- Expo Router `~57.0.22`: File-based navigation under `src/app`.
- `expo-secure-store` `~57.0.4`: Securely stores the farmer JWT on the device.
- `socket.io-client` `^4.8.3`: Receives live robot updates.
- `react-native-webview` `13.16.1`: Hosts the Leaflet map HTML document.
- `react-native-ble-manager` `^12.5.3`: Bluetooth LE connection to the Pi for Wi-Fi sharing (development build only).
- `@expo/vector-icons` `^15.0.2`: Ionicons used across the redesigned UI.
- `react-native-maps` `1.27.2`: Still installed, but not used by the active Robot Location screen. The active map is Leaflet inside WebView.
- `react-native-safe-area-context` `~5.7.0`: Safe-area layout support.
- TypeScript `~6.0.3`: Type checking and typed mobile source.

## Prerequisites on Windows

Install the following before cloning or running the project:

1. Git for Windows.
2. Node.js LTS and npm.
3. Visual Studio Code.
4. MongoDB Community Server.
5. MongoDB Compass.
6. Expo Go on an Android phone.

A global Expo CLI installation is not required. The project uses `npx expo` from the local Expo dependency.

Do not commit `node_modules`. Do not commit `.env` files. Both project areas already ignore these kinds of local files; see [backend/.gitignore](backend/.gitignore) and [mobile-app/.gitignore](mobile-app/.gitignore).

## Clone the Repository

Use the repository URL supplied by your team:

```powershell
git clone <YOUR-GITHUB-REPOSITORY-URL>
cd AgriBot
```

The two project directories are independent npm projects:

```text
AgriBot/
├── backend/
└── mobile-app/
```

Use `cd backend` for server commands and `cd mobile-app` for Expo commands.

## Flutter App (current)

```bash
cd flutter_app
flutter pub get
flutter run --release -d <your-phone>
```

On the login screen, tap **Server: …** to set the backend address, for example `http://192.168.1.20:5001`. The phone saves it. Bluetooth works in every build, so no special development build is needed.

## Mobile Installation (Expo version)

From the repository root:

```powershell
cd mobile-app
npm install
npx expo start
```

Expo Go is the Android application that loads the Expo project during development. Scan the QR code from the Expo terminal or browser dashboard.

Expo Go runs every screen except Bluetooth, because Expo Go has no Bluetooth module. The Robot tab says so instead of crashing. To use **Find AgriBot** and **Share network**, install a development build once with a phone connected over USB:

```powershell
cd mobile-app
npx expo run:android
```

You can also build it in the cloud with `npx eas build --profile development --platform android`. After that, `npx expo start` loads your code into the development build the same way it did into Expo Go.

The Android phone and laptop normally need to be connected to the same Wi-Fi network. The phone must be able to reach the laptop's local IP address.

## Backend Installation

From the repository root:

```powershell
cd backend
npm install
```

Available scripts from the actual backend `package.json`:

```powershell
npm run dev
```

Runs `nodemon src/server.js` and restarts the server when backend source files change.

```powershell
npm start
```

Runs `node src/server.js` normally.

## Local MongoDB Setup

Install and run MongoDB Community Server locally. MongoDB Compass is only a graphical client; opening Compass does not start the database server.

The backend is configured to use:

```text
mongodb://127.0.0.1:27017/agribot
```

The `agribot` database and application collections are created or used naturally when the backend writes data. This project uses local MongoDB Community Server, not MongoDB Atlas.

## Environment Variables

The safe template is [backend/.env.example](backend/.env.example). Create the real local file by copying it:

```powershell
cd backend
Copy-Item .env.example .env
```

Open `backend/.env` locally and replace the placeholder values. Never paste real values into the repository or into documentation.

Required variables:

```text
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/agribot
JWT_SECRET=<private farmer JWT signing secret>
ROBOT_INGEST_KEY=<private robot ingestion key>
```

Optional simulator variable:

```text
ROBOT_SIM_INTERVAL_MS=5000
```

The backend reads these values with `process.env`. The simulator uses `ROBOT_INGEST_KEY` and `ROBOT_SIM_INTERVAL_MS`.

## Mobile Backend URL

The mobile base URL is centralized in [mobile-app/src/constants/api.ts](mobile-app/src/constants/api.ts). It reads `EXPO_PUBLIC_API_URL` first and falls back to the default written in that file, so you can switch laptops without editing code:

```powershell
$env:EXPO_PUBLIC_API_URL="http://YOUR-IP:5000"; npx expo start
```

When the app shares a network with the Pi over Bluetooth, it also sends this address, so the Pi publishes to the same server the app uses.

Before using a different laptop, find its local IPv4 address:

```powershell
ipconfig
```

Then set the value to:

```text
http://YOUR-IP:5000
```

Do not use `localhost` when Expo Go is running on a physical phone. On the phone, `localhost` means the phone itself, not the development laptop.

The robot simulator has its request URL as a source constant in [backend/src/tools/robot-simulator.js](backend/src/tools/robot-simulator.js). If the backend laptop address changes, update that development-only constant before running the simulator. The simulator still reads the robot key from the backend environment and never prints it.

## Running the Project

Start the backend first.

### Terminal 1: backend

```powershell
cd AgriBot\backend
npm run dev
```

Expected responsibilities:

- Connect to local MongoDB.
- Start Express and Socket.IO on port `5000`.
- Serve authentication and robot routes.

### Terminal 2: mobile app

```powershell
cd AgriBot\mobile-app
npx expo start
```

Then open Expo Go on Android, scan the QR code, and log in with a farmer account. Keep the backend terminal running while using real authentication, dashboard, location, and live robot data.

## Authentication API

### `POST /api/auth/signup`

Creates a farmer account. Request body:

```json
{
  "name": "Test Farmer",
  "email": "farmer@example.com",
  "password": "password123"
}
```

Passwords are hashed with bcryptjs before storage. The password hash is not returned to the client.

### `POST /api/auth/login`

Request body:

```json
{
  "email": "farmer@example.com",
  "password": "password123"
}
```

The backend verifies the bcrypt hash and returns a JWT plus safe user information. The mobile app stores only the JWT in Expo SecureStore under its internal authentication key.

### `GET /api/auth/me`

Requires:

```http
Authorization: Bearer <farmer-jwt>
```

This verifies the token and returns safe authenticated user information. The mobile app uses this during startup to restore a valid session.

## Robot Ingestion API

### `POST /api/robot/data`

This endpoint represents robot-to-backend communication. It requires the separate robot ingestion key, not a farmer JWT:

```http
x-robot-key: <ROBOT_INGEST_KEY>
```

Example body:

```json
{
  "sensors": {
    "soilMoisture": 88,
    "temperature": 36,
    "humidity": 45
  },
  "robot": {
    "status": "online"
  },
  "location": {
    "latitude": 19.047838,
    "longitude": 72.872712
  }
}
```

The backend validates the request, generates `robot.lastUpdated`, stores the document in MongoDB, emits the safe `robot:data` payload, and returns the stored dashboard data. It does not store or emit the robot key.

The real ESP32/Raspberry Pi will eventually send this same request.

## Dashboard API

### `GET /api/robot/dashboard`

This endpoint is for the farmer mobile app and requires a farmer JWT:

```http
Authorization: Bearer <farmer-jwt>
```

It returns the latest available robot data:

```json
{
  "success": true,
  "data": {
    "sensors": {
      "soilMoisture": 48,
      "temperature": 29,
      "humidity": 64
    },
    "robot": {
      "status": "online",
      "lastUpdated": "2026-09-19T10:00:00.000Z"
    },
    "location": {
      "latitude": 19.076,
      "longitude": 72.8777
    }
  }
}
```

The mobile dashboard and Location screen use the same data contract. MongoDB is accessed only by the backend, never directly by the mobile app.

## Robot Control, Scans and History APIs

Robot-side endpoints require `x-robot-key`. Farmer endpoints require `Authorization: Bearer <farmer-jwt>`.

| Method and path | Caller | Purpose |
| --- | --- | --- |
| `POST /api/robot/heartbeat` | Pi, every 3 s | Reports Pi status and capabilities. The response carries queued app commands. |
| `POST /api/robot/detections` | Pi | Stores a disease scan with its annotated JPEG and emits `robot:detection`. |
| `POST /api/robot/commands/:id/result` | Pi | Reports whether a command worked and emits `robot:command`. |
| `GET /api/robot/status` | App | Returns whether the robot is online (heartbeat within 15 s), its last heartbeat, and pending commands. |
| `POST /api/robot/commands` | App | Queues `{ "type": "scan" }` or `{ "type": "publish" }`. Returns 409 when the robot is offline. |
| `GET /api/robot/history?range=hour\|day\|week` | App | Returns readings averaged into 48 time buckets for charts. |
| `GET /api/robot/detections` | App | Lists recent scans without images. |
| `GET /api/robot/detections/latest` | App | Returns the newest scan with its image. |
| `GET /api/robot/detections/:id` | App | Returns one scan with its image. |

## Socket.IO Real-Time Updates

The backend and mobile client use Socket.IO `4.8.3`.

| Event | Meaning |
| --- | --- |
| `robot:data` | A new sensor reading was stored. |
| `robot:status` | The robot went online or offline, or its reported status changed. |
| `robot:detection` | A new crop-disease scan, including the annotated image. |
| `robot:command` | A queued command finished, with `{ id, ok, message }`. |

The live flow is:

```text
POST /api/robot/data
        ↓
MongoDB save
        ↓
Socket.IO emits robot:data
        ↓
Mobile Dashboard / Location listener
        ↓
React Native state updates immediately
```

REST provides the initial/latest state when a screen opens. Socket.IO delivers later changes without a manual refresh. The mobile app authenticates its Socket.IO connection with the farmer JWT. The robot ingestion key is not sent to the mobile app.

## Robot Simulator

The simulator is [backend/src/tools/robot-simulator.js](backend/src/tools/robot-simulator.js). It is explicitly **development/test only** and represents one future physical AgriBot.

Run it from the backend directory:

```powershell
cd backend
npm run simulate
```

It:

- Reads `ROBOT_INGEST_KEY` using dotenv.
- Sends `POST /api/robot/data` with the `x-robot-key` header.
- Generates gradually changing sensor and GPS values.
- Sends updates every `5000` milliseconds by default.
- Uses `ROBOT_SIM_INTERVAL_MS` when that environment variable is a positive number.
- Continues after temporary network or HTTP failures.
- Stops cleanly with Ctrl+C.
- Never prints the robot key, JWT, password, MongoDB URI, or other secrets.

The simulator currently targets the backend URL stored in its development-only source constant. A developer using a different laptop IP must update that constant before running the simulator.

## Leaflet Map

The active Robot Location map uses this architecture:

```text
React Native
      ↓
React Native WebView
      ↓
Leaflet 1.9.4
      ↓
OpenStreetMap tiles
```

`react-native-maps` remains installed in the mobile package but is not the active map implementation. It is not used because the earlier Android Expo Go native map rendering was unreliable.

Leaflet runs in a self-contained HTML document inside WebView. OpenStreetMap supplies the visible map tiles. The map includes visible OpenStreetMap attribution, and the phone needs internet access to load Leaflet resources and tiles.

The React Native Location screen owns the authenticated location state. It sends only latitude, longitude, and robot status to the WebView. JWTs, robot keys, MongoDB credentials, and other secrets never enter the map document.

The map component keeps the WebView alive and updates the existing marker through messaging when coordinates change.

## First-Run Testing Checklist

- [ ] Git is installed.
- [ ] Node.js LTS is installed.
- [ ] MongoDB Community Server is installed.
- [ ] MongoDB Compass is installed.
- [ ] MongoDB server is running.
- [ ] Repository is cloned.
- [ ] `npm install` completed in `mobile-app`.
- [ ] `npm install` completed in `backend`.
- [ ] `backend/.env` was created from `.env.example`.
- [ ] Mobile `API_BASE_URL` points to the laptop IPv4 address.
- [ ] Backend starts with `npm run dev`.
- [ ] `GET /api/health` responds successfully.
- [ ] Mobile app starts in Expo Go.
- [ ] Signup works.
- [ ] Login works.
- [ ] JWT-protected requests work.
- [ ] Dashboard loads.
- [ ] Soil moisture, temperature, and humidity appear.
- [ ] Robot location appears.
- [ ] Socket.IO live updates work without refreshing.
- [ ] Robot simulator sends accepted data.
- [ ] Leaflet tiles and marker work.

A simple local health check from PowerShell is:

```powershell
Invoke-RestMethod http://127.0.0.1:5000/api/health
```

## Troubleshooting

### Port 5000 already in use

Find the process using the port:

```powershell
Get-NetTCPConnection -LocalPort 5000 -State Listen
```

Close the old backend process from the terminal where it is running, or stop the specific process after confirming it is safe to stop. Do not blindly terminate unrelated processes.

### MongoDB connection refused

Confirm MongoDB Community Server is running. Compass alone is not enough. Check that the local URI in your private `backend/.env` is:

```text
mongodb://127.0.0.1:27017/agribot
```

### Phone cannot reach the backend

- Confirm the backend is running on port `5000`.
- Confirm the phone and laptop use the same Wi-Fi network.
- Confirm `mobile-app/src/constants/api.ts` uses the laptop's current IPv4 address, not `localhost`.
- Check Windows Firewall rules if the phone cannot reach the laptop.

### Wrong laptop IP

Run:

```powershell
ipconfig
```

Use the active adapter's IPv4 address and update the mobile API constant. Restart Expo after changing it if the bundle does not refresh.

### Phone and laptop are not on the same network

Connect both devices to the same local network. Guest Wi-Fi, VPNs, and client isolation can prevent device-to-laptop communication.

### Backend is not running

From `backend` run:

```powershell
npm run dev
```

The mobile app cannot authenticate or load robot data while the backend is stopped.

### HTTP `401` from authentication

Check that the user credentials are correct and that the backend `.env` contains the same private `JWT_SECRET` used when the server started. Do not print or commit the secret. Logging out and logging in again clears an expired mobile token.

### HTTP `401` from robot ingestion

The simulator or hardware must send the `x-robot-key` header. The value must match the private `ROBOT_INGEST_KEY` in `backend/.env`. Never place the key in the mobile app, URL, logs, or README.

### Socket.IO is not connecting

- Confirm the backend is running and reachable from the phone.
- Confirm the farmer is logged in and has a valid JWT.
- Confirm the mobile API URL uses the laptop IPv4 address.
- Confirm the backend and mobile Socket.IO major versions remain compatible.
- The dashboard should retain the last REST data if Socket.IO temporarily disconnects.

### Map tiles are not loading

- Confirm the phone has internet access.
- Confirm Leaflet and OpenStreetMap requests are not blocked.
- Confirm the WebView is visible and the Location screen received backend data.
- OpenStreetMap tiles require visible attribution and are not an offline tile service.

### Expo Go cannot connect

- Confirm Expo is running with `npx expo start` from `mobile-app`.
- Keep the phone and laptop on the same Wi-Fi network.
- Try restarting Expo if the QR session is stale.
- Do not install a global Expo CLI for this project.

### `npm install` problems

- Confirm Node.js LTS and npm are installed.
- Run the command from the correct project directory.
- Do not delete lockfiles or change package versions casually.
- Keep `package-lock.json` committed and do not commit `node_modules`.

## File and Folder Overview

### Mobile app

```text
mobile-app/src/
├── app/
│   ├── _layout.tsx          Root stack with AuthProvider and RobotProvider.
│   ├── index.tsx            Authenticated/unauthenticated entry redirect.
│   ├── login.tsx, signup.tsx  Hatched dark hero with a white form sheet.
│   ├── location.tsx         Full-screen field map with zoom and recenter buttons.
│   └── (tabs)/
│       ├── _layout.tsx      Auth guard and the floating dark tab bar.
│       ├── dashboard.tsx    Field: map hero, Overview/Analysis/Trends tabs, metric chips, crop card, charts.
│       ├── scan.tsx         Leaf scan: latest annotated photo, Scan now, detections, care advice, history.
│       └── robot.tsx        Robot status, Bluetooth connect, Share network, actions, account.
├── components/              Map, floating tab bar, metric chips, charts, Share network sheet, buttons.
├── constants/
│   ├── api.ts               Backend URL (EXPO_PUBLIC_API_URL override).
│   ├── ble.ts               Bluetooth UUIDs shared with pi/agribot/ble.py.
│   └── agri-theme.ts        Forest/mint palette, radii, shadows.
├── context/
│   ├── auth-context.tsx     JWT SecureStore lifecycle and the signed-in user.
│   └── robot-context.tsx    One REST load and one Socket.IO connection shared by every screen; commands.
├── data/
│   ├── crop-advice.ts       Disease descriptions, treatments and field insight rules.
│   └── mock-data.ts         Dashboard types and sample values shown before the first reading.
├── hooks/                   Bluetooth provisioning flow, history loading, robot online state.
├── services/                REST, Socket.IO and Bluetooth clients.
└── types/robot.ts           Shared API types.
```

### Backend

```text
backend/src/
├── server.js                         Express + HTTP server + Socket.IO setup.
├── config/
│   └── db.js                         Mongoose connection using MONGODB_URI.
├── models/
│   ├── User.js                       Farmer account schema.
│   ├── RobotData.js                  Sensor/status/GPS schema with timestamps.
│   └── Detection.js                  Crop-disease scan results and annotated image.
├── middleware/
│   ├── auth.middleware.js            Farmer JWT HTTP protection.
│   ├── robot-auth.middleware.js      x-robot-key ingestion protection.
│   └── socket-auth.middleware.js     Farmer JWT Socket.IO handshake protection.
├── routes/
│   ├── test.routes.js                GET /api/health.
│   ├── auth.routes.js                Signup, login, and /me.
│   └── robot.routes.js               Ingestion, heartbeat, commands, scans, history, dashboard.
├── services/
│   └── robot-presence.js             In-memory robot online state and command queue.
└── tools/
    └── robot-simulator.js            Development-only changing robot data sender.
```

## Security Rules

Never commit or share:

- `backend/.env`
- MongoDB credentials or connection secrets
- `JWT_SECRET`
- `ROBOT_INGEST_KEY`
- Passwords
- JWT tokens
- SecureStore contents

The backend ignore file covers `.env` and `node_modules`. The mobile ignore file covers `node_modules`, `.env*.local`, Expo output, Metro output, generated native folders, logs, and TypeScript build information. The mobile ignore file also ignores common signing files; the backend ignore file is intentionally smaller.

Do not upload:

- `node_modules`
- `.env`
- Expo build artifacts
- Temporary files
- Logs
- Personal machine configuration

Do upload:

- Source code
- `package.json`
- `package-lock.json`
- Root `README.md`
- `backend/.env.example`

## Raspberry Pi Service

The Pi runs one process, [pi/agribot_service.py](pi/agribot_service.py), with small modules in [pi/agribot/](pi/agribot/). It replaces the earlier `sensor_server.py`. Every part is optional: missing hardware is reported to the app and the rest keeps working.

- **Sensors** publish to `POST /api/robot/data` every 30 seconds. They use DHT22, FC-37 and the MCP3008 as wired below, or simulated values when the GPIO libraries are absent.
- **Crop vision** captures from a Pi Camera (Picamera2) or USB webcam. It runs `best.onnx` with ONNX Runtime and uploads an annotated JPEG. Expect roughly 1–3 seconds per scan on a Pi 4 or 5. It measured about 0.2 seconds on a laptop CPU.
- **Commands** arrive in the heartbeat response, so the app's **Scan leaves now** and **Refresh** buttons work without the phone reaching the Pi directly.
- **Bluetooth Wi-Fi sharing** advertises as `AgriBot`. The app connects, shows the Pi's Wi-Fi state, and sends a network name, password and the server address. The Pi joins the network with NetworkManager, which remembers it for later boots.

### Wiring

The full pin mapping covers sensors, the MCP3008, the L298N motor driver and power. It lives in [docs/PINOUT.md](docs/PINOUT.md), with a colour-coded header diagram:

![AgriBot Raspberry Pi wiring](docs/pi-pinout.svg)

In short:

- **DHT22** DATA goes to GPIO 24 (pin 18). **FC-37** DO goes to GPIO 27 (pin 13).
- The **MCP3008** is on SPI0 (pins 19, 21, 23, 24). The soil probe goes to CH0 and the pH probe to CH2.
- The **L298N** is on GPIO 12, 13 (PWM speed) and GPIO 5, 6, 16, 26 (direction).

Pi GPIO is 3.3 V only, and all grounds must be shared.

### Install on the Pi

Use Raspberry Pi OS Bookworm or newer, 64-bit, because it uses NetworkManager. Clone the repository on the Pi, then copy the model from your laptop. Weights are git-ignored.

```bash
# On the laptop, from the ai/ folder:
python scripts/export_onnx.py
scp models/weights/best.onnx PI_USER@PI_IP:~/AgriBot-Smart_Farming/ai/models/weights/

# On the Pi:
cd ~/AgriBot-Smart_Farming/pi
cp agribot.env.example agribot.env      # set ROBOT_INGEST_KEY and the robot location
sudo ./install.sh
```

[pi/install.sh](pi/install.sh) does the following:

- Installs the apt packages and creates `/opt/agribot/venv`.
- Copies `agribot.env` to `/etc/agribot.env` and enables SPI.
- Disables the old `agribot-sensors` service.
- Installs and starts [pi/agribot.service](pi/agribot.service).

The service runs as root because changing Wi-Fi and registering a Bluetooth service both need it. Follow the logs with:

```bash
journalctl -u agribot -f
```

`ROBOT_INGEST_KEY` is the only value that must be set by hand. `AGRIBOT_BACKEND_URL` can be left as a placeholder, because the app sends its server address when it shares a network.

Set `BLE_PAIRING_PIN` in `/etc/agribot.env` so that strangers nearby cannot change the robot's Wi-Fi. The app then asks for that PIN.

### Share a network from the app

1. Open the **Robot** tab and tap **Find AgriBot** near the robot, then **Connect**.
2. Tap **Share network**. Pick a network the Pi can see, or type your phone hotspot's name, then enter the password.
3. Keep **Also send server address** on. The sheet shows live progress until the Pi reports that it has joined and can reach the server.

### Local diagnostics API

The service also listens on port 8000 for manual tests on the LAN:

```bash
curl http://PI_IP:8000/status                 # capabilities, Wi-Fi, backend connection
curl http://PI_IP:8000/sensors                # read all sensors without publishing
curl http://PI_IP:8000/sensors/dht22          # also: soil-moisture, rainfall, ph
curl -X POST http://PI_IP:8000/sensors/publish
curl -X POST http://PI_IP:8000/vision/scan    # capture, detect, upload
curl -X POST --data-binary @leaf.jpg "http://PI_IP:8000/vision/detect?publish=1"
curl -o latest.jpg http://PI_IP:8000/vision/latest.jpg
curl http://PI_IP:8000/network                # Wi-Fi state and nearby networks
```

Wi-Fi can only be changed over Bluetooth, never over this HTTP API.

### Calibration and demo values

Use the raw value from `/sensors/soil-moisture` to set `SOIL_DRY_VALUE` with the probe in dry soil and `SOIL_WET_VALUE` with it in wet soil. Until the analog probes are wired, `USE_FAKE_SOIL_MOISTURE` and `USE_FAKE_PH` publish the `FAKE_*` values. Restart the service after editing `/etc/agribot.env`.

### Run on a laptop for testing

The service also runs on a laptop with simulated sensors and no Bluetooth:

```bash
pip install onnxruntime opencv-python-headless numpy
cd pi
AGRIBOT_BACKEND_URL=http://127.0.0.1:5000 ROBOT_INGEST_KEY=... CAMERA=none STATE_FILE=state.json python agribot_service.py
```

### Robot JSON contract

Readings sent to `POST /api/robot/data` keep the original shape:

```json
{
  "sensors": { "soilMoisture": 48, "temperature": 29, "humidity": 64, "rainfall": 0, "ph": 6.8 },
  "robot": { "status": "online" },
  "location": { "latitude": 19.047838, "longitude": 72.872712 }
}
```

The backend generates `robot.lastUpdated`, MongoDB `_id`, `createdAt`, and `updatedAt`. The hardware must not send or store farmer JWTs, MongoDB credentials, JWT secrets, or the robot key in the JSON body.

## Hosting the Backend

The backend runs as a single Node.js process. It has no local files and stores everything in MongoDB, so it deploys to any Node or Docker host.

### What the backend expects from the host

| Variable | Required | Notes |
| --- | --- | --- |
| `MONGODB_URI` | Yes | Use MongoDB Atlas. In Atlas, open *Network Access* and allow the host's IPs, or `0.0.0.0/0` for most free hosts. |
| `JWT_SECRET` | Yes | At least 32 random characters when `NODE_ENV=production`. |
| `ROBOT_INGEST_KEY` | Yes | At least 24 characters. Put the same value in the Pi's `/etc/agribot.env`. |
| `NODE_ENV` | Recommended | `production` enforces strong secrets. |
| `PORT` | Set by host | The server listens on whatever port the platform provides. |
| `CORS_ORIGINS` | Optional | Comma-separated browser origins. Defaults to `*`. The phone app and the Pi are not browsers and are unaffected. |
| `JWT_EXPIRES_IN` | Optional | How long a login lasts. Defaults to `30d`. |

Production behaviour:

- `GET /api/health` returns 503 while the database is down, so the platform can restart the service.
- On SIGTERM the server finishes in-flight requests and closes the database cleanly.
- Login and signup are limited to 20 attempts per IP every 15 minutes.
- Robot keys are compared in constant time.
- Real client IPs are read from the host's proxy.

Run **one instance only**. Robot online status and the app's command queue are kept in memory.

### Render (free tier works)

1. Push this repository to GitHub.
2. In Render, choose **New > Blueprint** and select the repository. [render.yaml](render.yaml) creates the `agribot-backend` service with a generated `JWT_SECRET`.
3. Enter `MONGODB_URI` and `ROBOT_INGEST_KEY` when asked.
4. After deploy, open `https://<your-service>.onrender.com/api/health`.

Free services sleep after 15 minutes without traffic. The Pi's heartbeat, every 3 seconds, keeps the service awake while the robot is on.

### Any Docker host (Railway, Fly.io, Cloud Run, a VPS)

```bash
cd backend
docker build -t agribot-backend .
docker run -p 5000:5000 --env-file .env -e NODE_ENV=production agribot-backend
```

### Point the app and the robot at the hosted URL

- **Flutter app**: on the login screen, tap **Server: …** and enter `https://<your-service>.onrender.com`, then tap **Test**.
- **Raspberry Pi**: share a network from the app's Robot tab with **Also send server address** on, and the Pi saves the hosted URL. You can also set `AGRIBOT_BACKEND_URL` in `/etc/agribot.env`.
- **Simulator**: `ROBOT_SIM_URL=https://<your-service>.onrender.com npm run simulate`.

## Clean Repository Rules

Keep machine-specific and sensitive files local. Do not commit `node_modules`, `.env`, Expo build artifacts, temporary files, logs, or personal configuration. Keep source code, lockfiles, package manifests, this README, and placeholder environment templates under version control.

## NEW DEVELOPER QUICK START

1. Install Git, Node.js LTS, VS Code, MongoDB Community Server, MongoDB Compass, and Expo Go.
2. Clone the repository and run `cd AgriBot`.
3. Run `cd mobile-app; npm install`.
4. Run `cd ..\backend; npm install`.
5. Copy `backend/.env.example` to `backend/.env` and fill private values locally.
6. Set `mobile-app/src/constants/api.ts` to the laptop's IPv4 address and port `5000`.
7. Start MongoDB Community Server.
8. In `backend`, run `npm run dev`.
9. In `mobile-app`, run `npx expo start`.
10. Open Expo Go, scan the QR code, and log in.
