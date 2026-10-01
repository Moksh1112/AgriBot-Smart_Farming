import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import 'core/theme.dart';
import 'screens/auth_screens.dart';
import 'screens/home_shell.dart';
import 'state/auth_controller.dart';
import 'state/ble_controller.dart';
import 'state/robot_controller.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
  final auth = AuthController()..restore();
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: auth),
        ChangeNotifierProvider(create: (_) => RobotController(auth)),
        ChangeNotifierProvider(create: (_) => BleController()),
      ],
      child: const AgriBotApp(),
    ),
  );
}

class AgriBotApp extends StatelessWidget {
  const AgriBotApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'AgriBot',
      debugShowCheckedModeBanner: false,
      theme: buildTheme(),
      home: const _AuthGate(),
    );
  }
}

class _AuthGate extends StatelessWidget {
  const _AuthGate();

  @override
  Widget build(BuildContext context) {
    final status = context.select<AuthController, AuthStatus>((a) => a.status);
    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 250),
      child: switch (status) {
        AuthStatus.restoring => const Scaffold(key: ValueKey('restoring'), backgroundColor: AgriColors.forest, body: Center(child: CircularProgressIndicator(color: AgriColors.mint))),
        AuthStatus.signedOut => const AuthFlow(key: ValueKey('auth')),
        AuthStatus.signedIn => const HomeShell(key: ValueKey('home')),
      },
    );
  }
}
