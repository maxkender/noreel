import { useState } from 'react';
import {
  Pressable, StyleSheet, View, useWindowDimensions,
  type NativeScrollEvent, type NativeSyntheticEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import Animated, {
  FadeIn, Extrapolation, interpolate, useAnimatedScrollHandler,
  useAnimatedStyle, useSharedValue, type SharedValue,
} from 'react-native-reanimated';
import { ChevronRight, Lock } from 'lucide-react-native';
import { colors, withAlpha } from '@/theme/colors';
import { gutter, space } from '@/theme/spacing';
import { Text } from '@/components/type/Text';
import { Glass } from '@/components/glass/Glass';
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
  { id: 'instagram', name: 'Instagram', sub: 'Sans Reels, sans Explorer' },
  { id: 'tiktok', name: 'TikTok', sub: 'Abonnements uniquement' },
  { id: 'twitter', name: 'X', sub: 'Sans « Pour vous »' },
  { id: 'youtube', name: 'YouTube', sub: 'Sans Shorts' },
];

const TILE = 208;

/**
 * Les icones defilent comme des diapositives et les reglages de l'app
 * affichee sont juste en dessous : on ne quitte jamais l'accueil.
 */
export function AppSlider({ minutes }: { minutes: Record<string, number> }) {
  const { width } = useWindowDimensions();
  const [i, setI] = useState(0);
  const x = useSharedValue(0);

  const onScroll = useAnimatedScrollHandler((e) => { x.value = e.contentOffset.x; });

  // On ne change l'etat JS qu'une fois la diapositive posee : zero re-rendu
  // pendant le geste, donc aucun a-coup.
  const onSettled = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== i && next >= 0 && next < APPS.length) { haptics.tick(); setI(next); }
  };

  const app = APPS[i];

  return (
    <View>
      <Animated.ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        onMomentumScrollEnd={onSettled}
        scrollEventThrottle={16}
        style={{ width, marginLeft: -gutter }}
      >
        {APPS.map((a, k) => (
          <Slide key={a.id} app={a} index={k} x={x} width={width} minutes={minutes[a.id] ?? 0} />
        ))}
      </Animated.ScrollView>

      <View style={st.dots}>
        {APPS.map((a, k) => (
          <View key={a.id} style={[st.dot, k === i && st.dotOn]} />
        ))}
      </View>

      <Animated.View key={app.id} entering={FadeIn.duration(260)}>
        <Glass radius={26} intensity={60} warmEdge="none" style={st.panel}>
          <View style={st.panelHead}>
            <Text variant="label" tone="tertiary">RÉGLAGES {app.name.toUpperCase()}</Text>
          </View>
          <Toggles app={app.id} />
        </Glass>
      </Animated.View>
    </View>
  );
}

function Slide({
  app, index, x, width, minutes,
}: {
  app: (typeof APPS)[number];
  index: number;
  x: SharedValue<number>;
  width: number;
  minutes: number;
}) {
  const router = useRouter();

  // La diapositive voisine recule et s'efface : la profondeur vient de la,
  // pas d'une ombre posee a plat.
  const anim = useAnimatedStyle(() => {
    const d = (x.value - index * width) / width;
    return {
      opacity: interpolate(Math.abs(d), [0, 1], [1, 0.25], Extrapolation.CLAMP),
      transform: [
        { scale: interpolate(Math.abs(d), [0, 1], [1, 0.82], Extrapolation.CLAMP) },
        { translateX: -d * 34 },
      ],
    };
  });

  return (
    <Animated.View style={[st.page, { width }, anim]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Ouvrir ${app.name}`}
        onPress={() => { haptics.press(); router.push(`/client/${app.id}`); }}
      >
        <Glass radius={44} intensity={45} warmEdge="none" style={st.tile}>
          <Image source={LOGOS[app.id]} style={st.logo} contentFit="contain" />
        </Glass>
      </Pressable>

      <Text variant="displayM" style={st.name}>{app.name}</Text>
      <Text variant="label" tone="secondary">{app.sub}</Text>

      <Pressable
        style={st.open}
        onPress={() => { haptics.press(); router.push(`/client/${app.id}`); }}
      >
        <Text variant="label" color={colors.accent}>
          {minutes > 0 ? `${minutes} min aujourd’hui · Ouvrir` : 'Ouvrir'}
        </Text>
        <ChevronRight size={15} strokeWidth={2.2} color={colors.accent} />
      </Pressable>
    </Animated.View>
  );
}

function Toggles({ app }: { app: ClientId }) {
  const isOn = useAppsStore((s) => s.isOn);
  const toggle = useAppsStore((s) => s.toggle);
  useAppsStore((s) => s.settings); // re-rend a chaque changement

  return (
    <View>
      {APP_TOGGLES[app].map((t) => (
        <View key={t.key} style={st.line}>
          {t.locked && <Lock size={12} strokeWidth={2} color={withAlpha(colors.mist, 0.3)} />}
          <Text variant="body" style={{ flex: 1 }}>{t.label}</Text>
          <Toggle
            on={t.locked ? true : isOn(app, t.key)}
            onChange={(v) => (t.locked ? haptics.tap() : toggle(app, t.key, v))}
          />
        </View>
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  page: { alignItems: 'center', gap: 6, paddingVertical: space.md },
  tile: {
    width: TILE, height: TILE, alignItems: 'center', justifyContent: 'center',
    marginBottom: space.lg,
  },
  logo: { width: TILE * 0.66, height: TILE * 0.66 },
  name: { marginTop: 2 },
  open: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: space.md,
    paddingHorizontal: space.lg, paddingVertical: space.sm, borderRadius: 999,
    backgroundColor: withAlpha(colors.accent, 0.12),
    borderWidth: StyleSheet.hairlineWidth, borderColor: withAlpha(colors.accent, 0.35),
  },
  dots: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginTop: space.lg },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: withAlpha(colors.mist, 0.18) },
  dotOn: { width: 22, backgroundColor: colors.accent },
  panel: { marginTop: space.lg, paddingHorizontal: space.lg, paddingBottom: space.sm },
  panelHead: { paddingTop: space.lg, paddingBottom: space.xs },
  line: {
    flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 13,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: withAlpha(colors.mist, 0.1),
  },
});
