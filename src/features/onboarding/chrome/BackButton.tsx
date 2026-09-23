import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { haptics } from '@/lib/haptics';

export function BackButton({ onPress }: { onPress: () => void }) {
  const c = useColors();
  const styles = useMemo(() => sheet(c), [c]);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Retour"
      hitSlop={12}
      onPress={() => { haptics.tap(); onPress(); }}
      style={styles.root}
    >
      <View style={styles.circle}>
        <ChevronLeft size={18} strokeWidth={1.5} color={c.mist} />
      </View>
    </Pressable>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  root: { width: 40, height: 40 },
  circle: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: withAlpha(c.mist, 0.08),
    borderWidth: 1, borderColor: withAlpha(c.mist, 0.18),
  },
});
