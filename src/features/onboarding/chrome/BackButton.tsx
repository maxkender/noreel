import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { colors, withAlpha } from '@/theme/colors';
import { haptics } from '@/lib/haptics';

export function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Retour"
      hitSlop={12}
      onPress={() => { haptics.tap(); onPress(); }}
      style={styles.root}
    >
      <View style={styles.circle}>
        <ChevronLeft size={18} strokeWidth={1.5} color={colors.mist} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { width: 40, height: 40 },
  circle: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: withAlpha(colors.mist, 0.08),
    borderWidth: 1, borderColor: withAlpha(colors.mist, 0.18),
  },
});
