import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle, useSharedValue, withSpring, withTiming, Easing,
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
import { useOnboardingStore, type PainFrequency } from '@/store/onboarding';
import { track } from '@/services';

/** L'horloge avance a chaque excuse : 23:04 -> 01:47. */
const CLOCK = ['23:04', '23:31', '23:58', '00:26', '00:49', '01:13', '01:47'];

export function S3Pain({ onNext }: { onNext: () => void }) {
  const { d } = useT();
  const sky = useSky();
  const setPain = useOnboardingStore((s) => s.setPainFrequency);
  const [answer, setAnswer] = useState<PainFrequency | null>(null);
  const [idx, setIdx] = useState(0);
  const [done, setDone] = useState(false);

  const y = useSharedValue(0);
  const reveal = useSharedValue(0);

  useEffect(() => { sky.to('lateNight'); }, [sky]);

  // Le rythme accelere : 900 ms -> 450 ms. C'est ce qui cree l'oppression.
  useEffect(() => {
    if (idx >= CLOCK.length - 1) {
      const id = setTimeout(() => {
        setDone(true);
        reveal.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.quad) });
      }, 250); // le silence avant la revelation
      return () => clearTimeout(id);
    }
    const delay = 900 - (idx / (CLOCK.length - 1)) * 450;
    const id = setTimeout(() => {
      haptics.tap();
      y.value = withTiming(-1, { duration: 180 }, (f) => {
        if (f) y.value = 0;
      });
      setIdx((i) => i + 1);
    }, delay);
    return () => clearTimeout(id);
  }, [idx, y, reveal]);

  const bubble = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value * 120 }],
    opacity: 1 + y.value,
  }));
  const after = useAnimatedStyle(() => ({ opacity: reveal.value }));

  const pick = (a: PainFrequency) => {
    setAnswer(a);
    setPain(a);
    haptics.tick();
    track('pain_answered', { answer: a });
  };

  return (
    <View style={styles.root}>
      <Text variant="hero" style={styles.clock}>{CLOCK[idx]}</Text>

      {!done && (
        <Animated.View style={[styles.bubbleWrap, bubble]}>
          <Glass radius={radii.panel} style={styles.bubble}>
            <Text variant="quote" style={styles.quote}>
              « {d.s3.excuses[idx % d.s3.excuses.length]} »
            </Text>
          </Glass>
        </Animated.View>
      )}

      {done && (
        <Animated.View style={[styles.after, after]}>
          <Text variant="displayM">{d.s3.title}</Text>
          <Text variant="lead" tone="secondary" style={{ marginTop: space.md }}>
            {d.s3.body}
          </Text>

          <View style={styles.chips}>
            {([['daily', d.s3.daily], ['weekly', d.s3.weekly], ['lostCount', d.s3.lostCount]] as const)
              .map(([key, label]) => {
                const on = answer === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => pick(key)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    style={[
                      styles.chip,
                      { backgroundColor: withAlpha(on ? colors.sun : colors.mist, on ? 0.16 : 0.06) },
                      on && { borderColor: withAlpha(colors.sun, 0.5) },
                    ]}
                  >
                    <Text variant="body" tone={on ? 'primary' : 'secondary'}>{label}</Text>
                  </Pressable>
                );
              })}
          </View>
        </Animated.View>
      )}

      <View style={styles.footer}>
        <CtaGate enabled={!!answer} label={d.s3.cta} onPress={onNext} />
      </View>
    </View>
  );
}

function CtaGate({ enabled, label, onPress }: { enabled: boolean; label: string; onPress: () => void }) {
  const s = useAnimatedStyle(() => ({ opacity: withSpring(enabled ? 1 : 0, springs.gentle) }));
  return (
    <Animated.View style={s} pointerEvents={enabled ? 'auto' : 'none'}>
      <GlassButton label={label} onPress={onPress} disabled={!enabled} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: gutter },
  clock: {
    position: 'absolute', top: '14%', alignSelf: 'center',
    color: withAlpha(colors.mist, 0.1),
  },
  bubbleWrap: { position: 'absolute', top: '38%', left: gutter, right: gutter },
  bubble: { padding: space.lg },
  quote: { textAlign: 'center' },
  after: { marginTop: '22%' },
  chips: { marginTop: space.xl, gap: space.sm },
  chip: {
    paddingHorizontal: space.lg, paddingVertical: space.md,
    borderRadius: radii.chip, borderWidth: 1, borderColor: withAlpha(colors.mist, 0.12),
  },
  footer: { position: 'absolute', left: gutter, right: gutter, bottom: space.xl },
});
