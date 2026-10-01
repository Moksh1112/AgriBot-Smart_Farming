import 'package:intl/intl.dart';

String formatTime(DateTime? value) => value == null ? '—' : DateFormat.jm().format(value.toLocal());

String formatDay(DateTime? value) => value == null ? '' : DateFormat.MMMd().format(value.toLocal());

String timeAgo(DateTime? value) {
  if (value == null) return 'never';
  final seconds = DateTime.now().difference(value).inSeconds.clamp(0, 1 << 31);
  if (seconds < 10) return 'just now';
  if (seconds < 60) return '${seconds}s ago';
  if (seconds < 3600) return '${(seconds / 60).round()} min ago';
  if (seconds < 86400) return '${(seconds / 3600).round()} h ago';
  return '${(seconds / 86400).round()} d ago';
}

String percent(double value) => '${(value * 100).round()}%';

String round1(num? value) {
  if (value == null) return '—';
  final rounded = (value * 10).round() / 10;
  return rounded == rounded.roundToDouble() ? rounded.toStringAsFixed(0) : rounded.toStringAsFixed(1);
}
