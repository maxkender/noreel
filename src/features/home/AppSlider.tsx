import { useCallback, useState, useMemo } from 'react';
import {
  Pressable, StyleSheet, View, useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import Animated, {
  FadeIn, Extrapolation, interpolate, runOnJS, useAnimatedReaction,
  useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, type SharedValue,
} from 'react-native-reanimated';
import { ChevronRight, Lock } from 'lucide-react-native';
import { withAlpha } from '@/theme/colors';
import { useBlurTint, useColors, type Palette } from '@/theme/useColors';
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

const TILE = 168;

/**
 * Une roue d'icones : celle du milieu en grand, ses voisines de biais.
 *
 * La version precedente donnait un ecran entier a chaque app. Rien ne
 * depassait, donc rien ne disait qu'il y en avait d'autres — il fallait
 * deviner le geste. Chaque app n'occupe plus qu'une PART de la largeur :
 * les voisines mordent sur les bords, floutees, et le glissement devient
 * evident sans qu'on ait a l'ecrire.
 */
export function AppSlider({ minutes }: { minutes: Record<string, number> }) {
  const c = useColors();
  const tint = useBlurTint();
  const st = useMemo(() => sheet(c), [c]);
  const { width } = useWindowDimensions();
  const item = Math.round(width * 0.48);
  const side = (width - item) / 2;
  const [i, setI] = useState(0);
  const x = useSharedValue(0);

  const onScroll = useAnimatedScrollHandler((e) => { x.value = e.contentOffset.x; });

  const select = useCallback((next: number) => {
    haptics.tick();
    setI(next);
  }, []);

  // Le nom change des que la roue passe le milieu, pas quand elle s'arrete :
  // attendre la fin du geste donnait une legende en retard sur l'icone.
  useAnimatedReaction(
    () => Math.round(x.value / item),
    (cur, prev) => {
      if (cur !== prev && cur >= 0 && cur < APPS.length) runOnJS(select)(cur);
    },
    [item]
  );

  const app = APPS[i];

  return (
    <View>
      <View style={{ width, marginLeft: -gutter }}>
        <Animated.ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          snapToInterval={item}
          decelerationRate="fast"
          disableIntervalMomentum
          contentContainerStyle={{ paddingHorizontal: side }}
        >
          {APPS.map((a, k) => (
            <Tile key={a.id} app={a} index={k} x={x} item={item} />
          ))}
        </Animated.ScrollView>

        {/* Les voisines passent SOUS un verre depoli : visibles assez pour
            qu'on sache qu'elles sont la, jamais assez pour tirer l'oeil hors
            du centre. */}
        <View style={[st.veil, { left: 0, width: side }]} pointerEvents="none">
          <BlurView intensity={16} tint={tint} style={StyleSheet.absoluteFill} />
        </View>
        <View style={[st.veil, { right: 0, width: side }]} pointerEvents="none">
          <BlurView intensity={16} tint={tint} style={StyleSheet.absoluteFill} />
        </View>
      </View>

      <Animated.View key={app.id} entering={FadeIn.duration(220)} style={st.legend}>
        <Text variant="displayM">{app.name}</Text>
        <Text variant="label" tone="secondary">{app.sub}</Text>
        <Open id={app.id} minutes={minutes[app.id] ?? 0} />
      </Animated.View>

      {/*
        Le panneau n'est plus REMONTE a chaque app.
        Il portait une cle liee a l'app : changer d'icone detruisait le
        panneau et son flou pour en reconstruire un identique, en plein
        geste. C'est ce qui accrochait. Son contenu change, son enveloppe
        reste.
      */}
      <Animated.View entering={FadeIn.duration(260)}>
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

/** Une icone de la roue. Elle recule, s'efface et se tourne de biais. */
function Tile({
  app, index, x, item,
}: {
  app: (typeof APPS)[number];
  index: number;
  x: SharedValue<number>;
  item: number;
}) {
  const router = useRouter();
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);

  const anim = useAnimatedStyle(() => {
    // 0 au centre, 1 juste a cote. La distance ABSOLUE regle la taille et
    // l'opacite ; la distance signee regle le sens de la rotation.
    const d = x.value / item - index;
    const a = Math.abs(d);
    return {
      opacity: interpolate(a, [0, 1, 2], [1, 0.55, 0.28], Extrapolation.CLAMP),
      transform: [
        { perspective: 700 },
        { scale: interpolate(a, [0, 1, 2], [1, 0.62, 0.5], Extrapolation.CLAMP) },
        { rotateY: `${interpolate(d, [-2, 0, 2], [-20, 0, 20], Extrapolation.CLAMP)}deg` },
      ],
    };
  }, [item]);

  return (
    <Animated.View style={[st.slot, { width: item }, anim]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Ouvrir ${app.name}`}
        onPress={() => { haptics.press(); router.push(`/client/${app.id}`); }}
      >
        <Glass radius={40} intensity={45} warmEdge="none" style={st.tile}>
          <Image source={LOGOS[app.id]} style={st.logo} contentFit="contain" />
        </Glass>
      </Pressable>
    </Animated.View>
  );
}

function Open({ id, minutes }: { id: ClientId; minutes: number }) {
  const router = useRouter();
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);

  return (
    <Pressable
      style={st.open}
      accessibilityRole="button"
      onPress={() => { haptics.press(); router.push(`/client/${id}`); }}
    >
      <Text variant="label" color={c.accent}>
        {minutes > 0 ? `${minutes} min aujourd’hui · Ouvrir` : 'Ouvrir'}
      </Text>
      <ChevronRight size={15} strokeWidth={2.2} color={c.accent} />
    </Pressable>
  );
}

function Toggles({ app }: { app: ClientId }) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const isOn = useAppsStore((s) => s.isOn);
  const toggle = useAppsStore((s) => s.toggle);
  useAppsStore((s) => s.settings); // re-rend a chaque changement

  return (
    <View>
      {APP_TOGGLES[app].map((t) => (
        <View key={t.key} style={st.line}>
          {t.locked && <Lock size={12} strokeWidth={2} color={withAlpha(c.mist, 0.3)} />}
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

const sheet = (c: Palette) => StyleSheet.create({
  slot: { alignItems: 'center', justifyContent: 'center', paddingVertical: space.md },
  tile: {
    width: TILE, height: TILE, alignItems: 'center', justifyContent: 'center',
  },
  logo: { width: TILE * 0.66, height: TILE * 0.66 },
  veil: { position: 'absolute', top: 0, bottom: 0 },
  legend: { alignItems: 'center', gap: 4, marginTop: space.md },
  open: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: space.md,
    paddingHorizontal: space.lg, paddingVertical: space.sm, borderRadius: 999,
    backgroundColor: withAlpha(c.accent, 0.12),
    borderWidth: StyleSheet.hairlineWidth, borderColor: withAlpha(c.accent, 0.35),
  },
  panel: { marginTop: space.lg, paddingHorizontal: space.lg, paddingBottom: space.sm },
  panelHead: { paddingTop: space.lg, paddingBottom: space.xs },
  line: {
    flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 13,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: withAlpha(c.mist, 0.1),
  },
});
