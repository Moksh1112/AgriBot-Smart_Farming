import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../core/config.dart';
import '../models/robot.dart';
import '../services/api_client.dart';

enum AuthStatus { restoring, signedOut, signedIn }

/// Session + server address. The JWT lives in the Keychain / Keystore.
class AuthController extends ChangeNotifier {
  AuthController() {
    api = ApiClient(baseUrl: () => serverUrl, token: () => _token);
  }

  static const _tokenKey = 'AGRIBOT_AUTH_TOKEN';
  static const _serverKey = 'AGRIBOT_SERVER_URL';
  final _storage = const FlutterSecureStorage();

  late final ApiClient api;
  AuthStatus status = AuthStatus.restoring;
  AuthUser? user;
  String serverUrl = kDefaultApiUrl;
  String? _token;
  String? get token => _token;

  Future<void> restore() async {
    try {
      serverUrl = (await _storage.read(key: _serverKey)) ?? kDefaultApiUrl;
      _token = await _storage.read(key: _tokenKey);
      if (_token != null) {
        final me = await api.request('GET', '/api/auth/me');
        user = AuthUser.fromJson(Map<String, dynamic>.from(me['user'] as Map));
        status = AuthStatus.signedIn;
      } else {
        status = AuthStatus.signedOut;
      }
    } on ApiException catch (e) {
      // Keep the token if the server is merely unreachable; drop it if rejected.
      if (e.isUnauthorized) await _clearToken();
      status = _token != null && !e.isUnauthorized ? AuthStatus.signedIn : AuthStatus.signedOut;
    } catch (_) {
      status = AuthStatus.signedOut;
    }
    notifyListeners();
  }

  Future<void> setServerUrl(String url) async {
    serverUrl = url.trim().replaceAll(RegExp(r'/+$'), '');
    await _storage.write(key: _serverKey, value: serverUrl);
    notifyListeners();
  }

  Future<void> login(String email, String password) async {
    final res = await api.request('POST', '/api/auth/login', body: {'email': email, 'password': password}, auth: false);
    final token = res['token'] as String?;
    if (token == null) throw ApiException('Login succeeded, but no token was returned.');
    _token = token;
    await _storage.write(key: _tokenKey, value: token);
    user = res['user'] is Map ? AuthUser.fromJson(Map<String, dynamic>.from(res['user'] as Map)) : null;
    status = AuthStatus.signedIn;
    notifyListeners();
  }

  Future<void> signup(String name, String email, String password) async {
    await api.request('POST', '/api/auth/signup', body: {'name': name, 'email': email, 'password': password}, auth: false);
    await login(email, password);
  }

  Future<void> logout() async {
    await _clearToken();
    user = null;
    status = AuthStatus.signedOut;
    notifyListeners();
  }

  Future<void> _clearToken() async {
    _token = null;
    await _storage.delete(key: _tokenKey);
  }
}
