import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../core/theme.dart';

/// Turns OpenStreetMap tiles into the soft mint field-map look of the design.
const _mintTint = ColorFilter.matrix(<double>[
  0.17, 0.57, 0.06, 0, 40, //
  0.19, 0.64, 0.07, 0, 52,
  0.16, 0.54, 0.05, 0, 30,
  0, 0, 0, 1, 0,
]);

/// Native field map: OSM tiles, a dashed field boundary and the robot marker.
class FieldMap extends StatefulWidget {
  const FieldMap({super.key, required this.latitude, required this.longitude, required this.online, this.interactive = true, this.controller, this.fieldRadius = 70});
  final double latitude, longitude;
  final bool online, interactive;
  final MapController? controller;
  final double fieldRadius;

  @override
  State<FieldMap> createState() => _FieldMapState();
}

class _FieldMapState extends State<FieldMap> {
  late final MapController _controller = widget.controller ?? MapController();
  bool _ready = false;

  LatLng get _point => LatLng(widget.latitude, widget.longitude);

  @override
  void didUpdateWidget(FieldMap old) {
    super.didUpdateWidget(old);
    final moved = old.latitude != widget.latitude || old.longitude != widget.longitude;
    // Preview maps follow the robot; interactive maps let the farmer pan freely.
    if (moved && _ready && !widget.interactive) _controller.move(_point, _controller.camera.zoom);
  }

  List<LatLng> _fieldOutline() {
    const distance = Distance();
    return [for (var a = 0; a < 360; a += 8) distance.offset(_point, widget.fieldRadius, a.toDouble())];
  }

  @override
  Widget build(BuildContext context) {
    return FlutterMap(
      mapController: _controller,
      options: MapOptions(
        initialCenter: _point,
        initialZoom: 17,
        backgroundColor: AgriColors.mint,
        onMapReady: () => _ready = true,
        interactionOptions: InteractionOptions(flags: widget.interactive ? InteractiveFlag.all & ~InteractiveFlag.rotate : InteractiveFlag.none),
      ),
      children: [
        TileLayer(
          urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          userAgentPackageName: 'com.rayyanshaikh.agribot',
          maxZoom: 19,
          tileBuilder: (context, tile, _) => ColorFiltered(colorFilter: _mintTint, child: tile),
        ),
        PolygonLayer(polygons: [
          Polygon(
            points: _fieldOutline(),
            color: AgriColors.mintStrong.withValues(alpha: 0.5),
            borderColor: AgriColors.forest,
            borderStrokeWidth: 2,
            pattern: StrokePattern.dashed(segments: const [8, 6]),
          ),
        ]),
        MarkerLayer(markers: [
          Marker(
            point: _point,
            width: 70,
            height: 70,
            child: _RobotMarker(online: widget.online),
          ),
        ]),
        const SimpleAttributionWidget(source: Text('OpenStreetMap contributors'), backgroundColor: Color(0xB3FFFFFF)),
      ],
    );
  }
}

class _RobotMarker extends StatefulWidget {
  const _RobotMarker({required this.online});
  final bool online;
  @override
  State<_RobotMarker> createState() => _RobotMarkerState();
}

class _RobotMarkerState extends State<_RobotMarker> with SingleTickerProviderStateMixin {
  late final AnimationController _pulse = AnimationController(vsync: this, duration: const Duration(seconds: 2))..repeat();

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final core = Container(
      width: 46,
      height: 46,
      decoration: BoxDecoration(
        color: widget.online ? AgriColors.forest : const Color(0xFF8A968E),
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white, width: 4),
        boxShadow: kSoftShadow,
      ),
      child: const Icon(Icons.eco, color: AgriColors.mint, size: 22),
    );
    if (!widget.online) return Center(child: core);
    return AnimatedBuilder(
      animation: _pulse,
      builder: (context, child) => Stack(alignment: Alignment.center, children: [
        Container(
          width: 46 + 24 * _pulse.value,
          height: 46 + 24 * _pulse.value,
          decoration: BoxDecoration(shape: BoxShape.circle, color: const Color(0xFF8ACB6E).withValues(alpha: 0.45 * (1 - _pulse.value))),
        ),
        child!,
      ]),
      child: core,
    );
  }
}
