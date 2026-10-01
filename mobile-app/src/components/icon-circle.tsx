import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { AgriColors } from '@/constants/agri-theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

type IconCircleProps = { name: IconName; size?: number; color?: string; background?: string };

export function IconCircle({ name, size = 40, color = AgriColors.textOnDark, background = AgriColors.forest }: IconCircleProps) {
  return (
    <View style={[styles.circle, { backgroundColor: background, borderRadius: size / 2, height: size, width: size }]}>
      <Ionicons color={color} name={name} size={Math.round(size * 0.46)} />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
});
