import { useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { ChevronLeft, Copy, Check } from 'lucide-react-native';
import { colors, withAlpha } from '@/theme/colors';
import { gutter, space } from '@/theme/spacing';
import { Text } from '@/components/type/Text';
import { Glass } from '@/components/glass/Glass';
import { Glow } from '@/components/Glow';
import { Stars } from '@/components/Stars';
import { GlassSweep } from '@/components/GlassSweep';
import { haptics } from '@/lib/haptics';
import { APPS, LOGOS } from './AppSlider';

/**
 * iOS n'autorise aucune app a poser une icone sur l'ecran d'accueil. Le
 * chemin qui marche vraiment passe par Raccourcis : un raccourci « Ouvrir
 * l'URL » que l'utilisateur ajoute lui-meme. On lui donne le lien et les
 * trois gestes, rien de plus.
 */
export function Widgets() {
  const router = useRouter();
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (id: string) => {
    const link = `unswipe://client/${id}`;
    await Clipboard.setStringAsync(link);
    haptics.success();
    setCopied(id);
    setTimeout(() => setCopied((c) => (c === id ? null : c)), 2200);
  };

  return (
    <View style={st.root}>
      <Glow />
      <Stars />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={st.head}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={st.back}>
            <ChevronLeft size={20} strokeWidth={2} color={colors.mist} />
          </Pressable>
          <Text variant="title">Écran d’accueil</Text>
          <View style={st.back} />
        </View>

        <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
          <Text variant="displayM">Tes apps filtrées, à côté des autres.</Text>

          <Glass radius={22} intensity={45} warmEdge="none" style={st.steps}>
            <Step n="1" text="Copie le lien de l’app ci-dessous." />
            <Step n="2" text="Ouvre Raccourcis → + → Ouvrir l’URL → colle le lien." />
            <Step n="3" text="Partager → Sur l’écran d’accueil. Choisis le nom et l’icône." />
          </Glass>

          <Text variant="label" tone="tertiary" style={{ marginTop: space.xl }}>LIENS</Text>
          <View style={{ gap: space.sm, marginTop: space.sm }}>
            {APPS.map((a) => (
              <Pressable key={a.id} style={st.row} onPress={() => { void copy(a.id); }}>
                <Image source={LOGOS[a.id]} style={st.logo} contentFit="contain" />
                <View style={{ flex: 1 }}>
                  <Text variant="body">{a.name}</Text>
                  <Text variant="label" tone="tertiary">unswipe://client/{a.id}</Text>
                </View>
                {copied === a.id
                  ? <Check size={18} strokeWidth={2.2} color={colors.accent} />
                  : <Copy size={17} strokeWidth={1.8} color={withAlpha(colors.mist, 0.45)} />}
              </Pressable>
            ))}
          </View>

          {Platform.OS === 'ios' && (
            <Pressable
              style={st.open}
              onPress={() => { haptics.press(); void Linking.openURL('shortcuts://'); }}
            >
              <Text variant="button" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                Ouvrir Raccourcis
              </Text>
            </Pressable>
          )}
        </ScrollView>
      </SafeAreaView>
      <GlassSweep />
    </View>
  );
}

function Step({ n, text }: { n: string; text: string }) {
  return (
    <View style={st.step}>
      <View style={st.badge}><Text variant="label" color={colors.night}>{n}</Text></View>
      <Text variant="body" style={{ flex: 1 }}>{text}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.night },
  head: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: gutter, paddingBottom: space.sm,
  },
  back: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: gutter, paddingTop: space.lg, paddingBottom: space.xxl },
  steps: { padding: space.lg, marginTop: space.xl, gap: space.md },
  step: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  badge: {
    width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    padding: space.md, borderRadius: 18, backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line,
  },
  logo: { width: 40, height: 40 },
  open: {
    height: 52, borderRadius: 26, marginTop: space.xl,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg,
    backgroundColor: withAlpha(colors.accent, 0.16),
    borderWidth: StyleSheet.hairlineWidth, borderColor: withAlpha(colors.accent, 0.4),
  },
});
