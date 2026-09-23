import { useState, useMemo } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { Asset } from 'expo-asset';
import * as MediaLibrary from 'expo-media-library';
import { ChevronLeft, Copy, Check, Download } from 'lucide-react-native';
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

/**
 * Les icones a poser sur l'ecran d'accueil.
 *
 * Ce ne sont PAS celles de l'app : celles-ci sont mates et pleines, faites
 * pour se tenir a cote des vraies applications sans jurer. Raccourcis ne
 * sait choisir une icone que dans la photothèque — il faut donc les y
 * enregistrer d'abord, et c'est tout ce que fait le bouton.
 */
const SHORTCUT_ICONS = {
  instagram: require('@/assets/shortcuts/instagram.png'),
  tiktok: require('@/assets/shortcuts/tiktok.png'),
  twitter: require('@/assets/shortcuts/twitter.png'),
  youtube: require('@/assets/shortcuts/youtube.png'),
} as const;

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
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const saveIcons = async () => {
    haptics.press();
    setSaving(true);
    try {
      const { granted } = await MediaLibrary.requestPermissionsAsync(true);
      if (!granted) { setSaving(false); return; }
      for (const a of APPS) {
        const asset = Asset.fromModule(SHORTCUT_ICONS[a.id]);
        await asset.downloadAsync();
        if (asset.localUri) await MediaLibrary.saveToLibraryAsync(asset.localUri);
      }
      haptics.success();
      setSaved(true);
    } catch {
      // Refus ou photothèque indisponible : on ne bloque pas l'ecran pour ca.
    }
    setSaving(false);
  };

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
            <ChevronLeft size={20} strokeWidth={2} color={c.mist} />
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
                  ? <Check size={18} strokeWidth={2.2} color={c.accent} />
                  : <Copy size={17} strokeWidth={1.8} color={withAlpha(c.mist, 0.45)} />}
              </Pressable>
            ))}
          </View>

          <Text variant="label" tone="tertiary" style={{ marginTop: space.xl }}>ICÔNES</Text>
          <Glass radius={22} intensity={45} warmEdge="none" style={st.icons}>
            <View style={st.iconRow}>
              {APPS.map((a) => (
                <Image
                  key={a.id}
                  source={SHORTCUT_ICONS[a.id]}
                  style={st.shortcutIcon}
                  contentFit="contain"
                />
              ))}
            </View>
            <Text variant="body" tone="secondary" style={st.iconsBody}>
              Raccourcis ne sait choisir une icône que dans tes photos. On les
              y dépose, tu les retrouves à l’étape « Choisis le nom et l’icône ».
            </Text>
            <Pressable style={st.save} onPress={() => { void saveIcons(); }} disabled={saving}>
              {saved
                ? <Check size={16} strokeWidth={2.4} color={c.accent} />
                : <Download size={16} strokeWidth={2} color={c.accent} />}
              <Text variant="label" color={c.accent}>
                {saved ? 'Enregistrées dans tes photos' : saving ? 'Un instant…' : 'Enregistrer les icônes'}
              </Text>
            </Pressable>
          </Glass>

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
  icons: { padding: space.lg, marginTop: space.sm, gap: space.md },
  iconRow: { flexDirection: 'row', justifyContent: 'center', gap: space.md },
  shortcutIcon: { width: 56, height: 56, borderRadius: 13 },
  iconsBody: { lineHeight: 20 },
  save: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm,
    paddingVertical: space.md, borderRadius: 14,
    backgroundColor: withAlpha(c.accent, 0.12),
    borderWidth: StyleSheet.hairlineWidth, borderColor: withAlpha(c.accent, 0.35),
  },
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
  open: {
    height: 52, borderRadius: 26, marginTop: space.xl,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg,
    backgroundColor: withAlpha(c.accent, 0.16),
    borderWidth: StyleSheet.hairlineWidth, borderColor: withAlpha(c.accent, 0.4),
  },
});
