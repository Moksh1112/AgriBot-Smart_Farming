import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';

import '../core/format.dart';
import '../core/theme.dart';
import '../models/robot.dart';
import '../state/robot_controller.dart';
import '../widgets/common.dart';
import '../widgets/field_map.dart';

/// Full-screen field map with the reference's floating round controls.
class MapScreen extends StatefulWidget {
  const MapScreen({super.key});
  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  final _map = MapController();

  void _zoom(double delta) => _map.move(_map.camera.center, (_map.camera.zoom + delta).clamp(3, 19));

  @override
  Widget build(BuildContext context) {
    final robot = context.watch<RobotController>();
    final data = robot.dashboard ?? DashboardData.sample();
    final pad = MediaQuery.paddingOf(context);
    return Scaffold(
      body: Stack(children: [
        Positioned.fill(child: FieldMap(latitude: data.latitude, longitude: data.longitude, online: robot.online, controller: _map)),
        Positioned(top: pad.top + 8, left: 18, child: RoundButton(icon: Icons.arrow_back, tooltip: 'Back', onPressed: () => Navigator.pop(context))),
        Positioned(
          top: pad.top + 110,
          right: 18,
          child: Column(children: [
            RoundButton(icon: Icons.add, tooltip: 'Zoom in', onPressed: () => _zoom(1)),
            const SizedBox(height: 12),
            RoundButton(icon: Icons.remove, tooltip: 'Zoom out', onPressed: () => _zoom(-1)),
            const SizedBox(height: 12),
            RoundButton(icon: Icons.my_location, tooltip: 'Center on robot', onPressed: () => _map.move(LatLng(data.latitude, data.longitude), 17)),
          ]),
        ),
        Positioned(
          left: 16,
          right: 16,
          bottom: pad.bottom + 20,
          child: AgriCard(
            radius: 30,
            padding: const EdgeInsets.all(14),
            child: Row(children: [
              const IconCircle(Icons.eco, size: 46, background: AgriColors.mint, color: AgriColors.forest),
              const SizedBox(width: 12),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('AgriBot field', style: AgriText.cardTitle),
                  Text('${data.latitude.toStringAsFixed(5)}, ${data.longitude.toStringAsFixed(5)}', style: AgriText.small),
                  Text(robot.dashboard != null ? 'Updated ${timeAgo(data.lastUpdated)}' : 'Sample position, waiting for live data', style: AgriText.small),
                ]),
              ),
              StatusPill(robot.online ? 'Online' : 'Offline', tone: robot.online ? PillTone.good : PillTone.warn),
            ]),
          ),
        ),
      ]),
    );
  }
}
