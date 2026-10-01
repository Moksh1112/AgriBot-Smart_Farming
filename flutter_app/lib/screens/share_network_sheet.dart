import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/theme.dart';
import '../state/auth_controller.dart';
import '../state/ble_controller.dart';
import '../widgets/common.dart';

Future<void> showShareNetworkSheet(BuildContext context) => showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AgriColors.surface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(34))),
      builder: (_) => const _ShareNetworkSheet(),
    );

class _ShareNetworkSheet extends StatefulWidget {
  const _ShareNetworkSheet();
  @override
  State<_ShareNetworkSheet> createState() => _ShareNetworkSheetState();
}

class _ShareNetworkSheetState extends State<_ShareNetworkSheet> {
  final _ssid = TextEditingController();
  final _password = TextEditingController();
  final _pin = TextEditingController();
  bool _showPassword = false;
  bool _sendBackend = true;
  bool _sending = false;
  bool _refreshing = false;
  bool _timedOut = false;
  String _sendError = '';
  // What we sent, and the Pi's last-command marker at that moment, so we can
  // recognise its reply without relying on the phone and Pi clocks agreeing.
  ({String ssid, Object? lastAt})? _sent;
  Timer? _timeout;

  @override
  void dispose() {
    _timeout?.cancel();
    _ssid.dispose();
    _password.dispose();
    _pin.dispose();
    super.dispose();
  }

