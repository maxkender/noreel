import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { colors, withAlpha } from '@/theme/colors';
import { gutter, radii, space } from '@/theme/spacing';
import { Text } from '@/components/type/Text';
import { GlassButton } from '@/components/glass/GlassButton';
import { useT } from '@/i18n';
import { useSky } from '@/components/sky/SkyProvider';
import { useOnboardingStore } from '@/store/onboarding';
import { formatHours } from '@/lib/format';
import { lifeStats } from '../calculations';
import { DayArcDial } from '../scenes/DayArcDial';
import { AgeRuler } from '../scenes/AgeRuler';
import { track } from '@/services';

export function S5Input({ onNext }: { onNext: () => void }) {
  const { d, t } = useT();
  const sky = useSky();
  const [phase, setPhase] = useState<'time' | 'age'>('time');
  const minutes = useOnboardingStore((s) => s.minutesPerDay);
  const setMinutes = useOnboardingStore((s) => s.setMinutesPerDay);
  const age = useOnboardingStore((s) => s.age);
  const setAge = useOnboardingStore((s) => s.setAge);

  useEffect(() => { sky.to('input'); }, [sky]);

  // Le ciel s'assombrit a mesure que la valeur monte (§7).
  useEffect(() => {
    const v = minutes / 720;
    sky.set({ sunrise: 0.45 - 0.25 * v, glowAmt: 0.1 + 0.6 * v });
  }, [minutes, sky]);

  const stats = lifeStats(minutes, age);
  const share = Math.round(stats.wakingShare * 100);

  return (
    <View style={styles.root}>
      {phase === 'time' ? (
        <Animated.View entering={FadeIn.duration(280)} exiting={FadeOut.duration(200)} style={styles.body}>
          <Text variant="displayM">{d.s5.titleA}</Text>

          <View style={styles.dial}>
            <DayArcDial minutes={minutes} onChange={setMinutes} />
            <View style={styles.readout} pointerEvents="none">
              <Text variant="hero" style={styles.value}>{formatHours(minutes)}</Text>
              <Text variant="label" tone="secondary">{d.s5.unit}</Text>
            </View>
          </View>

          <Text variant="body" tone="secondary" style={styles.live}>
            {t(d.s5.liveShare, { p: share })}
          </Text>
          <Text variant="body" tone="secondary">
            {t(d.s5.liveWeek, { h: formatHours(stats.hoursPerWeek * 60) })}
          </Text>

          <Text variant="label" tone="tertiary" style={{ marginTop: space.lg }}>
            {Platform.OS === 'ios' ? d.s5.helpIos : d.s5.helpAndroid}
          </Text>
        </Animated.View>
      ) : (
        <Animated.View entering={FadeIn.duration(280)} style={styles.body}>
          <Pressable onPress={() => setPhase('time')} style={styles.pill}>
            <Text variant="label">{formatHours(minutes)} · {d.s5.unit}</Text>
          </Pressable>

          <Text variant="displayM" style={{ marginTop: space.xl }}>{d.s5.titleB}</Text>
          <Text variant="lead" tone="secondary" style={{ marginTop: space.sm }}>{d.s5.bodyB}</Text>

          <Text variant="hero" style={styles.age}>{age}</Text>
          <AgeRuler age={age} onChange={setAge} />
        </Animated.View>
      )}

      <View style={styles.footer}>
        <GlassButton
          label={phase === 'time' ? d.s5.ctaA : d.s5.ctaB}
          onPress={() => {
            if (phase === 'time') {
              track('screen_time_set', { minutes });
              setPhase('age');
            } else {
              track('age_set', { age });
              onNext();
            }
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: gutter, paddingTop: space.lg },
  body: { flex: 1 },
  dial: { alignItems: 'center', marginTop: space.xl },
  readout: { position: 'absolute', top: '32%', alignItems: 'center' },
  value: { fontSize: 54, lineHeight: 58 },
  live: { marginTop: space.xl },
  pill: {
    alignSelf: 'flex-start', paddingHorizontal: space.md, paddingVertical: space.sm,
    borderRadius: radii.pill, backgroundColor: withAlpha(colors.mist, 0.08),
    borderWidth: 1, borderColor: withAlpha(colors.mist, 0.16),
  },
  age: { fontSize: 64, lineHeight: 68, textAlign: 'center', marginTop: space.xl },
  footer: { position: 'absolute', left: gutter, right: gutter, bottom: space.xl },
});
