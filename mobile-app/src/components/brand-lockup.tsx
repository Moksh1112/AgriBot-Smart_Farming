import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { AgriColors } from '@/constants/agri-theme';

export function BrandLockup({ light = false }: { light?: boolean }) {
  return (
    <View style={styles.container}>
      <View style={[styles.mark, light && styles.markLight]}>
        <Ionicons color={light ? AgriColors.forest : AgriColors.mint} name="leaf" size={24} />
      </View>
      <View>
        <Text style={[styles.name, light && styles.nameLight]}>AgriBot</Text>
        <Text style={[styles.tagline, light && styles.taglineLight]}>Smart farming assistant</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  mark: { alignItems: 'center', backgroundColor: AgriColors.forest, borderRadius: 24, height: 48, justifyContent: 'center', width: 48 },
  markLight: { backgroundColor: AgriColors.mint },
  name: { color: AgriColors.forest, fontSize: 20, fontWeight: '800', letterSpacing: -0.2 },
  nameLight: { color: AgriColors.textOnDark },
  tagline: { color: AgriColors.textMuted, fontSize: 12, fontWeight: '600', marginTop: 1 },
  taglineLight: { color: AgriColors.textOnDarkMuted },
});
