import 'dart:async';
import 'dart:convert';
import 'dart:io' show Platform;

import 'package:flutter/foundation.dart';
import 'package:flutter_reactive_ble/flutter_reactive_ble.dart';
import 'package:permission_handler/permission_handler.dart';

import '../core/config.dart';

enum BlePhase { idle, scanning, connecting, connected }

class FoundRobot {
  FoundRobot(this.id, this.name, this.rssi);
  final String id, name;
  final int rssi;
}

class PiNetwork {
  PiNetwork(this.ssid, this.signal, this.secure);
  final String ssid;
  final int signal;
  final bool secure;
}

/// Status the Pi reports over Bluetooth (pi/agribot/ble.py).
class PiBleStatus {
  PiBleStatus(this.raw);
  final Map<String, dynamic> raw;
  Map<String, dynamic> get _wifi => Map<String, dynamic>.from((raw['wifi'] as Map?) ?? {});
  String get wifiState => _wifi['state'] as String? ?? 'unknown';
  String? get ssid => _wifi['ssid'] as String?;
  String? get ip => _wifi['ip'] as String?;
  String? get wifiError => _wifi['error'] as String?;
  String? get target => _wifi['target'] as String?;
  bool get internet => raw['internet'] == true;
  bool get backendOk => (raw['backend'] as Map?)?['ok'] == true;
  bool get pinRequired => raw['pin'] == true;
  Map<String, dynamic>? get last => raw['last'] is Map ? Map<String, dynamic>.from(raw['last'] as Map) : null;
}

/// Bluetooth flow: find the Pi, connect, read its Wi-Fi status, share a network.
class BleController extends ChangeNotifier {
  final _ble = FlutterReactiveBle();
  final _service = Uuid.parse(AgriBotBle.service);

  BlePhase phase = BlePhase.idle;
  List<FoundRobot> robots = [];
  FoundRobot? device;
  PiBleStatus? status;
  List<PiNetwork> networks = [];
  String error = '';
  int _mtu = 23;

  StreamSubscription<DiscoveredDevice>? _scanSub;
  StreamSubscription<ConnectionStateUpdate>? _connSub;
  Timer? _poll;
  bool _disposed = false;

  QualifiedCharacteristic _char(String uuid) =>
      QualifiedCharacteristic(serviceId: _service, characteristicId: Uuid.parse(uuid), deviceId: device!.id);

  Future<BleStatus> _settledStatus() async {
    final s = _ble.status;
    if (s != BleStatus.unknown) return s;
    return _ble.statusStream.firstWhere((v) => v != BleStatus.unknown).timeout(const Duration(seconds: 8), onTimeout: () => _ble.status);
  }

  Future<void> _ensureReady() async {
    if (Platform.isAndroid) {
      // Android 12+: "Nearby devices". On older versions these report granted.
      final results = await [Permission.bluetoothScan, Permission.bluetoothConnect].request();
      if (results.values.any((s) => !s.isGranted)) {
        throw Exception('Bluetooth permission was denied. Allow "Nearby devices" for AgriBot in Settings.');
      }
    }
    // iOS shows its Bluetooth permission prompt while the status settles.
    var s = await _settledStatus();
    if (Platform.isAndroid && s == BleStatus.unauthorized) {
      // Android 11 and older need location permission to scan.
      await Permission.locationWhenInUse.request();
      await Future<void>.delayed(const Duration(milliseconds: 500));
      s = await _settledStatus();
    }
    switch (s) {
      case BleStatus.ready:
        return;
      case BleStatus.poweredOff:
        throw Exception('Turn on Bluetooth to connect to AgriBot.');
      case BleStatus.unauthorized:
        throw Exception('Bluetooth access is off for AgriBot. Enable it in Settings.');
      case BleStatus.locationServicesDisabled:
        throw Exception('Turn on Location so Android can scan for Bluetooth devices.');
      case BleStatus.unsupported:
        throw Exception('This phone does not support Bluetooth Low Energy.');
      case BleStatus.unknown:
        throw Exception('Bluetooth is not ready yet. Try again.');
    }
  }

