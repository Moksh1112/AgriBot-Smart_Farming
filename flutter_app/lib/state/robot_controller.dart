import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

import '../models/robot.dart';
import '../services/api_client.dart';
import 'auth_controller.dart';

enum SocketState { connecting, live, offline }

enum CommandPhase { idle, pending, done, failed }

class CommandState {
  const CommandState(this.phase, [this.message]);
  final CommandPhase phase;
  final String? message;
}

/// One REST load + one Socket.IO connection shared by every screen.
class RobotController extends ChangeNotifier {
  RobotController(this.auth) {
    auth.addListener(_onAuthChanged);
    _onAuthChanged();
  }

  final AuthController auth;
  ApiClient get api => auth.api;

  DashboardData? dashboard;
  String dashboardError = '';
  bool loading = true;
  SocketState socketState = SocketState.connecting;
  RobotPresence? presence;
  CropScan? latestScan;
  List<CropScan> scans = [];
  final Map<String, CommandState> commands = {'scan': const CommandState(CommandPhase.idle), 'publish': const CommandState(CommandPhase.idle)};

  io.Socket? _socket;
  String? _sessionKey;
  final Map<String, String> _pendingIds = {};
  final Map<String, Timer> _timers = {};
  bool _disposed = false;

  bool get online {
    final p = presence;
    if (p != null) return p.online;
    final updated = dashboard?.lastUpdated;
    return updated != null && DateTime.now().difference(updated).inMinutes < 2;
  }

  void _onAuthChanged() {
    final key = auth.status == AuthStatus.signedIn ? '${auth.serverUrl}|${auth.token}' : null;
    if (key == _sessionKey) return;
    _sessionKey = key;
    _closeSocket();
    if (key == null) {
      dashboard = null;
      presence = null;
      latestScan = null;
      scans = [];
      loading = true;
      _notify();
      return;
    }
    _start();
  }

  Future<void> _start() async {
    await refresh();
    loading = false;
    _notify();
    _openSocket();
  }

  Future<void> _guard(Future<void> Function() action) async {
    try {
      await action();
    } on ApiException catch (e) {
      if (e.isUnauthorized) await auth.logout();
    } catch (_) {}
  }

  Future<void> refresh() async {
    await Future.wait([
      () async {
        try {
          dashboard = DashboardData.fromJson(Map<String, dynamic>.from(await api.get('/api/robot/dashboard') as Map));
          dashboardError = '';
        } on ApiException catch (e) {
          if (e.isUnauthorized) return auth.logout();
          dashboardError = e.message;
        }
      }(),
      _guard(() async => presence = RobotPresence.fromJson(Map<String, dynamic>.from(await api.get('/api/robot/status') as Map))),
      _guard(() async {
        final data = await api.get('/api/robot/detections/latest');
        latestScan = data is Map ? CropScan.fromJson(Map<String, dynamic>.from(data)) : null;
      }),
      _guard(() async {
        final data = await api.get('/api/robot/detections?limit=12') as List;
        scans = data.map((e) => CropScan.fromJson(Map<String, dynamic>.from(e as Map))).toList();
      }),
    ]);
    _notify();
  }

  Future<List<HistoryPoint>> history(HistoryRange range) async {
    final data = Map<String, dynamic>.from(await api.get('/api/robot/history?range=${range.name}') as Map);
    return (data['readings'] as List).map((e) => HistoryPoint.fromJson(Map<String, dynamic>.from(e as Map))).toList();
  }

  Future<CropScan> scanById(String id) async => CropScan.fromJson(Map<String, dynamic>.from(await api.get('/api/robot/detections/$id') as Map));

  void _openSocket() {
    final token = auth.token;
    if (token == null) return;
    socketState = SocketState.connecting;
    var connectedBefore = false;
    final socket = io.io(
      auth.serverUrl,
      io.OptionBuilder().setTransports(['websocket', 'polling']).setAuth({'token': token}).disableAutoConnect().enableReconnection().build(),
    );
    socket.onConnect((_) {
      socketState = SocketState.live;
      if (connectedBefore) refresh(); // re-sync anything missed while offline
      connectedBefore = true;
      _notify();
    });
    socket.onDisconnect((_) {
      socketState = SocketState.offline;
      _notify();
    });
    socket.onConnectError((error) {
      socketState = SocketState.offline;
      if ('$error'.contains('Socket authentication failed')) auth.logout();
      _notify();
    });
    socket.on('robot:data', (data) {
      dashboard = DashboardData.fromJson(Map<String, dynamic>.from(data as Map));
      dashboardError = '';
      _notify();
    });
    socket.on('robot:status', (data) {
      presence = RobotPresence.fromJson(Map<String, dynamic>.from(data as Map));
      _notify();
    });
    socket.on('robot:detection', (data) {
      final scan = CropScan.fromJson(Map<String, dynamic>.from(data as Map));
      latestScan = scan;
      scans = [scan.withoutImage(), ...scans.where((s) => s.id != scan.id)].take(12).toList();
      _setCommand('scan', CommandState(CommandPhase.done, scan.label));
    });
    socket.on('robot:command', (data) {
      final map = Map<String, dynamic>.from(data as Map);
      final type = _pendingIds.remove(map['id']);
      if (type == null) return;
      final ok = map['ok'] == true;
      _setCommand(type, CommandState(ok ? CommandPhase.done : CommandPhase.failed, map['message'] as String? ?? (ok ? null : 'AgriBot could not complete the request.')));
    });
    socket.connect();
    _socket = socket;
  }

  void _closeSocket() {
    _socket?.dispose();
    _socket = null;
  }

  void _setCommand(String type, CommandState state) {
    commands[type] = state;
    _timers.remove(type)?.cancel();
    if (state.phase == CommandPhase.done) {
      _timers[type] = Timer(const Duration(milliseconds: 2500), () {
        commands[type] = const CommandState(CommandPhase.idle);
        _notify();
      });
    }
    _notify();
  }

  Future<void> runCommand(String type) async {
    _setCommand(type, const CommandState(CommandPhase.pending));
    try {
      final data = Map<String, dynamic>.from(await api.post('/api/robot/commands', {'type': type}) as Map);
      final id = data['id'] as String;
      _pendingIds[id] = type;
      _timers[type] = Timer(const Duration(seconds: 60), () {
        if (_pendingIds.remove(id) != null) _setCommand(type, const CommandState(CommandPhase.failed, 'AgriBot did not respond in time.'));
      });
    } on ApiException catch (e) {
      if (e.isUnauthorized) return auth.logout();
      _setCommand(type, CommandState(CommandPhase.failed, e.message));
    }
  }

  void _notify() {
    if (!_disposed) notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    auth.removeListener(_onAuthChanged);
    for (final t in _timers.values) {
      t.cancel();
    }
    _closeSocket();
    super.dispose();
  }
}