  Future<void> _share(BleController ble, String backendUrl) async {
    final ssid = _ssid.text.trim();
    if (ssid.isEmpty) return setState(() => _sendError = 'Choose or type a network name.');
    if ((ble.status?.pinRequired ?? false) && _pin.text.trim().isEmpty) return setState(() => _sendError = 'Enter the pairing PIN set on the robot.');
    setState(() {
      _sendError = '';
      _timedOut = false;
      _sending = true;
    });
    try {
      final lastAt = ble.status?.last?['at'];
      await ble.share(ssid: ssid, password: _password.text, backend: _sendBackend ? backendUrl : null, pin: _pin.text.trim().isEmpty ? null : _pin.text.trim());
      _sent = (ssid: ssid, lastAt: lastAt);
      _timeout?.cancel();
      _timeout = Timer(const Duration(seconds: 75), () => mounted ? setState(() => _timedOut = true) : null);
    } catch (e) {
      _sendError = e.toString().replaceFirst('Exception: ', '');
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  (PillTone, String)? _progress(PiBleStatus? status) {
    if (_sendError.isNotEmpty) return (PillTone.bad, _sendError);
    final sent = _sent;
    if (sent == null || status == null) return null;
    final last = status.last != null && status.last!['at'] != sent.lastAt ? status.last : null;
    if (last != null && last['ok'] != true) return (PillTone.bad, (last['error'] as String?) ?? 'AgriBot rejected the request.');
    if (status.wifiState == 'connected' && status.ssid == sent.ssid) {
      return (
        PillTone.good,
        'Connected to ${status.ssid}${status.ip != null ? ' · ${status.ip}' : ''}${status.internet ? ' · Internet OK' : ''}${status.backendOk ? ' · Server reachable' : ''}'
      );
    }
    if (status.wifiState == 'failed' && status.target == sent.ssid) return (PillTone.bad, status.wifiError ?? 'Could not join ${sent.ssid}.');
    if (_timedOut) return (PillTone.bad, 'AgriBot has not joined the network yet. Check the password and that the network is in range.');
    return (PillTone.warn, 'AgriBot is joining ${sent.ssid}…');
  }

  @override
  Widget build(BuildContext context) {
    final ble = context.watch<BleController>();
    final backendUrl = context.select<AuthController, String>((a) => a.serverUrl);
    final progress = _progress(ble.status);
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.85,
        maxChildSize: 0.95,
        builder: (context, scroll) => ListView(controller: scroll, padding: const EdgeInsets.fromLTRB(20, 10, 20, 28), children: [
          Center(child: Container(width: 44, height: 5, decoration: BoxDecoration(color: AgriColors.border, borderRadius: BorderRadius.circular(3)))),
          const SizedBox(height: 14),
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Share network', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800)),
                SizedBox(height: 4),
                Text("Send Wi-Fi details to AgriBot over Bluetooth. Use your phone's hotspot in the field.", style: AgriText.body),
              ]),
            ),
            IconButton.filledTonal(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close), tooltip: 'Close'),
          ]),
          const SizedBox(height: 14),
          Row(children: [
            const Expanded(child: Text('Networks AgriBot can see', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AgriColors.textMuted))),
            TextButton(
              onPressed: _refreshing
                  ? null
                  : () async {
                      setState(() => _refreshing = true);
                      await ble.refreshNetworks(pin: _pin.text.trim().isEmpty ? null : _pin.text.trim());
                      if (mounted) setState(() => _refreshing = false);
                    },
              child: Text(_refreshing ? 'Scanning…' : 'Rescan', style: const TextStyle(fontWeight: FontWeight.w800, color: AgriColors.primary)),
            ),
          ]),
          if (ble.networks.isEmpty)
            const Text('No networks reported yet. Tap Rescan, or type the name below.', style: AgriText.small)
          else
            Wrap(spacing: 8, runSpacing: 8, children: [
              for (final n in ble.networks)
                ChoiceChip(
                  selected: _ssid.text == n.ssid,
                  onSelected: (_) => setState(() => _ssid.text = n.ssid),
                  showCheckmark: false,
                  avatar: Icon(n.signal > 66 ? Icons.wifi : n.signal > 33 ? Icons.wifi_2_bar : Icons.wifi_1_bar, size: 16, color: _ssid.text == n.ssid ? AgriColors.textOnDark : AgriColors.forest),
                  label: Row(mainAxisSize: MainAxisSize.min, children: [
                    Flexible(child: Text(n.ssid, overflow: TextOverflow.ellipsis)),
                    if (n.secure) ...[const SizedBox(width: 4), Icon(Icons.lock, size: 12, color: _ssid.text == n.ssid ? AgriColors.textOnDark : AgriColors.textFaint)],
                  ]),
                  labelStyle: TextStyle(fontWeight: FontWeight.w700, color: _ssid.text == n.ssid ? AgriColors.textOnDark : AgriColors.forest),
                  backgroundColor: AgriColors.primarySoft,
                  selectedColor: AgriColors.forest,
                  side: BorderSide.none,
                  shape: const StadiumBorder(),
                ),
            ]),
          AgriTextField(label: 'Network name (SSID)', controller: _ssid, hint: "e.g. Rayyan's iPhone"),
          AgriTextField(
            label: 'Password',
            controller: _password,
            hint: 'Leave empty for open networks',
            obscure: !_showPassword,
            suffix: IconButton(
              tooltip: _showPassword ? 'Hide password' : 'Show password',
              icon: Icon(_showPassword ? Icons.visibility_off : Icons.visibility, color: AgriColors.textMuted),
              onPressed: () => setState(() => _showPassword = !_showPassword),
            ),
          ),
          if (ble.status?.pinRequired ?? false) AgriTextField(label: 'Robot pairing PIN', controller: _pin, hint: 'PIN from agribot.env', obscure: true, keyboardType: TextInputType.number),
          const SizedBox(height: 10),
          SwitchListTile.adaptive(
            contentPadding: EdgeInsets.zero,
            value: _sendBackend,
            onChanged: (v) => setState(() => _sendBackend = v),
            activeTrackColor: AgriColors.primary,
            title: const Text('Also send server address', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
            subtitle: Text(backendUrl, maxLines: 1, overflow: TextOverflow.ellipsis, style: AgriText.small),
          ),
          if (progress != null)
            Container(
              margin: const EdgeInsets.only(top: 8),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: switch (progress.$1) { PillTone.good => const Color(0xFFDDF3DF), PillTone.bad => const Color(0xFFFBE3E1), _ => AgriColors.primarySoft },
                borderRadius: BorderRadius.circular(18),
              ),
              child: Row(children: [
                switch (progress.$1) {
                  PillTone.good => const Icon(Icons.check_circle, color: AgriColors.success),
                  PillTone.bad => const Icon(Icons.error, color: AgriColors.error),
                  _ => const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)),
                },
                const SizedBox(width: 10),
                Expanded(child: Text(progress.$2, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, height: 1.4))),
              ]),
            ),
          const SizedBox(height: 18),
          PrimaryButton(icon: Icons.share, label: progress?.$1 == PillTone.good ? 'Share again' : 'Share network', loading: _sending, onPressed: () => _share(ble, backendUrl)),
        ]),
      ),
    );
  }
}
