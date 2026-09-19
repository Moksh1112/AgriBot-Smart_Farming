# AgriBot

AgriBot is an IoT-based smart farming prototype. A robot collects soil and environmental readings, sends them to an Express backend, and the farmer mobile app displays the latest information and live updates.

This repository currently contains two applications:

- `backend`: Node.js, Express, MongoDB/Mongoose, JWT authentication, and Socket.IO.
- `mobile-app`: React Native with Expo Router, Expo Go support, SecureStore authentication, Socket.IO updates, and a Leaflet map rendered inside WebView.

The physical robot is not required for development. The development simulator sends the same ingestion request that an ESP32 or Raspberry Pi will eventually send.

## Architecture

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

## Mobile Installation

From the repository root:

```powershell
cd mobile-app
npm install
npx expo start
```

Expo Go is the Android application that loads the Expo project during development. Scan the QR code from the Expo terminal or browser dashboard.

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

The mobile base URL is centralized in [mobile-app/src/constants/api.ts](mobile-app/src/constants/api.ts):

```ts
export const API_BASE_URL = 'http://YOUR-LAPTOP-IP:5000';
```

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

## Socket.IO Real-Time Updates

The backend and mobile client use Socket.IO `4.8.3`.

Event name:

```text
robot:data
```

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
node src/tools/robot-simulator.js
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
│   ├── _layout.tsx       Root Expo Router stack and AuthProvider.
│   ├── index.tsx         Authenticated/unauthenticated entry redirect.
│   ├── login.tsx         Login form and error/loading UI.
│   ├── signup.tsx        Signup form and error/loading UI.
│   ├── dashboard.tsx     REST initial load, Socket.IO updates, sensor UI.
│   └── location.tsx      REST/socket robot location state and map screen.
├── components/
│   ├── robot-leaflet-map.tsx Leaflet HTML/WebView map bridge.
│   ├── sensor-card.tsx   Sensor metric presentation.
│   ├── screen-header.tsx Shared screen headings/actions.
│   ├── brand-lockup.tsx  AgriBot branding.
│   ├── form-field.tsx    Shared authentication input.
│   └── primary-button.tsx Shared authentication button.
├── constants/
│   ├── api.ts            Centralized backend base URL.
│   └── agri-theme.ts     AgriBot colors, spacing, and radii.
├── context/
│   └── auth-context.tsx  JWT SecureStore lifecycle and auth state.
├── data/
│   └── mock-data.ts      DashboardData types and development mock reference data.
└── services/
    ├── auth-service.ts          HTTP signup/login/session requests.
    ├── robot-service.ts         Authenticated REST dashboard request.
    └── robot-socket-service.ts  Authenticated Socket.IO connection and cleanup.
```

The active dashboard and Location flows use backend data. `mock-data.ts` remains as the shared type definition and reference mock source; it is not the normal live dashboard source.

### Backend

```text
backend/src/
├── server.js                         Express + HTTP server + Socket.IO setup.
├── config/
│   └── db.js                         Mongoose connection using MONGODB_URI.
├── models/
│   ├── User.js                       Farmer account schema.
│   └── RobotData.js                  Sensor/status/GPS schema with timestamps.
├── middleware/
│   ├── auth.middleware.js            Farmer JWT HTTP protection.
│   ├── robot-auth.middleware.js      x-robot-key ingestion protection.
│   └── socket-auth.middleware.js     Farmer JWT Socket.IO handshake protection.
├── routes/
│   ├── test.routes.js                GET /api/health.
│   ├── auth.routes.js                Signup, login, and /me.
│   └── robot.routes.js               Robot ingestion and dashboard APIs.
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

## Hardware Handoff

The hardware teammate will eventually replace the simulator with firmware that:

1. Reads the soil moisture sensor.
2. Reads DHT22 temperature and humidity.
3. Reads GPS latitude and longitude.
4. Determines robot status.
5. Builds the agreed JSON body.
6. Sends `POST /api/robot/data` with the `x-robot-key` header.

The hardware request must contain:

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

The backend generates `robot.lastUpdated`, MongoDB `_id`, `createdAt`, and `updatedAt`. The hardware must not send or store farmer JWTs, MongoDB credentials, JWT secrets, or the robot key in the JSON body.

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
