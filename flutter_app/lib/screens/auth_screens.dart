import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/theme.dart';
import '../services/api_client.dart';
import '../state/auth_controller.dart';
import '../widgets/common.dart';

/// Login and signup share one screen with a dark hatched hero.
class AuthFlow extends StatefulWidget {
  const AuthFlow({super.key});
  @override
  State<AuthFlow> createState() => _AuthFlowState();
}

class _AuthFlowState extends State<AuthFlow> {
  bool _signup = false;
  bool _loading = false;
  bool _showPassword = false;
  String _error = '';
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();

  @override
  void dispose() {
    for (final c in [_name, _email, _password, _confirm]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _submit() async {
    final auth = context.read<AuthController>();
    final email = _email.text.trim();
    if (email.isEmpty ||
        _password.text.isEmpty ||
        (_signup && (_name.text.trim().isEmpty || _confirm.text.isEmpty))) {
      setState(
        () => _error = _signup
            ? 'Complete all fields to continue.'
            : 'Enter your email and password to continue.',
      );
      return;
    }
    if (_signup && _password.text != _confirm.text) {
      setState(() => _error = 'Passwords do not match.');
      return;
    }
    setState(() {
      _error = '';
      _loading = true;
    });
    try {
      if (_signup) {
        await auth.signup(_name.text.trim(), email, _password.text);
      } else {
        await auth.login(email, _password.text);
      }
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final server = context.select<AuthController, String>((a) => a.serverUrl);
    final bottom = MediaQuery.paddingOf(context).bottom;
    return Scaffold(
      backgroundColor: AgriColors.forest,
      // Forest behind the hero, white behind the form, so tall screens never show a gap under the sheet.
      body: DecoratedBox(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            stops: [0.5, 0.5],
            colors: [AgriColors.forest, AgriColors.surface],
          ),
        ),
        child: SingleChildScrollView(
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
          child: Column(
            children: [
              _AuthHero(
                title: _signup ? 'Create account' : 'Welcome back',
                subtitle: _signup
                    ? 'Set up your farmer profile to start monitoring your AgriBot.'
                    : 'Monitor your field, scan crops for disease and manage your AgriBot.',
              ),
              Container(
                constraints: BoxConstraints(
                  minHeight: MediaQuery.sizeOf(context).height * 0.55,
                ),
                padding: EdgeInsets.fromLTRB(22, 12, 22, bottom + 24),
                decoration: const BoxDecoration(
                  color: AgriColors.surface,
                  borderRadius: BorderRadius.vertical(top: Radius.circular(34)),
                ),
                child: AutofillGroup(
                  child: Column(
                    children: [
                      if (_signup)
                        AgriTextField(
                          label: 'Full name',
                          controller: _name,
                          hint: 'Your name',
                          textCapitalization: TextCapitalization.words,
                          autofill: const [AutofillHints.name],
                        ),
                      AgriTextField(
                        label: 'Email address',
                        controller: _email,
                        hint: 'farmer@example.com',
                        keyboardType: TextInputType.emailAddress,
                        autofill: const [AutofillHints.email],
                      ),
                      AgriTextField(
                        label: 'Password',
                        controller: _password,
                        hint: _signup
                            ? 'Create a password'
                            : 'Enter your password',
                        obscure: !_showPassword,
                        autofill: [
                          _signup
                              ? AutofillHints.newPassword
                              : AutofillHints.password,
                        ],
                        suffix: IconButton(
                          tooltip: _showPassword
                              ? 'Hide password'
                              : 'Show password',
                          icon: Icon(
                            _showPassword
                                ? Icons.visibility_off
                                : Icons.visibility,
                            color: AgriColors.textMuted,
                          ),
                          onPressed: () =>
                              setState(() => _showPassword = !_showPassword),
                        ),
                      ),
                      if (_signup)
                        AgriTextField(
                          label: 'Confirm password',
                          controller: _confirm,
                          hint: 'Repeat your password',
                          obscure: !_showPassword,
                        ),
                      if (_error.isNotEmpty) ErrorBanner(_error),
                      const SizedBox(height: 20),
                      PrimaryButton(
                        label: _signup ? 'Create account' : 'Log in',
                        icon: _signup ? Icons.person_add_alt_1 : Icons.login,
                        loading: _loading,
                        onPressed: _submit,
                      ),
                      const SizedBox(height: 18),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            _signup
                                ? 'Already have an account?'
                                : 'New to AgriBot?',
                            style: const TextStyle(color: AgriColors.textMuted),
                          ),
                          TextButton(
                            onPressed: () => setState(() {
                              _signup = !_signup;
                              _error = '';
                            }),
                            child: Text(
                              _signup ? 'Log in' : 'Create an account',
                              style: const TextStyle(
                                fontWeight: FontWeight.w800,
                                color: AgriColors.primary,
                              ),
                            ),
                          ),
                        ],
                      ),
                      TextButton.icon(
                        onPressed: () => showServerDialog(context),
                        icon: const Icon(
                          Icons.dns_outlined,
                          size: 16,
                          color: AgriColors.textFaint,
                        ),
                        label: Text(
                          'Server: $server',
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: AgriColors.textFaint,
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AuthHero extends StatelessWidget {
  const _AuthHero({required this.title, required this.subtitle});
  final String title, subtitle;
  @override
  Widget build(BuildContext context) {
    final top = MediaQuery.paddingOf(context).top;
    return Hatch(
      color: const Color(0x22FFFFFF),
      child: Container(
        width: double.infinity,
        padding: EdgeInsets.fromLTRB(24, top + 24, 24, 56),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const IconCircle(
                  Icons.eco,
                  size: 48,
                  background: AgriColors.mint,
                  color: AgriColors.forest,
                ),
                const SizedBox(width: 12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    Text(
                      'AgriBot',
                      style: TextStyle(
                        color: AgriColors.textOnDark,
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    Text(
                      'Smart farming assistant',
                      style: TextStyle(
                        color: AgriColors.textOnDarkMuted,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            SizedBox(
              height: 110,
              child: Stack(
                children: [
                  Positioned(
                    left: 0,
                    top: 30,
                    child: _Blob(width: 100, height: 56, filled: false),
                  ),
                  Positioned(
                    right: 20,
                    top: 14,
                    child: _Blob(width: 160, height: 84, filled: true),
                  ),
                ],
              ),
            ),
            Text(
              title,
              style: const TextStyle(
                color: AgriColors.textOnDark,
                fontSize: 34,
                fontWeight: FontWeight.w800,
                letterSpacing: -0.6,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              subtitle,
              style: const TextStyle(
                color: AgriColors.textOnDarkMuted,
                fontSize: 15,
                height: 1.45,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Blob extends StatelessWidget {
  const _Blob({
    required this.width,
    required this.height,
    required this.filled,
  });
  final double width, height;
  final bool filled;
  @override
  Widget build(BuildContext context) => Transform.rotate(
    angle: -0.3,
    child: Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: filled
            ? AgriColors.mintStrong.withValues(alpha: 0.9)
            : Colors.transparent,
        borderRadius: BorderRadius.circular(60),
        border: Border.all(
          color: AgriColors.mint.withValues(alpha: filled ? 0.9 : 0.6),
          width: 2,
        ),
      ),
    ),
  );
}

/// Lets the farmer point the app at a different backend without rebuilding.
Future<void> showServerDialog(BuildContext context) async {
  final auth = context.read<AuthController>();
  final controller = TextEditingController(text: auth.serverUrl);
  String? result;
  bool testing = false;
  await showDialog<void>(
    context: context,
    builder: (context) => StatefulBuilder(
      builder: (context, setState) => AlertDialog(
        backgroundColor: AgriColors.surface,
        title: const Text('Server address'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'The computer running the AgriBot backend, e.g. http://192.168.1.20:5001',
              style: AgriText.small,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: controller,
              keyboardType: TextInputType.url,
              autocorrect: false,
              decoration: const InputDecoration(border: OutlineInputBorder()),
            ),
            if (result != null)
              Padding(
                padding: const EdgeInsets.only(top: 10),
                child: Text(result!, style: AgriText.small),
              ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: testing
                ? null
                : () async {
                    setState(() => testing = true);
                    final ok = await ApiClient.ping(
                      controller.text.trim().replaceAll(RegExp(r'/+$'), ''),
                    );
                    setState(() {
                      testing = false;
                      result = ok
                          ? 'Server reachable.'
                          : 'Could not reach that server.';
                    });
                  },
            child: Text(testing ? 'Testing…' : 'Test'),
          ),
          FilledButton(
            onPressed: () async {
              await auth.setServerUrl(controller.text);
              if (context.mounted) Navigator.pop(context);
            },
            style: FilledButton.styleFrom(backgroundColor: AgriColors.forest),
            child: const Text('Save'),
          ),
        ],
      ),
    ),
  );
  controller.dispose();
}
