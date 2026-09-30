import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { Text } from '@/components/type/Text';
import { haptics } from '@/lib/haptics';

const THUMB = 34;
const TRACK = 6;

/**
 * Un curseur horizontal, de min a max, qu'on tire au doigt.
 *
 * Le chiffre est en grand au-dessus : c'est lui qu'on regle, le trait n'est
 * que la main courante. Au bout, la valeur porte un « + » — vingt Reels ou
 * plus, on ne compte plus. Tout vit sur le fil d'animation ; la valeur ne
 * remonte a React qu'a chaque cran franchi.
 */
export function HSlider({
  value, min, max, onChange, unit, maxLabel, width = 300,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  unit: string;
  /** Ce qu'on ecrit au maximum, a la place du chiffre : « 20+ ». */
  maxLabel?: string;
  width?: number;
}) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const span = width - THUMB;
  const x = useSharedValue(((value - min) / (max - min)) * span);
  const start = useSharedValue(0);
  const press = useSharedValue(0);

  const set = (v: number) => { onChange(v); haptics.tick(); };
  const pan = Gesture.Pan()
    .onBegin(() => { start.value = x.value; press.value = withSpring(1, { damping: 14, stiffness: 220 }); })
    .onChange((e) => {
      const nx = Math.min(span, Math.max(0, start.value + e.translationX));
      const before = Math.round((x.value / span) * (max - min)) + min;
      x.value = nx;
      const after = Math.round((nx / span) * (max - min)) + min;
      if (after !== before) runOnJS(set)(after);
    })
    .onFinalize(() => {
      // Le pouce se pose sur le cran le plus proche.
      const v = Math.round((x.value / span) * (max - min)) + min;
      x.value = withSpring(((v - min) / (max - min)) * span, { damping: 18, stiffness: 260 });
      press.value = withSpring(0, { damping: 14, stiffness: 220 });
    });
  const tap = Gesture.Tap().onEnd((e) => {
    const nx = Math.min(span, Math.max(0, e.x - THUMB / 2));
    const v = Math.round((nx / span) * (max - min)) + min;
    x.value = withSpring(((v - min) / (max - min)) * span, { damping: 18, stiffness: 260 });
    runOnJS(set)(v);
  });

  const thumb = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { scale: 1 + press.value * 0.18 }],
  }));
  const fill = useAnimatedStyle(() => ({ width: x.value + THUMB / 2 }));

  return (
    <View style={{ alignItems: 'center', gap: 22 }}>
      <View style={{ alignItems: 'center' }}>
        <Text variant="hero" color={c.accent}>{value >= max && maxLabel ? maxLabel : String(value)}</Text>
        <Text variant="label" tone="tertiary">{unit}</Text>
      </View>
      <GestureDetector gesture={Gesture.Exclusive(pan, tap)}>
        <View style={[st.rail, { width }]} accessibilityRole="adjustable" accessibilityValue={{ min, max, now: value }}>
          <View style={st.track} />
          <Animated.View style={[st.fill, fill]} />
          <Animated.View style={[st.thumb, thumb]} />
        </View>
      </GestureDetector>
      <View style={[st.ends, { width }]}>
        <Text variant="label" tone="tertiary">{String(min)}</Text>
        <Text variant="label" tone="tertiary">{maxLabel ?? String(max)}</Text>
      </View>
    </View>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  rail: { height: THUMB + 16, justifyContent: 'center' },
  track: { position: 'absolute', left: THUMB / 2, right: THUMB / 2, height: TRACK, borderRadius: TRACK / 2, backgroundColor: withAlpha(c.mist, 0.14) },
  fill: { position: 'absolute', left: THUMB / 2, height: TRACK, borderRadius: TRACK / 2, backgroundColor: c.accent },
  thumb: {
    position: 'absolute', left: 0, width: THUMB, height: THUMB, borderRadius: THUMB / 2,
    backgroundColor: c.mist, borderWidth: 3, borderColor: c.accent,
    shadowColor: c.accent, shadowOpacity: 0.5, shadowRadius: 10, shadowOffset: { width: 0, height: 3 },
  },
  ends: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -10 },
});
