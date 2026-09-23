import { useMemo } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';
import Animated, { FadeIn } from 'react-native-reanimated';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { space } from '@/theme/spacing';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/type/Text';
import { haptics } from '@/lib/haptics';
import { LOGOS } from '@/features/home/AppSlider';

type P = { onNext: () => void };

const APPS = ['instagram', 'tiktok', 'twitter', 'youtube'] as const;

/**
 * Les raccourcis sur l'ecran d'accueil.
 *
 * iOS n'autorise aucune app a poser une icone : le seul chemin qui marche
 * passe par Raccourcis. On le montre avant de le decrire — la maquette dit
 * en une image ce que trois phrases expliquent mal.
 */
export function HomeShortcuts({ onNext }: P) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);

  return (
    <Screen cta="Continuer" onPress={onNext} hue="accent">
      <Text variant="displayM" style={st.center}>
        Mets-les là où étaient les originales.
      </Text>

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

      <View style={st.steps}>
        <Step n="1" text="Copie le lien d’une app, ici ou dans les réglages." />
        <Step n="2" text="Raccourcis → + → Ouvrir l’URL → colle le lien." />
        <Step n="3" text="Partager → Sur l’écran d’accueil. Choisis le nom et l’icône." />
      </View>

      <View style={st.row}>
        <Pressable
          style={st.action}
          onPress={() => {
            haptics.press();
            void Clipboard.setStringAsync('unswipe://client/instagram');
          }}
        >
          <Text variant="label" color={c.accent}>Copier le lien Instagram</Text>
        </Pressable>

        {Platform.OS === 'ios' && (
          <Pressable
            style={st.action}
            onPress={() => { haptics.press(); void Linking.openURL('shortcuts://'); }}
          >
            <Text variant="label" color={c.accent}>Ouvrir Raccourcis</Text>
          </Pressable>
        )}
      </View>

      <Text variant="label" tone="tertiary" style={[st.center, st.note]}>
        Tu pourras aussi le faire plus tard, depuis l’onglet Blocage.
      </Text>
    </Screen>
  );
}

function Step({ n, text }: { n: string; text: string }) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  return (
    <View style={st.step}>
      <View style={st.badge}><Text variant="label" color={c.night}>{n}</Text></View>
      <Text variant="body" style={{ flex: 1 }}>{text}</Text>
    </View>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  center: { textAlign: 'center' },
  phone: {
    marginTop: space.xl, alignSelf: 'center', width: 252, borderRadius: 34,
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
  steps: { marginTop: space.xl, gap: space.md },
  step: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  badge: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', backgroundColor: c.accent,
  },
  row: { flexDirection: 'row', gap: space.sm, marginTop: space.lg },
  action: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: space.md, borderRadius: 16,
    backgroundColor: withAlpha(c.accent, 0.12),
    borderWidth: StyleSheet.hairlineWidth, borderColor: withAlpha(c.accent, 0.35),
  },
  note: { marginTop: space.lg, lineHeight: 17 },
});
