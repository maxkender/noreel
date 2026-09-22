import { useState } from 'react';
import {
  Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { Lock } from 'lucide-react-native';
import { colors, withAlpha } from '@/theme/colors';
import { space } from '@/theme/spacing';
import { Text } from '@/components/type/Text';
import { Button } from '@/components/Button';
import { haptics } from '@/lib/haptics';
import { APP_TOGGLES, useAppsStore } from '@/store/apps';
import type { ClientId } from '@/features/client/blockers';
import { Toggle } from './parts';

const LOGOS = {
  instagram: require('@/assets/apps/instagram.png'),
  tiktok: require('@/assets/apps/tiktok.png'),
  twitter: require('@/assets/apps/twitter.png'),
  youtube: require('@/assets/apps/youtube.png'),
} as const;

const APPS: { id: ClientId; name: string }[] = [
  { id: 'instagram', name: 'Instagram' },
  { id: 'tiktok', name: 'TikTok' },
  { id: 'twitter', name: 'X' },
  { id: 'youtube', name: 'YouTube' },
];

/** Carrousel plein cadre : une app par page, son temps du jour, ses reglages. */
export function AppCarousel({ minutesByApp }: { minutesByApp: Record<string, number> }) {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const [sheet, setSheet] = useState<ClientId | null>(null);

  return (
    <>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={{ width }}
        contentContainerStyle={{ width: width * APPS.length }}
      >
        {APPS.map((app) => (
          <View key={app.id} style={[styles.page, { width }]}>
            <Text variant="label" tone="tertiary">{app.name} aujourd’hui</Text>
            <Text variant="hero" style={styles.minutes} numberOfLines={1} adjustsFontSizeToFit>
              {minutesByApp[app.id] ?? 0}m
            </Text>

            <Pressable onPress={() => { haptics.tap(); setSheet(app.id); }} hitSlop={8}>
              <Text variant="label" tone="secondary">Réglages ›</Text>
            </Pressable>

            <Pressable
              onPress={() => { haptics.press(); router.push(`/client/${app.id}`); }}
              style={styles.iconWrap}
            >
              <Image source={LOGOS[app.id]} style={styles.icon} contentFit="contain" />
            </Pressable>

            <Button label={`Ouvrir ${app.name}`} onPress={() => router.push(`/client/${app.id}`)} />
          </View>
        ))}
      </ScrollView>

      <Modal visible={!!sheet} transparent animationType="fade" onRequestClose={() => setSheet(null)}>
        <Pressable style={styles.scrim} onPress={() => setSheet(null)}>
          <Animated.View entering={SlideInDown.springify().damping(24).stiffness(160)} style={styles.sheet}>
            <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={styles.sheetTint} />
            <View style={styles.grip} />

            <View style={styles.sheetHead}>
              <Text variant="title">{APPS.find((a) => a.id === sheet)?.name}</Text>
              <Pressable onPress={() => setSheet(null)} hitSlop={12}>
                <Text variant="body" color={colors.accent}>OK</Text>
              </Pressable>
            </View>

            {sheet && <TogglesFor app={sheet} />}
          </Animated.View>
        </Pressable>
      </Modal>
    </>
  );
}

function TogglesFor({ app }: { app: ClientId }) {
  const isOn = useAppsStore((s) => s.isOn);
  const toggle = useAppsStore((s) => s.toggle);
  const settings = useAppsStore((s) => s.settings);
  void settings; // force le rendu quand un reglage change

  const locked = APP_TOGGLES[app].filter((t) => t.locked);
  const free = APP_TOGGLES[app].filter((t) => !t.locked);

  return (
    <Animated.View entering={FadeIn.duration(220)}>
      <Text variant="label" tone="tertiary" style={styles.group}>Toujours actif</Text>
      {locked.map((t) => (
        <View key={t.key} style={styles.row}>
          <Lock size={14} strokeWidth={2} color={withAlpha(colors.mist, 0.4)} />
          <Text variant="body" style={{ flex: 1 }}>{t.label}</Text>
          <Toggle on onChange={() => haptics.tap()} />
        </View>
      ))}

      <Text variant="label" tone="tertiary" style={styles.group}>Réglages</Text>
      {free.map((t) => (
        <View key={t.key} style={styles.row}>
          <Text variant="body" style={{ flex: 1 }}>{t.label}</Text>
          <Toggle on={isOn(app, t.key)} onChange={(v) => toggle(app, t.key, v)} />
        </View>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  page: { alignItems: 'center', gap: space.sm, paddingHorizontal: space.xl },
  minutes: { textAlign: 'center' },
  iconWrap: { marginVertical: space.xl },
  icon: { width: 132, height: 132 },
  scrim: { flex: 1, backgroundColor: '#000000B0', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 26, borderTopRightRadius: 26, overflow: 'hidden',
    paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.xxl,
  },
  sheetTint: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#0E1014E6' },
  grip: { width: 38, height: 4, borderRadius: 2, backgroundColor: colors.lineStrong, alignSelf: 'center' },
  sheetHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: space.lg,
  },
  group: { marginTop: space.md, marginBottom: space.sm },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line,
  },
});
