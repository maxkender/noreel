import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence,
  withSpring, withTiming, Easing,
} from 'react-native-reanimated';
import { colors, withAlpha } from '@/theme/colors';
import { gutter, radii, space } from '@/theme/spacing';
import { springs } from '@/theme/motion';
import { Text } from '@/components/type/Text';
import { GlassButton } from '@/components/glass/GlassButton';
import { haptics } from '@/lib/haptics';
import { useT } from '@/i18n';
import { useSky } from '@/components/sky/SkyProvider';
import { homeScreen, track } from '@/services';

const COLS = 4, ROWS = 5;

export function S9HomeApps({ onNext }: { onNext: () => void }) {
  const { d } = useT();
  const sky = useSky();
  const [busy, setBusy] = useState(false);

  const wiggle = useSharedValue(0);
  const swap = useSharedValue(0);

  useEffect(() => {
    sky.to('morning');
    wiggle.value = withDelay(400, withRepeat(
      withSequence(withTiming(1, { duration: 70 }), withTiming(-1, { duration: 140 }), withTiming(0, { duration: 70 })),
      -1, false
    ));
    swap.value = withDelay(900, withTiming(1, { duration: 600, easing: Easing.inOut(Easing.quad) }));
  }, [sky, wiggle, swap]);

  const add = async () => {
    setBusy(true);
    haptics.press();
    const r = await homeScreen.add('instagram');
    await homeScreen.add('tiktok');
    track('home_add_tapped', { result: r });
    if (r === 'added') haptics.success();
    setBusy(false);
    onNext();
  };

  return (
    <View style={styles.root}>
      <Text variant="displayM">{d.s9.title}</Text>
      <Text variant="lead" tone="secondary" style={{ marginTop: space.md }}>{d.s9.body}</Text>

      <View style={styles.phone}>
        <View style={styles.grid}>
          {Array.from({ length: COLS * ROWS }, (_, i) => {
            const isSwap = i === 5 || i === 7;
            return <Icon key={i} index={i} wiggle={wiggle} swap={swap} highlighted={isSwap} />;
          })}
        </View>
        <View style={styles.folder}>
          <Text variant="label" tone="tertiary">{d.s9.folder}</Text>
        </View>
      </View>

      <View style={styles.steps}>
        <Step n="1" label={d.s9.step1} />
        <Step n="2" label={d.s9.step2} />
      </View>

      <View style={styles.footer}>
        <GlassButton label={busy ? '…' : d.s9.cta} disabled={busy} onPress={add} />
        <Text variant="label" tone="tertiary" style={styles.later} onPress={onNext}>
          {d.s9.later}
        </Text>
      </View>
    </View>
  );
}

function Icon({
  index, wiggle, swap, highlighted,
}: {
  index: number; wiggle: { value: number }; swap: { value: number }; highlighted: boolean;
}) {
  const s = useAnimatedStyle(() => {
    const phase = (index % 3) * 0.3;
    const rot = wiggle.value * 2 * (1 + phase * 0.1);
    if (!highlighted) return { transform: [{ rotate: `${rot}deg` }] };
    // Les deux icones d'origine s'envolent, les NoReel tombent a leur place.
    const s1 = swap.value;
    return {
      transform: [
        { rotate: `${rot}deg` },
        { translateY: withSpring((1 - s1) * -60, springs.bouncy) },
        { scale: 0.9 + s1 * 0.1 },
      ],
      opacity: s1,
    };
  });

  return (
    <Animated.View style={[styles.iconWrap, s]}>
      <View style={[styles.icon, highlighted && styles.iconNoReel]}>
        {highlighted && <View style={styles.markRing} />}
      </View>
    </Animated.View>
  );
}

function Step({ n, label }: { n: string; label: string }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepNum}><Text variant="label">{n}</Text></View>
      <Text variant="body" tone="secondary" style={{ flex: 1 }}>{label}</Text>
    </View>
  );
}

const CELL = 40;
const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: gutter, paddingTop: space.lg },
  phone: {
    alignSelf: 'center', marginTop: space.lg, padding: space.md,
    borderRadius: radii.phone, borderWidth: 1,
    borderColor: withAlpha(colors.mist, 0.16),
    backgroundColor: withAlpha(colors.mist, 0.04),
  },
  grid: { width: COLS * (CELL + 10), flexDirection: 'row', flexWrap: 'wrap' },
  iconWrap: { width: CELL + 10, height: CELL + 10, alignItems: 'center', justifyContent: 'center' },
  icon: {
    width: CELL, height: CELL, borderRadius: 11,
    backgroundColor: withAlpha(colors.mist, 0.12),
    alignItems: 'center', justifyContent: 'center',
  },
  iconNoReel: { backgroundColor: withAlpha(colors.sun, 0.22) },
  markRing: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2.5, borderColor: colors.sun,
  },
  folder: {
    marginTop: space.sm, alignSelf: 'center',
    paddingHorizontal: space.md, paddingVertical: 5, borderRadius: radii.chip,
    backgroundColor: withAlpha(colors.mist, 0.07),
  },
  steps: { marginTop: space.lg, gap: space.sm },
  step: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  stepNum: {
    width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: withAlpha(colors.mist, 0.1),
  },
  footer: { position: 'absolute', left: gutter, right: gutter, bottom: space.lg },
  later: { textAlign: 'center', marginTop: space.md, paddingVertical: space.sm },
});
