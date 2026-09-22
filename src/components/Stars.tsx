import { useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat,
  withSequence, withTiming,
} from 'react-native-reanimated';
import { colors, withAlpha } from '@/theme/colors';

const COUNT = 44;

/** Poussiere lumineuse en fond : lente, discrete, elle donne la profondeur. */
export function Stars() {
  const { width, height } = useWindowDimensions();

  const seeds = useMemo(
    () => Array.from({ length: COUNT }, (_, i) => ({
      i,
      x: ((i * 37) % 100) / 100,
      y: ((i * 61) % 100) / 100,
      size: 1.6 + ((i * 13) % 26) / 10,
      delay: (i * 230) % 4000,
      drift: 10 + ((i * 7) % 18),
    })),
    []
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {seeds.map((s) => (
        <Star key={s.i} {...s} w={width} h={height} />
      ))}
    </View>
  );
}

function Star({
  x, y, size, delay, drift, w, h,
}: { x: number; y: number; size: number; delay: number; drift: number; w: number; h: number }) {
  const t = useSharedValue(0);

  // Une seule boucle par point, sur le thread UI : aucun cout cote JS.
  useMemo(() => {
    t.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 5200, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 5200, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      )
    );
  }, [t, delay]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.2 + t.value * 0.72,
    transform: [{ translateY: -t.value * drift }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: x * w,
          top: y * h,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.mist,
          shadowColor: colors.accent,
          shadowOpacity: 0.9,
          shadowRadius: size * 2.6,
          shadowOffset: { width: 0, height: 0 },
        },
        style,
      ]}
    />
  );
}
