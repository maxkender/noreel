import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeIn } from 'react-native-reanimated';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { space } from '@/theme/spacing';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/type/Text';
import { LOGOS } from '@/features/home/AppSlider';

type P = { onNext: () => void };

const APPS = ['instagram', 'tiktok', 'twitter', 'youtube'] as const;

/**
 * Les raccourcis sur l'ecran d'accueil — la promesse, pas le mode d'emploi.
 *
 * Il y avait ici trois etapes numerotees et deux boutons. Personne ne suit
 * une procedure pendant un onboarding : on vient d'arriver, on n'a pas
 * encore envie de la chose qu'on nous demande de configurer. L'ecran ne
 * fait donc plus qu'une promesse, en une image et une phrase ; la marche a
 * suivre attend dans l'onglet Blocage, le jour ou elle sera voulue.
 */
export function HomeShortcuts({ onNext }: P) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);

  return (
    <Screen cta="Continuer" onPress={onNext} hue="accent" center>
      {/* La maquette : les quatre apps filtrees a la place qu'elles
          occuperont, le reste en creux. */}
      <Animated.View entering={FadeIn.delay(200).duration(600)} style={st.phone}>
        <View style={st.notch} />
        <View style={st.grid}>
          {APPS.map((id, i) => (
            <Animated.View
              key={id}
              entering={FadeIn.delay(400 + i * 140).duration(420)}
              style={st.slot}
            >
              <Image source={LOGOS[id]} style={st.icon} contentFit="contain" />
              <Text variant="label" tone="tertiary" numberOfLines={1}>UnSwipe</Text>
            </Animated.View>
          ))}
          {Array.from({ length: 8 }, (_, i) => (
            <View key={i} style={st.ghost} />
          ))}
        </View>
      </Animated.View>

      <Animated.View entering={FadeIn.delay(1100).duration(520)}>
        <Text variant="displayM" style={st.title}>
          Tu peux même rajouter des raccourcis comme si les apps étaient sur
          ton téléphone.
        </Text>
      </Animated.View>
    </Screen>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  title: { textAlign: 'center', marginTop: space.xxl },
  phone: {
    alignSelf: 'center', width: 252, borderRadius: 34,
    padding: space.md, paddingTop: space.lg,
    backgroundColor: withAlpha(c.mist, 0.04),
    borderWidth: 1, borderColor: withAlpha(c.mist, 0.14),
  },
  notch: {
    alignSelf: 'center', width: 62, height: 6, borderRadius: 3,
    backgroundColor: withAlpha(c.mist, 0.16), marginBottom: space.lg,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  slot: { width: 46, alignItems: 'center', gap: 3 },
  icon: { width: 46, height: 46, borderRadius: 12 },
  ghost: {
    width: 46, height: 46, borderRadius: 12,
    backgroundColor: withAlpha(c.mist, 0.05),
  },
});
