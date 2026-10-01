// Drives the app through every screen for store / website screenshots.
// Run with tool/screenshots.sh, which captures the simulator at each SHOT marker.
import 'package:agribot/main.dart' as app;
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

const _email = String.fromEnvironment('DEMO_EMAIL', defaultValue: 'demo@agribot.app');
const _password = String.fromEnvironment('DEMO_PASSWORD', defaultValue: 'demo12345');

Future<void> settle(WidgetTester tester, [int ms = 2500]) async {
  // Animations repeat (map marker pulse), so pump for a fixed time instead of pumpAndSettle.
  for (var t = 0; t < ms; t += 100) {
    await tester.pump(const Duration(milliseconds: 100));
  }
}

Future<void> shot(WidgetTester tester, String name, {int waitMs = 2500}) async {
  await settle(tester, waitMs);
  // ignore: avoid_print
  print('SHOT:$name');
  await settle(tester, 2500); // hold still while the screenshot is taken
}

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('capture app screens', (tester) async {
    app.main();
    await settle(tester, 4000);

    if (find.text('Welcome back').evaluate().isNotEmpty) {
      await shot(tester, '01-login', waitMs: 500);
      await tester.enterText(find.byType(TextField).at(0), _email);
      await tester.enterText(find.byType(TextField).at(1), _password);
      FocusManager.instance.primaryFocus?.unfocus();
      await settle(tester, 800);
      await tester.tap(find.widgetWithText(FilledButton, 'Log in'));
    }

    await shot(tester, '02-field', waitMs: 9000); // map tiles load over the network
    await tester.tap(find.text('Analysis'));
    await shot(tester, '03-analysis', waitMs: 1200);
    await tester.tap(find.text('Trends'));
    await shot(tester, '04-trends', waitMs: 2500);
    await tester.tap(find.text('Overview'));
    await settle(tester, 600);

    await tester.tap(find.byIcon(Icons.center_focus_strong_outlined));
    await shot(tester, '05-scan', waitMs: 2000);

    await tester.tap(find.byIcon(Icons.memory_outlined));
    await shot(tester, '06-robot', waitMs: 2000);

    await tester.tap(find.byIcon(Icons.map_outlined));
    await settle(tester, 1000);
    await tester.tap(find.byTooltip('Open full map'));
    await shot(tester, '07-map', waitMs: 7000);
  });
}
