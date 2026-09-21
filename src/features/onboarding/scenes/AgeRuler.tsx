import { useRef } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { colors, withAlpha } from '@/theme/colors';
import { Text } from '@/components/type/Text';
import { haptics } from '@/lib/haptics';

const MIN_AGE = 13, MAX_AGE = 75, TICK = 14;

/** La ligne d'horizon s'est couverte de graduations : c'est la meme ligne. */
export function AgeRuler({ age, onChange }: { age: number; onChange: (a: number) => void }) {
  const { width } = useWindowDimensions();
  const pad = width / 2 - TICK / 2;
  const last = useRef(age);
  const ages = Array.from({ length: MAX_AGE - MIN_AGE + 1 }, (_, i) => MIN_AGE + i);

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={TICK}
        decelerationRate="normal"
        contentContainerStyle={{ paddingHorizontal: pad }}
        contentOffset={{ x: (age - MIN_AGE) * TICK, y: 0 }}
        onScroll={(e) => {
          const next = Math.round(e.nativeEvent.contentOffset.x / TICK) + MIN_AGE;
          const clamped = Math.min(MAX_AGE, Math.max(MIN_AGE, next));
          if (clamped !== last.current) {
            last.current = clamped;
            haptics.tick();
            onChange(clamped);
          }
        }}
        scrollEventThrottle={16}
        accessibilityRole="adjustable"
        accessibilityValue={{ min: MIN_AGE, max: MAX_AGE, now: age }}
      >
        {ages.map((a) => {
          const major = a % 5 === 0;
          return (
            <View key={a} style={styles.tick}>
              <View style={[styles.mark, major ? styles.major : styles.minor]} />
              {major && <Text variant="label" tone="tertiary" style={styles.num}>{a}</Text>}
            </View>
          );
        })}
      </ScrollView>
      <View style={styles.cursor} pointerEvents="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  tick: { width: TICK, alignItems: 'center' },
  mark: { width: 1, backgroundColor: withAlpha(colors.mist, 0.3) },
  minor: { height: 10 },
  major: { height: 18, backgroundColor: withAlpha(colors.mist, 0.55) },
  num: { marginTop: 4 },
  cursor: {
    position: 'absolute', top: 0, left: '50%', width: 2, height: 22,
    marginLeft: -1, borderRadius: 1, backgroundColor: colors.sun,
  },
});
