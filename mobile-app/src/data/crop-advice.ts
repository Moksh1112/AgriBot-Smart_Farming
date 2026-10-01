import type { CropScan, SensorData } from '@/types/robot';

type DiseaseInfo = { summary: string; actions: string[] };

export const DISEASE_INFO: Record<string, DiseaseInfo> = {
  Healthy: {
    summary: 'Leaves look healthy. Keep the current watering and inspection routine.',
    actions: ['Scan again in a few days', 'Keep foliage dry when irrigating'],
  },
  'Bacterial Spot': {
    summary: 'Small dark, water-soaked spots caused by Xanthomonas bacteria. Spreads by splashing water.',
    actions: ['Remove and destroy spotted leaves', 'Switch to drip irrigation', 'Apply a copper-based bactericide'],
  },
  'Early Blight': {
    summary: 'Brown lesions with target-like rings, usually on older lower leaves (Alternaria fungus).',
    actions: ['Prune infected lower leaves', 'Mulch to stop soil splash', 'Use chlorothalonil or a copper fungicide'],
  },
  'Late Blight': {
    summary: 'Fast-spreading grey-green lesions with white mould underneath (Phytophthora). Act quickly.',
    actions: ['Remove infected plants immediately', 'Avoid overhead watering', 'Apply a protective fungicide to nearby plants'],
  },
  'Yellow Leaf Curl Virus': {
    summary: 'Upward-curling, yellowing leaves spread by whiteflies. Infected plants cannot be cured.',
    actions: ['Uproot infected plants', 'Control whiteflies with sticky traps or neem', 'Use resistant varieties next season'],
  },
};

export type Insight = { id: string; tone: 'good' | 'watch' | 'alert'; icon: string; title: string; detail: string };

// Simple agronomy rules over the latest readings and scan.
export function buildInsights(sensors: SensorData | null, scan: CropScan | null): Insight[] {
  const insights: Insight[] = [];
  if (scan && scan.summary.status === 'disease') {
    insights.push({ id: 'disease', tone: 'alert', icon: 'leaf', title: `${scan.summary.label} detected`, detail: DISEASE_INFO[scan.summary.label]?.actions[0] ?? 'Inspect the affected plants.' });
  } else if (scan && scan.summary.status === 'healthy') {
    insights.push({ id: 'healthy', tone: 'good', icon: 'leaf', title: 'Crop looks healthy', detail: 'The latest camera scan found no disease.' });
  }
  if (!sensors) return insights;

  const { soilMoisture, temperature, humidity, rainfall, ph } = sensors;
  if (soilMoisture < 30) insights.push({ id: 'dry', tone: 'alert', icon: 'water', title: 'Soil is dry', detail: `Moisture is ${soilMoisture}%. Irrigate today.` });
  else if (soilMoisture > 80) insights.push({ id: 'wet', tone: 'watch', icon: 'water', title: 'Soil is saturated', detail: 'Pause irrigation to avoid root rot.' });
  else insights.push({ id: 'moist', tone: 'good', icon: 'water', title: 'Moisture on target', detail: `${soilMoisture}% is within the 30–80% range.` });

  if (temperature > 35) insights.push({ id: 'heat', tone: 'alert', icon: 'thermometer', title: 'Heat stress risk', detail: 'Water early morning and consider shade netting.' });
  else if (temperature < 10) insights.push({ id: 'cold', tone: 'watch', icon: 'thermometer', title: 'Cold night ahead', detail: 'Protect seedlings from low temperatures.' });

  if (humidity > 80 && temperature >= 15 && temperature <= 30) {
    insights.push({ id: 'blight', tone: 'watch', icon: 'cloud', title: 'Blight-friendly weather', detail: 'Humid and mild conditions favour early and late blight. Scan leaves.' });
  }
  if (rainfall >= 50) insights.push({ id: 'rain', tone: 'watch', icon: 'rainy', title: 'Rain detected', detail: 'Skip irrigation and check drainage.' });
  if (typeof ph === 'number') {
    if (ph < 5.5) insights.push({ id: 'acid', tone: 'watch', icon: 'flask', title: 'Soil is acidic', detail: `pH ${ph.toFixed(1)}. Tomatoes prefer 6.0–6.8; consider liming.` });
    else if (ph > 7.5) insights.push({ id: 'alkaline', tone: 'watch', icon: 'flask', title: 'Soil is alkaline', detail: `pH ${ph.toFixed(1)}. Add organic matter or sulfur.` });
  }
  return insights;
}
