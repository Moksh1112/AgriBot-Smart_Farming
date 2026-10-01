import 'package:flutter/material.dart';

import '../models/robot.dart';

class DiseaseInfo {
  const DiseaseInfo(this.summary, this.actions);
  final String summary;
  final List<String> actions;
}

const Map<String, DiseaseInfo> kDiseaseInfo = {
  'Healthy': DiseaseInfo('Leaves look healthy. Keep the current watering and inspection routine.', ['Scan again in a few days', 'Keep foliage dry when irrigating']),
  'Bacterial Spot': DiseaseInfo('Small dark, water-soaked spots caused by Xanthomonas bacteria. Spreads by splashing water.',
      ['Remove and destroy spotted leaves', 'Switch to drip irrigation', 'Apply a copper-based bactericide']),
  'Early Blight': DiseaseInfo('Brown lesions with target-like rings, usually on older lower leaves (Alternaria fungus).',
      ['Prune infected lower leaves', 'Mulch to stop soil splash', 'Use chlorothalonil or a copper fungicide']),
  'Late Blight': DiseaseInfo('Fast-spreading grey-green lesions with white mould underneath (Phytophthora). Act quickly.',
      ['Remove infected plants immediately', 'Avoid overhead watering', 'Apply a protective fungicide to nearby plants']),
  'Yellow Leaf Curl Virus': DiseaseInfo('Upward-curling, yellowing leaves spread by whiteflies. Infected plants cannot be cured.',
      ['Uproot infected plants', 'Control whiteflies with sticky traps or neem', 'Use resistant varieties next season']),
};

enum InsightTone { good, watch, alert }

class Insight {
  const Insight(this.tone, this.icon, this.title, this.detail);
  final InsightTone tone;
  final IconData icon;
  final String title, detail;
}

/// Simple agronomy rules over the latest readings and scan.
List<Insight> buildInsights(SensorData? s, CropScan? scan) {
  final out = <Insight>[];
  if (scan != null && scan.status == 'disease') {
    out.add(Insight(InsightTone.alert, Icons.eco, '${scan.label} detected', kDiseaseInfo[scan.label]?.actions.first ?? 'Inspect the affected plants.'));
  } else if (scan != null && scan.status == 'healthy') {
    out.add(const Insight(InsightTone.good, Icons.eco, 'Crop looks healthy', 'The latest camera scan found no disease.'));
  }
  if (s == null) return out;
  final m = s.soilMoisture.round();
  if (s.soilMoisture < 30) {
    out.add(Insight(InsightTone.alert, Icons.water_drop, 'Soil is dry', 'Moisture is $m%. Irrigate today.'));
  } else if (s.soilMoisture > 80) {
    out.add(const Insight(InsightTone.watch, Icons.water_drop, 'Soil is saturated', 'Pause irrigation to avoid root rot.'));
  } else {
    out.add(Insight(InsightTone.good, Icons.water_drop, 'Moisture on target', '$m% is within the 30–80% range.'));
  }
  if (s.temperature > 35) out.add(const Insight(InsightTone.alert, Icons.thermostat, 'Heat stress risk', 'Water early morning and consider shade netting.'));
  if (s.temperature < 10) out.add(const Insight(InsightTone.watch, Icons.thermostat, 'Cold night ahead', 'Protect seedlings from low temperatures.'));
  if (s.humidity > 80 && s.temperature >= 15 && s.temperature <= 30) {
    out.add(const Insight(InsightTone.watch, Icons.cloud, 'Blight-friendly weather', 'Humid and mild conditions favour early and late blight. Scan leaves.'));
  }
  if (s.rainfall >= 50) out.add(const Insight(InsightTone.watch, Icons.umbrella, 'Rain detected', 'Skip irrigation and check drainage.'));
  final ph = s.ph;
  if (ph != null && ph < 5.5) out.add(Insight(InsightTone.watch, Icons.science, 'Soil is acidic', 'pH ${ph.toStringAsFixed(1)}. Tomatoes prefer 6.0–6.8; consider liming.'));
  if (ph != null && ph > 7.5) out.add(Insight(InsightTone.watch, Icons.science, 'Soil is alkaline', 'pH ${ph.toStringAsFixed(1)}. Add organic matter or sulfur.'));
  return out;
}