  Future<void> scan() async {
    error = '';
    robots = [];
    phase = BlePhase.scanning;
    _notify();
    try {
      await _ensureReady();
      final done = Completer<void>();
      _scanSub = _ble.scanForDevices(withServices: [], scanMode: ScanMode.lowLatency).listen((d) {
        final isAgriBot = d.serviceUuids.contains(_service) || d.name.toLowerCase().contains('agribot');
        if (!isAgriBot) return;
        robots = [...robots.where((r) => r.id != d.id), FoundRobot(d.id, d.name.isEmpty ? 'AgriBot' : d.name, d.rssi)];
        _notify();
      }, onError: (Object e) {
        if (!done.isCompleted) done.completeError(e);
      });
      await done.future.timeout(const Duration(seconds: 6), onTimeout: () {});
      if (robots.isEmpty) error = 'No AgriBot found. Make sure the Pi is powered on and within a few metres.';
    } catch (e) {
      error = _message(e);
    } finally {
      await _scanSub?.cancel();
      _scanSub = null;
      if (phase == BlePhase.scanning) phase = BlePhase.idle;
      _notify();
    }
  }

  Future<void> connect(FoundRobot robot) async {
    error = '';
    phase = BlePhase.connecting;
    device = robot;
    _notify();
    final connected = Completer<void>();
    _connSub = _ble
        .connectToDevice(
          id: robot.id,
          servicesWithCharacteristicsToDiscover: {
            _service: [Uuid.parse(AgriBotBle.status), Uuid.parse(AgriBotBle.networks), Uuid.parse(AgriBotBle.command)],
          },
          connectionTimeout: const Duration(seconds: 15),
        )
        .listen((update) {
      if (update.connectionState == DeviceConnectionState.connected && !connected.isCompleted) connected.complete();
      if (update.connectionState == DeviceConnectionState.disconnected) {
        if (!connected.isCompleted) {
          connected.completeError(update.failure?.message ?? 'Connection failed');
        } else if (phase == BlePhase.connected) {
          _reset('AgriBot disconnected from Bluetooth.');
        }
      }
    }, onError: (Object e) {
      if (!connected.isCompleted) connected.completeError(e);
    });

    try {
      await connected.future.timeout(const Duration(seconds: 20));
      try {
        _mtu = await _ble.requestMtu(deviceId: robot.id, mtu: 247);
      } catch (_) {
        _mtu = Platform.isIOS ? 185 : 23;
      }
      status = await _readStatus();
      phase = BlePhase.connected;
      _notify();
      _poll = Timer.periodic(const Duration(seconds: 2), (_) async {
        try {
          status = await _readStatus();
          _notify();
        } catch (_) {
          // Transient read failures are common while the Pi switches Wi-Fi.
        }
      });
      await loadNetworks();
    } catch (e) {
      _reset('Could not connect: ${_message(e)}');
    }
  }

  Future<PiBleStatus> _readStatus() async =>
      PiBleStatus(Map<String, dynamic>.from(jsonDecode(utf8.decode(await _ble.readCharacteristic(_char(AgriBotBle.status)))) as Map));

  Future<void> loadNetworks() async {
    if (device == null) return;
    try {
      final list = jsonDecode(utf8.decode(await _ble.readCharacteristic(_char(AgriBotBle.networks)))) as List;
      networks = list.map((e) => PiNetwork(e['s'] as String, (e['q'] as num).toInt(), e['l'] == true)).toList();
    } catch (_) {
      networks = [];
    }
    _notify();
  }

  /// Sends 0x02 + utf8(json) + '\n', split into MTU-sized writes the Pi reassembles.
  Future<void> _send(Map<String, dynamic> payload) async {
    if (device == null) throw Exception('Connect to AgriBot over Bluetooth first.');
    final bytes = [0x02, ...utf8.encode(jsonEncode(payload)), 0x0A];
    final chunk = (_mtu - 3).clamp(20, 180);
    for (var i = 0; i < bytes.length; i += chunk) {
      await _ble.writeCharacteristicWithResponse(_char(AgriBotBle.command), value: bytes.sublist(i, (i + chunk).clamp(0, bytes.length)));
    }
  }

  Future<void> refreshNetworks({String? pin}) async {
    try {
      await _send({'cmd': 'scan', 'pin': ?pin});
      await Future<void>.delayed(const Duration(seconds: 4));
      await loadNetworks();
    } catch (e) {
      error = _message(e);
      _notify();
    }
  }

  Future<void> share({required String ssid, required String password, String? backend, String? pin}) =>
      _send({'cmd': 'wifi', 'ssid': ssid, 'password': password, 'backend': ?backend, 'pin': ?pin});

  Future<void> disconnect() async => _reset('');

  void _reset(String message) {
    _poll?.cancel();
    _poll = null;
    _connSub?.cancel();
    _connSub = null;
    device = null;
    status = null;
    phase = BlePhase.idle;
    error = message;
    _notify();
  }

  String _message(Object e) => e.toString().replaceFirst('Exception: ', '');

  void _notify() {
    if (!_disposed) notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    _scanSub?.cancel();
    _poll?.cancel();
    _connSub?.cancel();
    super.dispose();
  }
}
