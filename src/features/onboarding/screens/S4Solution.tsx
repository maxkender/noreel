import { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle, useSharedValue, withSpring, withTiming, withSequence,
  runOnJS, Easing,
} from 'react-native-reanimated';
import { colors, withAlpha } from '@/theme/colors';
import { gutter, radii, space } from '@/theme/spacing';
import { springs } from '@/theme/motion';
import { Text } from '@/components/type/Text';
import { Glass } from '@/components/glass/Glass';
import { GlassButton } from '@/components/glass/GlassButton';
import { haptics } from '@/lib/haptics';
import { useT } from '@/i18n';
import { useSky } from '@/components/sky/SkyProvider';

export function S4Solution({ onNext }: { onNext: () => void }) {
  const { d } = useT();
  const sky = useSky();
  const { width } = useWindowDimensions();
  const panelW = width - gutter * 2;

  const split = useSharedValue(0.15);
  const scroll = useSharedValue(0);

  useEffect(() => {
    // La transition la plus lente du produit : c'est l'expiration (§7).
    sky.to('firstLight', { duration: 1600 });
    // Demo auto : 15 % -> 85 % -> 50 %.
    split.value = withSequence(
      withTiming(0.85, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      withTiming(0.5, { duration: 500, easing: Easing.inOut(Easing.quad) })
    );
  }, [sky, split]);

  // Cote "Avant", le defilement ne s'arrete jamais.
  useEffect(() => {
    scroll.value = withTiming(-140, { duration: 2600, easing: Easing.linear }, (f) => {
      if (f) scroll.value = 0;
    });
    const id = setInterval(() => {
      scroll.value = 0;
      scroll.value = withTiming(-140, { duration: 2600, easing: Easing.linear });
    }, 2600);
    return () => clearInterval(id);
  }, [scroll]);

  const pan = Gesture.Pan()
    .onChange((e) => {
      const next = Math.min(0.95, Math.max(0.05, split.value + e.changeX / panelW));
      const crossed = (split.value - 0.5) * (next - 0.5) < 0;
      split.value = next;
      if (crossed) runOnJS(haptics.tick)();
    })
    .onEnd(() => { split.value = withSpring(split.value, springs.snappy); });

  const afterClip = useAnimatedStyle(() => ({ width: `${split.value * 100}%` }));
  const handle = useAnimatedStyle(() => ({ left: `${split.value * 100}%` }));
  const feed = useAnimatedStyle(() => ({ transform: [{ translateY: scroll.value }] }));

  return (
    <View style={styles.root}>
      <Text variant="displayL">{d.s4.title}</Text>
      <Text variant="lead" tone="secondary" style={{ marginTop: space.md }}>{d.s4.body}</Text>

      <GestureDetector gesture={pan}>
        <View style={styles.panel}>
          <Glass radius={radii.panel} style={StyleSheet.absoluteFill as never} />

          {/* AVANT : froid, defile sans fin */}
          <View style={styles.layer}>
            <Animated.View style={feed}>
              {Array.from({ length: 8 }, (_, i) => (
                <View key={i} style={styles.coldCard} />
              ))}
            </Animated.View>
            <Text variant="label" tone="secondary" style={styles.labelLeft}>{d.s4.before}</Text>
          </View>

          {/* AVEC NOREEL : chaud, immobile */}
          <Animated.View style={[styles.layer, styles.afterLayer, afterClip]}>
            <View style={{ width: panelW - 2, padding: space.md, gap: space.sm }}>
              <View style={styles.warmRow}>
                {[0, 1, 2].map((i) => <View key={i} style={styles.warmStory} />)}
              </View>
              <View style={styles.warmMsg} />
              <View style={[styles.warmMsg, { width: '60%' }]} />
              <View style={styles.warmPost} />
            </View>
            <Text variant="label" style={styles.labelRight}>{d.s4.after}</Text>
          </Animated.View>

          <Animated.View style={[styles.handle, handle]} pointerEvents="none">
            <View style={styles.handleLine} />
            <View style={styles.handleKnob} />
          </Animated.View>
        </View>
      </GestureDetector>

      <Text variant="body" tone="secondary" style={{ marginTop: space.lg }}>{d.s4.note}</Text>

      <View style={styles.footer}>
        <GlassButton label={d.s4.cta} onPress={onNext} />
      </View>
    </View>
  );
}

const H = 260;
const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: gutter, paddingTop: space.lg },
  panel: { height: H, marginTop: space.xl, borderRadius: radii.panel, overflow: 'hidden' },
  layer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' },
  afterLayer: { backgroundColor: withAlpha(colors.sun, 0.06) },
  coldCard: {
    height: 58, marginHorizontal: space.md, marginTop: space.sm, borderRadius: 10,
    backgroundColor: withAlpha(colors.screenGlow, 0.2),
  },
  warmRow: { flexDirection: 'row', gap: 6 },
  warmStory: {
    width: 26, height: 26, borderRadius: 13,
    borderWidth: 1.5, borderColor: withAlpha(colors.sun, 0.8),
  },
  warmMsg: { height: 12, borderRadius: 6, backgroundColor: withAlpha(colors.mist, 0.16) },
  warmPost: { height: 78, borderRadius: 10, backgroundColor: withAlpha(colors.dawn, 0.18) },
  labelLeft: { position: 'absolute', left: space.md, bottom: space.md },
  labelRight: { position: 'absolute', left: space.md, bottom: space.md },
  handle: { position: 'absolute', top: 0, bottom: 0, width: 1, marginLeft: -0.5 },
  handleLine: { flex: 1, width: 1, backgroundColor: withAlpha(colors.mist, 0.6) },
  handleKnob: {
    position: 'absolute', top: H / 2 - 18, left: -18,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: withAlpha(colors.mist, 0.16),
    borderWidth: 1, borderColor: withAlpha(colors.mist, 0.45),
  },
  footer: { position: 'absolute', left: gutter, right: gutter, bottom: space.xl },
});
