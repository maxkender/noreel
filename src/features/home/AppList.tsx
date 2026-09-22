import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { ChevronRight, Lock, Settings2 } from 'lucide-react-native';
import { colors, withAlpha } from '@/theme/colors';
import { space } from '@/theme/spacing';
import { Text } from '@/components/type/Text';
import { haptics } from '@/lib/haptics';
import { APP_TOGGLES, useAppsStore } from '@/store/apps';
import type { ClientId } from '@/features/client/blockers';
import { Toggle } from './parts';

export const LOGOS = {
  instagram: require('@/assets/apps/instagram.png'),
  tiktok: require('@/assets/apps/tiktok.png'),
  twitter: require('@/assets/apps/twitter.png'),
  youtube: require('@/assets/apps/youtube.png'),
} as const;

export const APPS: { id: ClientId; name: string; sub: string }[] = [
  { id: 'instagram', name: 'Instagram', sub: 'Messages, stories, abonnements' },
  { id: 'tiktok', name: 'TikTok', sub: 'Abonnements uniquement' },
  { id: 'twitter', name: 'X', sub: 'Abonnements, sans tendances' },
  { id: 'youtube', name: 'YouTube', sub: 'Abonnements, sans Shorts' },
];

/** Liste verticale : toutes les apps visibles d'un coup, plus de pagination. */
export function AppList({ minutes }: { minutes: Record<string, number> }) {
  const router = useRouter();
  const [sheet, setSheet] = useState<ClientId | null>(null);

  return (
    <>
      <View style={st.list}>
        {APPS.map((app) => (
          <View key={app.id} style={st.row}>
            <Pressable
              style={st.main}
              onPress={() => { haptics.press(); router.push(`/client/${app.id}`); }}
            >
              <Image source={LOGOS[app.id]} style={st.logo} contentFit="contain" />
              <View style={{ flex: 1 }}>
                <Text variant="body">{app.name}</Text>
                <Text variant="label" tone="secondary" numberOfLines={1}>{app.sub}</Text>
              </View>
              <Text variant="label" tone="tertiary">{minutes[app.id] ?? 0}m</Text>
              <ChevronRight size={18} strokeWidth={2} color={withAlpha(colors.mist, 0.3)} />
            </Pressable>

            <Pressable
              onPress={() => { haptics.tap(); setSheet(app.id); }}
              hitSlop={10}
              style={st.gear}
              accessibilityLabel={`Réglages ${app.name}`}
            >
              <Settings2 size={17} strokeWidth={1.8} color={withAlpha(colors.mist, 0.5)} />
            </Pressable>
          </View>
        ))}
      </View>

      <Modal visible={!!sheet} transparent animationType="fade" onRequestClose={() => setSheet(null)}>
        <Pressable style={st.scrim} onPress={() => setSheet(null)}>
          <Animated.View entering={SlideInDown.springify().damping(26).stiffness(180)} style={st.sheet}>
            <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={st.sheetTint} />
            <View style={st.grip} />
            <View style={st.head}>
              {sheet && <Image source={LOGOS[sheet]} style={st.headLogo} contentFit="contain" />}
              <Text variant="title" style={{ flex: 1 }}>
                {APPS.find((a) => a.id === sheet)?.name}
              </Text>
              <Pressable onPress={() => setSheet(null)} style={st.done} hitSlop={10}>
                <Text variant="label" color={colors.night}>OK</Text>
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {sheet && <Toggles app={sheet} />}
            </ScrollView>
          </Animated.View>
        </Pressable>
      </Modal>
    </>
  );
}

function Toggles({ app }: { app: ClientId }) {
  const isOn = useAppsStore((s) => s.isOn);
  const toggle = useAppsStore((s) => s.toggle);
  useAppsStore((s) => s.settings); // re-rend a chaque changement

  const locked = APP_TOGGLES[app].filter((t) => t.locked);
  const free = APP_TOGGLES[app].filter((t) => !t.locked);

  return (
    <Animated.View entering={FadeIn.duration(200)}>
      <Text variant="label" tone="tertiary" style={st.group}>Toujours actif</Text>
      {locked.map((t) => (
        <View key={t.key} style={st.line}>
          <Lock size={13} strokeWidth={2} color={withAlpha(colors.mist, 0.35)} />
          <Text variant="body" style={{ flex: 1 }}>{t.label}</Text>
          <Toggle on onChange={() => haptics.tap()} />
        </View>
      ))}
      <Text variant="label" tone="tertiary" style={st.group}>Réglages</Text>
      {free.map((t) => (
        <View key={t.key} style={st.line}>
          <Text variant="body" style={{ flex: 1 }}>{t.label}</Text>
          <Toggle on={isOn(app, t.key)} onChange={(v) => toggle(app, t.key, v)} />
        </View>
      ))}
    </Animated.View>
  );
}

const st = StyleSheet.create({
  list: { gap: space.sm },
  row: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 18, backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line,
  },
  main: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.lg,
    paddingVertical: space.md, paddingHorizontal: space.lg,
  },
  logo: { width: 72, height: 72 },
  gear: {
    width: 46, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch',
    borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.line,
  },
  scrim: { flex: 1, backgroundColor: '#000000B8', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden',
    paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.xxl,
  },
  sheetTint: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#0B0D11F0' },
  grip: { width: 38, height: 4, borderRadius: 2, backgroundColor: colors.lineStrong, alignSelf: 'center' },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.lg },
  headLogo: { width: 44, height: 44 },
  done: {
    width: 44, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  group: { marginTop: space.md, marginBottom: space.xs },
  line: {
    flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line,
  },
});
