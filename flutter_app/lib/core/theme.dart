import 'package:flutter/material.dart';

/// Forest / mint palette from the field-map reference design.
class AgriColors {
  static const background = Color(0xFFF1F3EE);
  static const surface = Color(0xFFFFFFFF);
  static const surfaceMuted = Color(0xFFF3F5F0);
  static const forest = Color(0xFF123B29);
  static const forestDeep = Color(0xFF0C2A1D);
  static const primary = Color(0xFF1E5C3B);
  static const primarySoft = Color(0xFFE2F1DC);
  static const mint = Color(0xFFD7EECF);
  static const mintStrong = Color(0xFFA9DB9C);
  static const text = Color(0xFF11261B);
  static const textMuted = Color(0xFF66776C);
  static const textFaint = Color(0xFF9AA79F);
  static const textOnDark = Color(0xFFF3F8F1);
  static const textOnDarkMuted = Color(0xFFA9C3B1);
  static const border = Color(0xFFE2E8DF);
  static const success = Color(0xFF2F8A55);
  static const error = Color(0xFFC0473F);
  static const warning = Color(0xFFC07E22);
}

/// Box colours drawn by the Pi on annotated scans.
const Map<String, Color> kDiseaseColors = {
  'Healthy': Color(0xFF22C55E),
  'Bacterial Spot': Color(0xFFF97316),
  'Early Blight': Color(0xFFEAB308),
  'Late Blight': Color(0xFFEF4444),
  'Yellow Leaf Curl Virus': Color(0xFFA855F7),
};

Color diseaseColor(String label) => kDiseaseColors[label] ?? AgriColors.textFaint;

const List<BoxShadow> kSoftShadow = [
  BoxShadow(color: Color(0x140C2A1D), blurRadius: 18, offset: Offset(0, 8)),
];
const List<BoxShadow> kStrongShadow = [
  BoxShadow(color: Color(0x470C2A1D), blurRadius: 28, offset: Offset(0, 12)),
];

ThemeData buildTheme() {
  final base = ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(seedColor: AgriColors.forest, primary: AgriColors.forest, surface: AgriColors.surface),
    scaffoldBackgroundColor: AgriColors.background,
  );
  return base.copyWith(
    textTheme: base.textTheme.apply(bodyColor: AgriColors.text, displayColor: AgriColors.text),
    snackBarTheme: const SnackBarThemeData(behavior: SnackBarBehavior.floating, backgroundColor: AgriColors.forest),
    progressIndicatorTheme: const ProgressIndicatorThemeData(color: AgriColors.primary),
  );
}

/// Shared text styles.
class AgriText {
  static const title = TextStyle(fontSize: 30, fontWeight: FontWeight.w800, letterSpacing: -0.6, color: AgriColors.text);
  static const eyebrow = TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AgriColors.textMuted);
  static const section = TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AgriColors.text);
  static const cardTitle = TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AgriColors.text);
  static const body = TextStyle(fontSize: 14, height: 1.4, color: AgriColors.textMuted);
  static const small = TextStyle(fontSize: 12, height: 1.4, color: AgriColors.textMuted);
}
