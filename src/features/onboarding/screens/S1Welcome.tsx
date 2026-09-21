import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedReaction, useAnimatedStyle, runOnJS } from 'react-native-reanimated';
import { colors } from '@/theme/colors';
import { gutter, space } from '@/theme/spacing';
import { Text } from '@/components/type/Text';
import { GlassButton } from '@/components/glass/GlassButton';
import { useTimeline, seg } from '@/lib/useTimeline';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { haptics } from '@/lib/haptics';
import { useT } from '@/i18n';
import { useSky } from '@/components/sky/SkyProvider';
import { track } from '@/services';
import { ReelStorm, T1 } from '../scenes/ReelStorm';

export function S1Welcome({ onNext }: { onNext: () => void }) {
  const { d } = useT();
  const sky = useSky();
  const reduced = useReducedMotion();
  const { t, skip } = useTimeline(T1.total, { reduced });

  // Le ciel suit la partition : chaos pendant la tempete, lever a la fin.
  useEffect(() => {
    sky.to('introChaos', { duration: 600 });
    const id = setTimeout(() => sky.to('welcome', { duration: 1400 }), T1.sunrise[0]);
    return () => clearTimeout(id);
  }, [sky]);

  // Haptiques calees sur la timeline, declenchees au franchissement.
  useAnimatedReaction(
    () => t.value >= T1.freeze,
    (hit, prev) => { if (hit && !prev) runOnJS(haptics.stop)(); }
  );
  useAnimatedReaction(
    () => t.value >= T1.sunrise[1] - 100,
    (hit, prev) => { if (hit && !prev) runOnJS(haptics.success)(); }
  );

  const textStyle = useAnimatedStyle(() => ({
    opacity: seg(t.value, T1.title[0], T1.title[1]),
  }));
  const subStyle = useAnimatedStyle(() => ({
    opacity: seg(t.value, T1.title[0] + 120, T1.title[1] + 120),
  }));
  const wordStyle = useAnimatedStyle(() => ({
    opacity: seg(t.value, T1.wordmark[0], T1.wordmark[1]),
  }));
  const ctaStyle = useAnimatedStyle(() => ({
    opacity: seg(t.value, T1.cta[0], T1.cta[1]),
  }));

  return (
    <Pressable
      style={styles.root}
      onPress={() => { skip(); track('intro_skipped'); }}
      accessibilityLabel="Toucher pour passer l'introduction"
    >
      <ReelStorm t={t} />

      <View style={styles.content} pointerEvents="box-none">
        <Animated.View style={wordStyle}>
          <Text variant="title" style={styles.wordmark}>{d.app.name}</Text>
        </Animated.View>

        <Animated.View style={textStyle}>
          <Text variant="displayL" style={styles.center}>{d.s1.title1}</Text>
          <Text variant="displayL" style={styles.center}>{d.s1.title2}</Text>
        </Animated.View>

        <Animated.View style={subStyle}>
          <Text variant="lead" tone="secondary" style={[styles.center, styles.sub]}>
            {d.s1.subtitle}
          </Text>
        </Animated.View>
      </View>

      <Animated.View style={[styles.footer, ctaStyle]} pointerEvents="box-none">
        <GlassButton label={d.s1.cta} onPress={onNext} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  // Le texte vit SOUS l'horizon (46 %), dans la bande sombre du sol.
  content: {
    position: 'absolute', top: '52%', left: 0, right: 0,
    paddingHorizontal: gutter, alignItems: 'center', gap: space.sm,
  },
  wordmark: { color: colors.mist, letterSpacing: -0.5, marginBottom: space.lg },
  center: { textAlign: 'center' },
  sub: { marginTop: space.md, maxWidth: 320 },
  footer: { position: 'absolute', left: gutter, right: gutter, bottom: space.xl },
});
