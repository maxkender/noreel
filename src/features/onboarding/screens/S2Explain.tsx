import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming, Easing,
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
import { useOnboardingStore, type SocialApp } from '@/store/onboarding';
import { track } from '@/services';

export function S2Explain({ onNext }: { onNext: () => void }) {
  const { d } = useT();
  const sky = useSky();
  const app = useOnboardingStore((s) => s.demoPlatform);
  const setApp = useOnboardingStore((s) => s.setDemoPlatform);
  const [run, setRun] = useState(0);

  const sweep = useSharedValue(0);
  const enter = useSharedValue(0);

  useEffect(() => { sky.to('explain'); }, [sky]);

  useEffect(() => {
    enter.value = withSpring(1, springs.gentle);
    sweep.value = 0;
    // Le balayage part a 600 ms : on laisse le telephone se poser d'abord.
    sweep.value = withDelay(600, withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }));
    const id = setTimeout(() => haptics.tap(), 1500);
    return () => clearTimeout(id);
  }, [run, sweep, enter]);

  const phone = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [
      { perspective: 700 },
      { rotateX: `${(1 - enter.value) * 18}deg` },
      { translateY: (1 - enter.value) * 40 },
    ],
  }));
  const band = useAnimatedStyle(() => ({
    top: `${sweep.value * 100}%`,
    opacity: sweep.value > 0 && sweep.value < 1 ? 1 : 0,
  }));
  // Ce qui est "piege" disparait derriere la bande.
  const trap = useAnimatedStyle(() => ({ opacity: 1 - Math.min(1, sweep.value * 1.6) }));
  const pill = useAnimatedStyle(() => ({ opacity: sweep.value > 0.95 ? withTiming(1) : 0 }));

  const toggle = (next: SocialApp) => {
    if (next === app) return;
    setApp(next);
    haptics.tick();
    track('demo_platform_toggled', { app: next });
    setRun((r) => r + 1);
  };

  return (
    <View style={styles.root}>
      <Text variant="displayL">{d.s2.title}</Text>
      <Text variant="lead" tone="secondary" style={{ marginTop: space.md }}>{d.s2.body}</Text>

      <Pressable onPress={() => setRun((r) => r + 1)} style={styles.phoneWrap}>
        <Animated.View style={[styles.phone, phone]}>
          {/* UI abstraite originale — aucun element d'Instagram ou TikTok. */}
          <View style={styles.row}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={styles.story} />
            ))}
          </View>
          <View style={styles.post} />
          <Animated.View style={[styles.grid, trap]}>
            {Array.from({ length: 6 }, (_, i) => <View key={i} style={styles.tile} />)}
          </Animated.View>
          <View style={styles.tabs}>
            {[0, 1, 2, 3, 4].map((i) => (
              <Animated.View
                key={i}
                style={[styles.tab, i === 2 && trap, i === 2 && styles.tabTrap]}
              />
            ))}
          </View>

          <Animated.View style={[styles.band, band]} pointerEvents="none" />
          <Animated.View style={[styles.pill, pill]} pointerEvents="none">
            <Text variant="label">{d.s2.pill}</Text>
          </Animated.View>
        </Animated.View>
      </Pressable>

      <View style={styles.segmented}>
        {(['instagram', 'tiktok'] as const).map((k) => {
          const on = app === k;
          return (
            <Pressable key={k} onPress={() => toggle(k)} style={[styles.seg, on && styles.segOn]}>
              <Text variant="label" tone={on ? 'primary' : 'secondary'}>
                {k === 'instagram' ? d.s2.instagram : d.s2.tiktok}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.list}>
        <Text variant="body">✓ {d.s2.keep1}</Text>
        <Text variant="body">✓ {d.s2.keep2}</Text>
        <Text variant="body" tone="secondary" style={styles.struck}>✕ {d.s2.remove}</Text>
      </View>

      <View style={styles.footer}>
        <GlassButton label={d.s2.cta} onPress={onNext} />
      </View>
    </View>
  );
}

const S = 0.52;
const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: gutter, paddingTop: space.lg },
  phoneWrap: { alignItems: 'center', marginTop: space.lg },
  phone: {
    width: 190, height: 190 * 1.9, borderRadius: radii.phone, overflow: 'hidden',
    backgroundColor: withAlpha(colors.mist, 0.06),
    borderWidth: 1, borderColor: withAlpha(colors.mist, 0.16), padding: 10,
  },
  row: { flexDirection: 'row', gap: 6 },
  story: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 1.5, borderColor: withAlpha(colors.sun, 0.7),
  },
  post: {
    height: 70, borderRadius: 10, marginTop: 8,
    backgroundColor: withAlpha(colors.mist, 0.1),
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 },
  tile: {
    width: (190 - 20 - 8) / 3, height: 34, borderRadius: 6,
    backgroundColor: withAlpha(colors.screenGlow, 0.22),
  },
  tabs: {
    position: 'absolute', bottom: 10, left: 10, right: 10,
    flexDirection: 'row', justifyContent: 'space-between',
  },
  tab: { width: 18, height: 18, borderRadius: 5, backgroundColor: withAlpha(colors.mist, 0.18) },
  tabTrap: { backgroundColor: withAlpha(colors.screenGlow, 0.55) },
  band: {
    position: 'absolute', left: 0, right: 0, height: 2,
    backgroundColor: colors.mist,
    shadowColor: colors.mist, shadowOpacity: 0.9, shadowRadius: 10,
  },
  pill: {
    position: 'absolute', bottom: 40, alignSelf: 'center',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: radii.pill,
    backgroundColor: withAlpha(colors.sun, 0.22),
  },
  segmented: {
    flexDirection: 'row', alignSelf: 'center', marginTop: space.lg,
    backgroundColor: withAlpha(colors.mist, 0.06), borderRadius: radii.pill, padding: 3,
  },
  seg: { paddingHorizontal: space.lg, paddingVertical: space.sm, borderRadius: radii.pill },
  segOn: { backgroundColor: withAlpha(colors.mist, 0.14) },
  list: { marginTop: space.lg, gap: space.sm },
  struck: { textDecorationLine: 'line-through' },
  footer: { position: 'absolute', left: gutter, right: gutter, bottom: space.xl },
});
