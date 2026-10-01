import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/theme.dart';
import '../state/auth_controller.dart';
import 'field_screen.dart';
import 'robot_screen.dart';
import 'scan_screen.dart';

/// Main app with the floating dark navigation pill from the reference.
class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  static void switchTab(BuildContext context, int index) => context.findAncestorStateOfType<_HomeShellState>()?._select(index);

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _index = 0;
  void _select(int index) => setState(() => _index = index);

  static const _tabs = [
    (Icons.map, Icons.map_outlined, 'Field'),
    (Icons.center_focus_strong, Icons.center_focus_strong_outlined, 'Leaf scan'),
    (Icons.memory, Icons.memory_outlined, 'Robot'),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBody: true,
      body: IndexedStack(index: _index, children: const [FieldScreen(), ScanScreen(), RobotScreen()]),
      bottomNavigationBar: SafeArea(
        minimum: const EdgeInsets.fromLTRB(20, 0, 20, 12),
        child: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(color: AgriColors.forest, borderRadius: BorderRadius.circular(40), boxShadow: kStrongShadow),
          child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            for (var i = 0; i < _tabs.length; i++)
              Semantics(
                selected: i == _index,
                label: _tabs[i].$3,
                button: true,
                child: GestureDetector(
                  onTap: () => _select(i),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 220),
                    width: 64,
                    height: 56,
                    decoration: BoxDecoration(color: i == _index ? AgriColors.mint : Colors.transparent, borderRadius: BorderRadius.circular(28)),
                    child: Icon(i == _index ? _tabs[i].$1 : _tabs[i].$2, color: i == _index ? AgriColors.forest : AgriColors.textOnDark, size: 26),
                  ),
                ),
              ),
            const _AvatarButton(),
          ]),
        ),
      ),
    );
  }
}

class _AvatarButton extends StatelessWidget {
  const _AvatarButton();

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    final parts = (auth.user?.name ?? 'Farmer').trim().split(RegExp(r'\s+'));
    final initials = (parts.first.isNotEmpty ? parts.first[0] : 'F') + (parts.length > 1 && parts[1].isNotEmpty ? parts[1][0] : '');
    return Semantics(
      label: 'Account',
      button: true,
      child: GestureDetector(
        onTap: () => showModalBottomSheet<void>(
          context: context,
          backgroundColor: AgriColors.surface,
          shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
          builder: (context) => SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(auth.user?.name ?? 'Farmer', style: AgriText.cardTitle),
                Text(auth.user?.email ?? '', style: AgriText.body),
                const SizedBox(height: 4),
                Text('Server: ${auth.serverUrl}', style: AgriText.small),
                const SizedBox(height: 16),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.logout, color: AgriColors.error),
                  title: const Text('Log out', style: TextStyle(color: AgriColors.error, fontWeight: FontWeight.w700)),
                  onTap: () {
                    Navigator.pop(context);
                    auth.logout();
                  },
                ),
              ]),
            ),
          ),
        ),
        child: Container(
          width: 56,
          height: 56,
          alignment: Alignment.center,
          decoration: BoxDecoration(color: AgriColors.mintStrong, shape: BoxShape.circle, border: Border.all(color: AgriColors.textOnDark, width: 2)),
          child: Text(initials.toUpperCase(), style: const TextStyle(color: AgriColors.forest, fontSize: 18, fontWeight: FontWeight.w800)),
        ),
      ),
    );
  }
}
