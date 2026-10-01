import Ionicons from '@expo/vector-icons/Ionicons';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import type { IconName } from '@/components/icon-circle';
import { AgriColors, AgriShadowStrong } from '@/constants/agri-theme';
import { useAuth } from '@/context/auth-context';

const ICONS: Record<string, [IconName, IconName]> = {
  dashboard: ['map', 'map-outline'],
  scan: ['scan-circle', 'scan-circle-outline'],
  robot: ['hardware-chip', 'hardware-chip-outline'],
};

function initials(name?: string) {
  const parts = (name ?? 'Farmer').trim().split(/\s+/);
  return ((parts[0]?.[0] ?? 'F') + (parts[1]?.[0] ?? '')).toUpperCase();
}

/** Dark floating pill navigation with the farmer avatar, as in the reference. */
export function FloatingTabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const { user, logout } = useAuth();

  function openAccount() {
    Alert.alert(user?.name ?? 'Farmer account', user?.email ?? '', [
      { style: 'cancel', text: 'Close' },
      { onPress: () => logout(), style: 'destructive', text: 'Log out' },
    ]);
  }

  return (
    <View pointerEvents="box-none" style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const options = descriptors[route.key].options;
          const [active, inactive] = ICONS[route.name] ?? ['ellipse', 'ellipse-outline'];
          const onPress = () => {
            const event = navigation.emit({ canPreventDefault: true, target: route.key, type: 'tabPress' });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
          };
          return (
            <Pressable
              accessibilityLabel={options.title ?? route.name}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              key={route.key}
              onPress={onPress}
              style={[styles.tab, focused && styles.tabActive]}>
              <Ionicons color={focused ? AgriColors.forest : AgriColors.textOnDark} name={focused ? active : inactive} size={24} />
            </Pressable>
          );
        })}
        <Pressable accessibilityLabel="Account" accessibilityRole="button" onPress={openAccount} style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(user?.name)}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { bottom: 0, left: 0, paddingHorizontal: 20, position: 'absolute', right: 0 },
  bar: { ...AgriShadowStrong, alignItems: 'center', backgroundColor: AgriColors.forest, borderRadius: 40, flexDirection: 'row', gap: 6, justifyContent: 'space-between', padding: 8 },
  tab: { alignItems: 'center', borderRadius: 28, height: 56, justifyContent: 'center', width: 64 },
  tabActive: { backgroundColor: AgriColors.mint },
  avatar: { alignItems: 'center', backgroundColor: AgriColors.mintStrong, borderColor: AgriColors.textOnDark, borderRadius: 28, borderWidth: 2, height: 56, justifyContent: 'center', width: 56 },
  avatarText: { color: AgriColors.forest, fontSize: 18, fontWeight: '800' },
});
