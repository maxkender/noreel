import { useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  FadeIn, useAnimatedStyle, useSharedValue, withDelay, withSequence,
  withTiming, Easing, useAnimatedReaction, runOnJS,
} from 'react-native-reanimated';
import { colors, withAlpha } from '@/theme/colors';
import { gutter, space } from '@/theme/spacing';
import { Text } from '@/components/type/Text';
import { GlassButton } from '@/components/glass/GlassButton';
import { haptics } from '@/lib/haptics';
import { useT } from '@/i18n';
import { useSky } from '@/components/sky/SkyProvider';

const BARS = 3;

export function S8Love({ onNext }: { onNext: () => void }) {
  const { d } = useT();
  const sky = useSky();
  const { width } = useWindowDimensions();
  const [text, setText] = useState(false);

  const join = useSharedValue(0);     // 0 = ecartees, 1 = reunies
  const bars = useSharedValue(0);

  useEffect(() => {
    sky.to('rose');
    // Trois passages de reels qui les ecartent, puis la reunion.
    bars.value = withTiming(1, { duration: 3200, easing: Easing.linear });
    join.value = withDelay(
      3200,
      withSequence(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }))
    );
  }, [sky, join, bars]);

  useAnimatedReaction(
    () => join.value >= 0.99,
    (done, prev) => {
      if (done && !prev) {
        runOnJS(haptics.heartbeat)();
        runOnJS(setText)(true);
      }
    }
  );

  const half = width / 2 - gutter;
  const left = useAnimatedStyle(() => ({ transform: [{ translateX: join.value * (half - 14) }] }));
  const right = useAnimatedStyle(() => ({ transform: [{ translateX: -join.value * (half - 14) }] }));
  const glow = useAnimatedStyle(() => ({
    opacity: join.value,
    transform: [{ scale: 0.4 + join.value * 1.1 }],
  }));

  return (
    <View style={styles.root}>
      <Text variant="displayM">{d.s8.title}</Text>

      <View style={styles.stage}>
        <View style={styles.horizon} />

        {Array.from({ length: BARS }, (_, i) => (
          <ReelBar key={i} index={i} progress={bars} />
        ))}

        <Animated.View style={[styles.lightGlow, glow]} pointerEvents="none" />
        <Animated.View style={[styles.light, styles.lightL, left]} />
        <Animated.View style={[styles.light, styles.lightR, right]} />
      </View>

      {text && (
        <Animated.View entering={FadeIn.duration(400)}>
          {[d.s8.l1, d.s8.l2, d.s8.l3].map((l, i) => (
            <Animated.View key={i} entering={FadeIn.delay(i * 400).duration(400)}>
              <Text variant="body" tone="secondary" style={{ marginTop: space.md }}>{l}</Text>
            </Animated.View>
          ))}
          <Animated.View entering={FadeIn.delay(1300).duration(400)}>
            <Text variant="title" style={{ marginTop: space.xl }}>{d.s8.conclusion}</Text>
          </Animated.View>
        </Animated.View>
      )}

      <View style={styles.footer}>
        <GlassButton label={d.s8.cta} onPress={onNext} />
      </View>
    </View>
  );
}

function ReelBar({ index, progress }: { index: number; progress: { value: number } }) {
  const s = useAnimatedStyle(() => {
    const local = (progress.value * BARS) - index;
    const visible = local > 0 && local < 1;
    return {
      opacity: visible ? 1 : 0,
      transform: [{ translateY: -60 + local * 220 }],
    };
  });
  return <Animated.View style={[styles.bar, s]} pointerEvents="none" />;
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: gutter, paddingTop: space.lg },
  stage: { height: 160, marginTop: space.xl, justifyContent: 'center' },
  horizon: {
    position: 'absolute', left: 0, right: 0, top: '50%', height: 1,
    backgroundColor: withAlpha(colors.mist, 0.35),
  },
  light: {
    position: 'absolute', top: '50%', width: 12, height: 12, borderRadius: 6,
    marginTop: -6, backgroundColor: colors.sun,
    shadowColor: colors.sun, shadowOpacity: 0.9, shadowRadius: 10,
  },
  lightL: { left: 0 },
  lightR: { right: 0 },
  lightGlow: {
    position: 'absolute', alignSelf: 'center', top: '50%', marginTop: -34,
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: withAlpha(colors.sun, 0.35),
  },
  bar: {
    position: 'absolute', alignSelf: 'center', width: 26, height: 90, borderRadius: 6,
    backgroundColor: withAlpha(colors.screenGlow, 0.3),
    borderWidth: 1, borderColor: withAlpha(colors.screenGlow, 0.5),
  },
  footer: { position: 'absolute', left: gutter, right: gutter, bottom: space.xl },
});
