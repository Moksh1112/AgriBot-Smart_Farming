/// Build-time defaults. Override with:
///   flutter run --dart-define=API_URL=http://192.168.1.20:5001
/// The farmer can also change the server address on the login screen.
const String kDefaultApiUrl = String.fromEnvironment(
  'API_URL',
  defaultValue: 'https://agribot-egl8.onrender.com',
);

/// Bluetooth GATT UUIDs; must match pi/agribot/ble.py.
class AgriBotBle {
  static const service = '9f3a0001-6c1d-4a8e-9b2f-4a7e1c0d5b10';
  static const status = '9f3a0002-6c1d-4a8e-9b2f-4a7e1c0d5b10';
  static const networks = '9f3a0003-6c1d-4a8e-9b2f-4a7e1c0d5b10';
  static const command = '9f3a0004-6c1d-4a8e-9b2f-4a7e1c0d5b10';
}
