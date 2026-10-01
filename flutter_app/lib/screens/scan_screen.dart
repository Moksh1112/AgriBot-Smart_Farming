import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/crop_advice.dart';
import '../core/format.dart';
import '../core/theme.dart';
import '../models/robot.dart';
import '../state/robot_controller.dart';
import '../widgets/common.dart';
import 'scan_image.dart';

const _statusText = {'healthy': 'Healthy crop', 'disease': 'Disease detected', 'none': 'No leaves found'};

class ScanScreen extends StatefulWidget {
  const ScanScreen({super.key});
  @override
  State<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends State<ScanScreen> {
  CropScan? _selected; // a historic scan being viewed; null = latest
  bool _loadingScan = false;
  String? _lastLatestId;

  Future<void> _open(RobotController robot, CropScan item) async {
    if (item.id == robot.latestScan?.id) {
      setState(() => _selected = null);
      return;
    }
    setState(() => _loadingScan = true);
    try {
      final full = await robot.scanById(item.id);
      if (mounted) setState(() => _selected = full);
    } catch (_) {
      if (mounted) setState(() => _selected = item);
    } finally {
      if (mounted) setState(() => _loadingScan = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final robot = context.watch<RobotController>();
    // A new live scan replaces whatever historic scan was being viewed.
    if (robot.latestScan?.id != _lastLatestId) {
      _lastLatestId = robot.latestScan?.id;
      _selected = null;
    }
    final scan = _selected ?? robot.latestScan;
    final p = robot.presence;
    final cameraReady = p != null && p.camera != null && p.model;
    final canScan = robot.online && cameraReady;
    final command = robot.commands['scan']!;

    final (pillLabel, pillTone) = !robot.online
        ? ('Robot offline', PillTone.warn)
        : !(p?.model ?? false)
            ? ('Model missing', PillTone.bad)
            : p?.camera == null
                ? ('No camera', PillTone.warn)
                : ('Camera ready', PillTone.good);

    final helper = switch (command.phase) {
      CommandPhase.failed => command.message ?? 'Scan failed.',
      CommandPhase.pending => 'AgriBot is capturing a photo and running the disease model.',
      _ => !robot.online
          ? 'Connect AgriBot to the network from the Robot tab to scan.'
          : !cameraReady
              ? 'Attach a camera and copy best.onnx to the Pi to enable scans.'
              : 'Captures a photo with the robot camera and checks it for 4 tomato diseases.',
    };
    final info = scan == null ? null : kDiseaseInfo[scan.label];

    return SafeArea(
      bottom: false,
      child: RefreshIndicator(
        onRefresh: robot.refresh,
        child: ListView(padding: const EdgeInsets.fromLTRB(16, 16, 16, 130), children: [
          Row(children: [
            const Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('AI crop doctor', style: AgriText.eyebrow),
                Text('Leaf scan', style: AgriText.title),
              ]),
            ),
            StatusPill(pillLabel, tone: pillTone),
          ]),
          const SizedBox(height: 18),
          Container(
            decoration: BoxDecoration(borderRadius: BorderRadius.circular(34), boxShadow: kSoftShadow),
            clipBehavior: Clip.antiAlias,
            child: AspectRatio(
              aspectRatio: 4 / 3,
              child: Stack(fit: StackFit.expand, children: [
                if (_loadingScan) const ColoredBox(color: AgriColors.mint, child: Center(child: CircularProgressIndicator())) else ScanImage(scan: scan, placeholder: scan == null ? 'No scans yet' : 'Image not available'),
                if (scan != null)
                  Positioned(
                    left: 12,
                    right: 12,
                    bottom: 12,
                    child: Container(
                      padding: const EdgeInsets.fromLTRB(16, 12, 12, 12),
                      decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.95), borderRadius: BorderRadius.circular(24)),
                      child: Row(children: [
                        Expanded(
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text(_statusText[scan.status] ?? '', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AgriColors.textMuted)),
                            Text(scan.status == 'none' ? 'Point the camera at tomato leaves' : scan.label,
                                maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
                          ]),
                        ),
                        if (scan.confidence > 0)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            decoration: BoxDecoration(color: AgriColors.forest, borderRadius: BorderRadius.circular(999)),
                            child: Text(percent(scan.confidence), style: const TextStyle(color: AgriColors.textOnDark, fontWeight: FontWeight.w800)),
                          ),
                      ]),
                    ),
                  ),
              ]),
            ),
          ),
          if (scan != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(6, 10, 6, 0),
              child: Text(
                '${_selected != null ? '${formatDay(scan.createdAt)}, ${formatTime(scan.createdAt)}' : 'Latest scan · ${timeAgo(scan.createdAt)}'}${scan.inferenceMs != null ? ' · ${scan.inferenceMs} ms on the Pi' : ''}',
                style: AgriText.small,
              ),
            ),
          const SizedBox(height: 18),
          PrimaryButton(
            label: command.phase == CommandPhase.pending ? 'Scanning…' : 'Scan leaves now',
            icon: Icons.center_focus_strong,
            loading: command.phase == CommandPhase.pending,
            onPressed: canScan ? () => robot.runCommand('scan') : null,
          ),
          const SizedBox(height: 10),
          Text(helper, textAlign: TextAlign.center, style: AgriText.small.copyWith(color: command.phase == CommandPhase.failed ? AgriColors.error : null)),
          if (scan != null && scan.detections.isNotEmpty) ...[
            const SizedBox(height: 16),
            AgriCard(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Detections', style: AgriText.cardTitle),
                for (final d in scan.detections.take(6))
                  Padding(
                    padding: const EdgeInsets.only(top: 12),
                    child: Row(children: [
                      Container(width: 10, height: 10, decoration: BoxDecoration(color: diseaseColor(d.label), shape: BoxShape.circle)),
                      const SizedBox(width: 10),
                      SizedBox(width: 120, child: Text(d.label, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600))),
                      Expanded(
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(4),
                          child: LinearProgressIndicator(value: d.confidence, minHeight: 8, color: diseaseColor(d.label), backgroundColor: AgriColors.surfaceMuted),
                        ),
                      ),
                      SizedBox(width: 48, child: Text(percent(d.confidence), textAlign: TextAlign.right, style: const TextStyle(fontWeight: FontWeight.w700))),
                    ]),
                  ),
              ]),
            ),
          ],
          if (info != null) ...[
            const SizedBox(height: 16),
            AgriCard(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Icon(scan!.status == 'healthy' ? Icons.verified_user : Icons.medical_services,
                      color: scan.status == 'disease' ? AgriColors.error : AgriColors.success, size: 20),
                  const SizedBox(width: 8),
                  Text(scan.status == 'healthy' ? 'Keep it up' : 'What to do', style: AgriText.cardTitle),
                ]),
                const SizedBox(height: 10),
                Text(info.summary, style: AgriText.body),
                for (final a in info.actions)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      const Icon(Icons.check_circle, color: AgriColors.primary, size: 18),
                      const SizedBox(width: 8),
                      Expanded(child: Text(a, style: const TextStyle(fontSize: 14, height: 1.4))),
                    ]),
                  ),
              ]),
            ),
          ],
          if (robot.scans.isNotEmpty) ...[
            const SizedBox(height: 22),
            const Text('Recent scans', style: AgriText.section),
            const SizedBox(height: 10),
            SizedBox(
              height: 92,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                clipBehavior: Clip.none,
                itemCount: robot.scans.length,
                separatorBuilder: (_, _) => const SizedBox(width: 10),
                itemBuilder: (context, i) {
                  final item = robot.scans[i];
                  final active = (_selected?.id ?? robot.latestScan?.id) == item.id;
                  return GestureDetector(
                    onTap: () => _open(robot, item),
                    child: Container(
                      width: 150,
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(color: active ? AgriColors.forest : AgriColors.surface, borderRadius: BorderRadius.circular(18), boxShadow: kSoftShadow),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Container(width: 10, height: 10, decoration: BoxDecoration(color: diseaseColor(item.label), shape: BoxShape.circle)),
                        const SizedBox(height: 6),
                        Text(item.status == 'none' ? 'No leaves' : item.label, maxLines: 1, overflow: TextOverflow.ellipsis,
                            style: TextStyle(fontWeight: FontWeight.w800, color: active ? AgriColors.textOnDark : AgriColors.text)),
                        const SizedBox(height: 4),
                        Text('${formatDay(item.createdAt)} · ${formatTime(item.createdAt)}',
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: active ? AgriColors.textOnDarkMuted : AgriColors.textMuted)),
                      ]),
                    ),
                  );
                },
              ),
            ),
          ],
        ]),
      ),
    );
  }
}
