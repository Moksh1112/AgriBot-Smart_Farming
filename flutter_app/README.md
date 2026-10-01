# AgriBot Flutter app

The farmer app for AgriBot, rebuilt in Flutter. It replaces the Expo app in `../mobile-app`, using the same backend APIs, Socket.IO events and Pi Bluetooth protocol.

## Features

- **Field**: a map header with a mint field map, plus Overview, Analysis and Trends tabs. They show live sensor chips, the crop-health card, recommendations, and charts by hour, day or week.
- **Leaf scan**: the latest annotated camera photo from the Pi's disease model, a **Scan leaves now** button, detections with confidence, care advice, and scan history.
- **Robot**: online status, capabilities, **Find AgriBot** over Bluetooth, **Share network** (Wi-Fi or hotspot plus the server address), refresh readings, and account.
- **Full map**: a native map with zoom and recenter buttons.

## Packages

| Package | Purpose |
| --- | --- |
| `provider` | App state (`AuthController`, `RobotController`, `BleController`) |
| `http`, `socket_io_client` | REST and live Socket.IO updates |
| `flutter_secure_storage` | JWT in the iOS Keychain or Android Keystore |
| `flutter_map`, `latlong2` | Native OpenStreetMap field map, with no WebView |
| `flutter_reactive_ble` | Bluetooth LE to the Pi. It is BSD-licensed and free for commercial use. |
| `permission_handler` | Android "Nearby devices" permission |

`flutter_blue_plus` was deliberately avoided, because version 2 requires a paid licence for any for-profit use.

## Run

```bash
flutter pub get
flutter run -d <device>                       # debug
flutter run --release -d <device>             # what you install for real use
flutter run --dart-define=API_URL=http://192.168.1.20:5001
```

The default server is the hosted backend, `https://agribot-egl8.onrender.com`. You can change it on the login screen with **Server: …**. The new address is saved on the phone, so changing networks does not need a rebuild.

## Layout

```text
lib/
├── main.dart                 Providers and the auth gate
├── core/                     Config (API URL, BLE UUIDs), theme, formatting, crop advice
├── models/robot.dart         API models
├── services/api_client.dart  JSON client
├── state/                    Auth, robot (REST + Socket.IO + commands), Bluetooth provisioning
├── widgets/                  Hatch texture, cards, chips, pill tabs, charts, field map
└── screens/                  Auth, home shell, field, leaf scan, robot, share sheet, map
```
