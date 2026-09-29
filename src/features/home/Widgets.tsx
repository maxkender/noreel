import { useState, useMemo } from 'react';
import { Linking, Platform, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { Asset } from 'expo-asset';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { ChevronLeft, Copy, Check, ImageDown } from 'lucide-react-native';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { gutter, space } from '@/theme/spacing';
import { Text } from '@/components/type/Text';
import { Glass } from '@/components/glass/Glass';
import { Glow } from '@/components/Glow';
import { Stars } from '@/components/Stars';
import { GlassSweep } from '@/components/GlassSweep';
import { haptics } from '@/lib/haptics';
import { APPS, LOGOS } from './AppSlider';
import { dict } from '@/i18n';
import { useSettings } from '@/store/settings';
import { Button } from '@/components/Button';


/**
 * iOS n'autorise aucune app a poser une icone sur l'ecran d'accueil. Le
 * chemin qui marche vraiment passe par Raccourcis : un raccourci « Ouvrir
 * l'URL » que l'utilisateur ajoute lui-meme. On lui donne le lien et les
 * trois gestes, rien de plus.
 */
export function Widgets() {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const router = useRouter();
  const [copied, setCopied] = useState<string | null>(null);
  const setSetting = useSettings((x) => x.set);
  const done = () => { haptics.success(); setSetting('homeShortcutsDone', true); router.back(); };

  /*
    L'icone, a enregistrer dans Photos : Raccourcis la prend ensuite comme
    image du raccourci. iOS n'a pas d'autre chemin qu'une feuille de partage
    pour donner une image a quelqu'un — donc c'est elle.
  */
  const saveIcon = async (id: keyof typeof LOGOS) => {
    haptics.tap();
    try {
      const [asset] = await Asset.loadAsync(LOGOS[id]);
      const uri = asset.localUri ?? asset.uri;
      await Share.share(Platform.OS === 'ios' ? { url: uri } : { message: uri });
    } catch { /* la feuille a ete refermee, ou l'image ne s'est pas chargee */ }
  };

  const copy = async (id: string) => {
    const link = `unswipe://client/${id}`;
    await Clipboard.setStringAsync(link);
    haptics.success();
    setCopied(id);
    setTimeout(() => setCopied((k) => (k === id ? null : k)), 2200);
  };

  return (
    <View style={st.root}>
      <Glow />
      <Stars />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={st.head}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={st.back}>
            <ChevronLeft size={20} strokeWidth={2} color={c.mist} />
          </Pressable>
          <Text variant="title">{dict.misc.homeScreen}</Text>
          <View style={st.back} />
        </View>

        <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
          <Text variant="displayM">{dict.misc.homeScreenBody}</Text>

          <Glass radius={22} intensity={45} warmEdge="none" style={st.steps}>
            <Step n="1" text="Copie le lien de l’app ci-dessous." />
            <Step n="2" text="Ouvre Raccourcis → + → Ouvrir l’URL → colle le lien." />
            <Step n="3" text="Partager → Sur l’écran d’accueil. Choisis le nom et l’icône." />
          </Glass>
          <Text variant="label" tone="tertiary" style={{ marginTop: space.md }}>{dict.misc.iconHint}</Text>

          <Text variant="label" tone="tertiary" style={{ marginTop: space.xl }}>LIENS</Text>
          <View style={{ gap: space.sm, marginTop: space.sm }}>
            {APPS.map((a) => (
              <Pressable key={a.id} style={st.row} onPress={() => { void copy(a.id); }}>
                <Image source={LOGOS[a.id]} style={st.logo} contentFit="contain" />
                <View style={{ flex: 1 }}>
                  <Text variant="body">{a.name}</Text>
                  <Text variant="label" tone="tertiary">unswipe://client/{a.id}</Text>
                </View>
                <Pressable onPress={() => { void saveIcon(a.id); }} hitSlop={8} style={st.iconBtn} accessibilityRole="button" accessibilityLabel={dict.misc.saveIcon}>
                  <ImageDown size={16} strokeWidth={2} color={c.accent} />
                </Pressable>
                {copied === a.id
                  ? <Check size={18} strokeWidth={2.2} color={c.accent} />
                  : <Copy size={17} strokeWidth={1.8} color={withAlpha(c.mist, 0.45)} />}
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

          {/* Une fois fait, on le dit : le badge de l'accueil s'en va. */}
          <View style={{ marginTop: space.xl }}>
            <Button label={dict.misc.homeDone} onPress={done} />
          </View>
        </ScrollView>
      </SafeAreaView>
      <GlassSweep />
    </View>
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
  root: { flex: 1, backgroundColor: c.night },
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
    backgroundColor: c.accent,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    padding: space.md, borderRadius: 18, backgroundColor: c.surface,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.line,
  },
  logo: { width: 40, height: 40 },
  iconBtn: {
    width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    backgroundColor: withAlpha(c.accent, 0.12),
  },
  open: {
    height: 52, borderRadius: 26, marginTop: space.xl,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg,
    backgroundColor: withAlpha(c.accent, 0.16),
    borderWidth: StyleSheet.hairlineWidth, borderColor: withAlpha(c.accent, 0.4),
  },
});
