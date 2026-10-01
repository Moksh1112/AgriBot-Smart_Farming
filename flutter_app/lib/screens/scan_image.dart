import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';

import '../core/theme.dart';
import '../models/robot.dart';
import '../widgets/common.dart';

final Map<String, Uint8List> _decoded = {};

/// Shows a scan's annotated JPEG (a base64 data URI), or a hatched placeholder.
class ScanImage extends StatelessWidget {
  const ScanImage({super.key, required this.scan, this.iconSize = 56, this.placeholder});
  final CropScan? scan;
  final double iconSize;
  final String? placeholder;

  @override
  Widget build(BuildContext context) {
    final uri = scan?.image;
    if (uri != null && uri.contains(',')) {
      final bytes = _decoded.putIfAbsent(scan!.id, () => base64Decode(uri.substring(uri.indexOf(',') + 1)));
      return Image.memory(bytes, fit: BoxFit.cover, gaplessPlayback: true);
    }
    return Container(
      color: AgriColors.mint,
      child: Hatch(
        child: Center(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Icon(Icons.center_focus_strong_outlined, size: iconSize, color: AgriColors.forest),
            if (placeholder != null) ...[
              const SizedBox(height: 8),
              Text(placeholder!, style: const TextStyle(color: AgriColors.forest, fontWeight: FontWeight.w700)),
            ],
          ]),
        ),
      ),
    );
  }
}
