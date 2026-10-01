import 'package:agribot/core/crop_advice.dart';
import 'package:agribot/core/format.dart';
import 'package:agribot/models/robot.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('parses dashboard payload from the backend', () {
    final d = DashboardData.fromJson({
      'sensors': {'soilMoisture': 25, 'temperature': 36.5, 'humidity': 60, 'rainfall': 0, 'ph': null},
      'robot': {'status': 'online', 'lastUpdated': '2026-10-01T08:49:30.637Z'},
      'location': {'latitude': 19.04, 'longitude': 72.87},
    });
    expect(d.sensors.soilMoisture, 25);
    expect(d.sensors.ph, isNull);
    expect(d.lastUpdated, isNotNull);
  });

  test('parses scans and presence', () {
    final scan = CropScan.fromJson({
      'id': 'a1',
      'summary': {'status': 'disease', 'label': 'Late Blight', 'confidence': 0.86},
      'detections': [
        {'label': 'Late Blight', 'confidence': 0.86, 'box': [1, 2, 3, 4]},
      ],
      'createdAt': '2026-10-01T08:49:30.637Z',
    });
    expect(scan.detections.single.label, 'Late Blight');
    final p = RobotPresence.fromJson({
      'online': true,
      'info': {
        'version': '2.0.0',
        'capabilities': {'camera': null, 'model': true, 'sensors': 'simulated', 'ble': false},
        'network': {'ssid': 'Farm', 'ip': '10.0.0.5'},
      },
    });
    expect(p.model, isTrue);
    expect(p.camera, isNull);
    expect(p.ssid, 'Farm');
  });

  test('insights flag dry soil, heat and disease', () {
    final s = SensorData(soilMoisture: 20, temperature: 37, humidity: 50, rainfall: 0);
    final scan = CropScan(id: 'x', status: 'disease', label: 'Early Blight', confidence: 0.7, detections: const []);
    final titles = buildInsights(s, scan).map((i) => i.title).toList();
    expect(titles, containsAll(['Early Blight detected', 'Soil is dry', 'Heat stress risk']));
  });

  test('formats numbers', () {
    expect(round1(48.0), '48');
    expect(round1(48.56), '48.6');
    expect(percent(0.864), '86%');
  });
}
