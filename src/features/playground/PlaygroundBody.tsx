import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, withAlpha } from '@/theme/colors';
import { gutter, radii, space } from '@/theme/spacing';
import { skyPresets, type SkyPresetName } from '@/theme/sky-presets';
import { SkyProvider, useSky } from '@/components/sky/SkyProvider';
import { SkyBackground } from '@/components/sky/SkyBackground';
import { Glass } from '@/components/glass/Glass';
import { GlassButton } from '@/components/glass/GlassButton';
import { Text } from '@/components/type/Text';
import { haptics } from '@/lib/haptics';
import { lifeStats } from '@/features/onboarding/calculations';
import { formatLifeDuration, formatHours } from '@/lib/format';

const NAMES = Object.keys(skyPresets) as SkyPresetName[];

function Body() {
  const sky = useSky();
  const [current, setCurrent] = useState<SkyPresetName>('welcome');

  const pick = (n: SkyPresetName) => {
    setCurrent(n);
    sky.to(n);
    haptics.tick();
  };

  const stats = lifeStats(195, 24);

  return (
    <View style={styles.root}>
      <SkyBackground />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text variant="displayM">Playground</Text>
          <Text variant="label" tone="secondary">
            {Platform.OS} · preset : {current}
          </Text>

          <Text variant="label" tone="secondary" style={styles.section}>
            Presets du ciel — touche pour transitionner
          </Text>
          <View style={styles.chips}>
            {NAMES.map((n) => {
              const on = n === current;
              return (
                <Pressable
                  key={n}
                  onPress={() => pick(n)}
                  style={[
                    styles.chip,
                    { backgroundColor: withAlpha(on ? colors.sun : colors.mist, on ? 0.2 : 0.07) },
                  ]}
                >
                  <Text variant="label" tone={on ? 'primary' : 'secondary'}>
                    {n}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text variant="label" tone="secondary" style={styles.section}>
            Verre — liseré chaud en bas
          </Text>
          <Glass style={styles.panel}>
            <Text variant="title">Un panneau de verre</Text>
            <Text variant="body" tone="secondary" style={{ marginTop: space.sm }}>
              Le reflet froid est en haut, le liseré chaud en bas, du côté du soleil.
            </Text>
          </Glass>

          <Text variant="label" tone="secondary" style={styles.section}>
            Typographie
          </Text>
          <Glass style={styles.panel} blur={false}>
            <Text variant="hero">47</Text>
            <Text variant="displayL">Garde tes potes.</Text>
            <Text variant="displayM">Vire les reels.</Text>
            <Text variant="quote">« Allez, le dernier. »</Text>
            <Text variant="lead" tone="secondary">Instagram et TikTok, sans le scroll infini.</Text>
            <Text variant="body" tone="secondary">Corps de texte en Geist.</Text>
            <Text variant="label" tone="tertiary">Label</Text>
          </Glass>

          <Text variant="label" tone="secondary" style={styles.section}>
            Calculs — 195 min/jour à 24 ans
          </Text>
          <Glass style={styles.panel} blur={false}>
            <Text variant="displayM">{formatLifeDuration(stats.lostMonths)}</Text>
            <Text variant="body" tone="secondary">
              {stats.lostMonths} mois sur 960 · {Math.round(stats.wakingShare * 100)} % du temps
              éveillé · {formatHours(stats.hoursPerWeek * 60)} par semaine
            </Text>
          </Glass>

          <GlassButton label="Bouton principal" onPress={() => haptics.success()} style={styles.cta} />
          <GlassButton label="Désactivé" disabled style={styles.cta} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

export function PlaygroundBody() {
  return (
    <SkyProvider initial="welcome">
      <Body />
    </SkyProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.night },
  safe: { flex: 1 },
  scroll: { padding: gutter, paddingBottom: space.xxl, gap: space.sm },
  section: { marginTop: space.xl },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: { paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radii.chip },
  panel: { padding: space.lg, gap: space.xs },
  cta: { marginTop: space.lg },
});
