import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

class ApiException implements Exception {
  ApiException(this.message, [this.status]);
  final String message;
  final int? status;
  bool get isUnauthorized => status == 401;
  @override
  String toString() => message;
}

/// JSON client for the AgriBot backend. Responses look like {success, message, data}.
class ApiClient {
  ApiClient({required this.baseUrl, required this.token});

  /// Read lazily so server/token changes apply immediately.
  final String Function() baseUrl;
  final String? Function() token;
  final http.Client _http = http.Client();

  static const _unreachable = 'Unable to reach the AgriBot server. Check the server address and that the phone is on the same network.';

  Future<Map<String, dynamic>> request(String method, String path, {Object? body, bool auth = true, Duration timeout = const Duration(seconds: 12)}) async {
    final headers = <String, String>{'Content-Type': 'application/json'};
    if (auth) {
      final t = token();
      if (t == null) throw ApiException('Your session has expired. Please log in again.', 401);
      headers['Authorization'] = 'Bearer $t';
    }
    final uri = Uri.parse('${baseUrl()}$path');
    http.Response response;
    try {
      final req = http.Request(method, uri)..headers.addAll(headers);
      if (body != null) req.body = jsonEncode(body);
      response = await http.Response.fromStream(await _http.send(req).timeout(timeout));
    } on TimeoutException {
      throw ApiException(_unreachable);
    } catch (_) {
      throw ApiException(_unreachable);
    }

    Map<String, dynamic>? json;
    try {
      json = jsonDecode(response.body) as Map<String, dynamic>;
    } catch (_) {}

    if (response.statusCode == 401 && auth) throw ApiException('Your session has expired. Please log in again.', 401);
    if (response.statusCode >= 400 || json == null || json['success'] != true) {
      throw ApiException((json?['message'] as String?) ?? 'The AgriBot server returned an unexpected response.', response.statusCode);
    }
    return json;
  }

  Future<dynamic> get(String path) async => (await request('GET', path))['data'];
  Future<dynamic> post(String path, Object body) async => (await request('POST', path, body: body))['data'];

  /// Checks a server address without saving it.
  static Future<bool> ping(String url) async {
    try {
      final res = await http.get(Uri.parse('$url/api/health')).timeout(const Duration(seconds: 6));
      return res.statusCode == 200 && res.body.contains('"success":true');
    } catch (_) {
      return false;
    }
  }
}
