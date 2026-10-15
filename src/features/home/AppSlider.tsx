import { useCallback, useEffect, useState, useMemo } from 'react';
import {
  Pressable, StyleSheet, View, useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import Animated, {
  FadeIn, Extrapolation, interpolate, runOnJS, useAnimatedReaction,
  useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { ChevronDown, ChevronRight, Lock } from 'lucide-react-native';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { gutter, space } from '@/theme/spacing';
import { Text } from '@/components/type/Text';
import { Glass } from '@/components/glass/Glass';
import { haptics } from '@/lib/haptics';
import { APP_TOGGLES, useAppsStore } from '@/store/apps';
import type { ClientId } from '@/features/client/blockers';
import { Toggle } from './parts';
import { LockedPill } from './LockedPill';
import { ProGate } from './ProGate';
import { useProStore } from '@/store/pro';
import { dict, interpolate as fillIn } from '@/i18n';
import { useAnchor } from './anchors';
import type { Dict } from '@/i18n/fr';

/**
 * Ce que la version gratuite ouvre.
 *
 * Instagram entier, et rien d'autre. Le cadenas est POSE sur l'icone plutot
 * que l'icone retiree : on doit voir ce qu'on n'a pas, sinon l'offre ne veut
 * rien dire.
 */
const FREE: ClientId = 'instagram';

export const LOGOS = {
  instagram: require('@/assets/apps/instagram.png'),
  tiktok: require('@/assets/apps/tiktok.png'),
  twitter: require('@/assets/apps/twitter.png'),
  youtube: require('@/assets/apps/youtube.png'),
} as const;

/* Le sous-titre est une CLE du dictionnaire : lu a l'affichage, dans la langue du moment. */
export const APPS: { id: ClientId; name: string; sub: keyof Dict['ui'] }[] = [
  { id: 'instagram', name: 'Instagram', sub: 'subIg' },
  { id: 'tiktok', name: 'TikTok', sub: 'subTt' },
  { id: 'twitter', name: 'X', sub: 'subX' },
  { id: 'youtube', name: 'YouTube', sub: 'subYt' },
];

// L'icone occupe presque tout son emplacement : c'est ce qu'on vient
// chercher, elle n'a pas a partager la place avec du vide.
const RATIO = 0.44;   // part de la largeur : l'app du milieu ET ses deux voisines se voient
const FILL = 0.94;    // part de cet emplacement occupee par l'icone

/**
 * Une roue d'icones : celle du milieu en grand, ses voisines de biais.
 *
 * La version precedente donnait un ecran entier a chaque app. Rien ne
 * depassait, donc rien ne disait qu'il y en avait d'autres — il fallait
 * deviner le geste. Chaque app n'occupe plus qu'une PART de la largeur :
 * les voisines mordent sur les bords, floutees, et le glissement devient
 * evident sans qu'on ait a l'ecrire.
 */
/*
 * L'ordre de la ROUE : Instagram au milieu, entre deux autres, et c'est lui
 * qu'on voit en arrivant.
 */
const WHEEL = [APPS[1], APPS[0], APPS[2], APPS[3]];
const START = 1;

export function AppSlider({ minutes, mode = 'swipe' }: { minutes: Record<string, number>; mode?: 'swipe' | 'grid' | 'list' }) {
  if (mode !== 'swipe') return <AppBoard mode={mode} minutes={minutes} />;
  return <AppWheel minutes={minutes} />;
}

function AppWheel({ minutes }: { minutes: Record<string, number> }) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const { width } = useWindowDimensions();
  const item = Math.round(width * RATIO);
  const tile = Math.round(item * FILL);
  const side = (width - item) / 2;
  const [i, setI] = useState(START);
  const [open, setOpen] = useState(false);
  const [gate, setGate] = useState(false);
  const pro = useProStore((p) => p.pro);
  const x = useSharedValue(START * item);
  const turn = useSharedValue(0);
  const chevron = useAnimatedStyle(() => ({
    transform: [{ rotate: `${turn.value * 180}deg` }],
  }));

  const onScroll = useAnimatedScrollHandler((e) => { x.value = e.contentOffset.x; });

  const select = useCallback((next: number) => {
    haptics.tick();
    setI(next);
  }, []);

  // Le chevron suit l'etat du panneau, sans le piloter.
  useEffect(() => {
    turn.value = withTiming(open ? 1 : 0, { duration: 220 });
  }, [open, turn]);

  // Le nom change des que la roue passe le milieu, pas quand elle s'arrete :
  // attendre la fin du geste donnait une legende en retard sur l'icone.
  useAnimatedReaction(
    () => Math.round(x.value / item),
    (cur, prev) => {
      if (cur !== prev && cur >= 0 && cur < WHEEL.length) runOnJS(select)(cur);
    },
    [item]
  );

  const app = WHEEL[i];

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
          contentOffset={{ x: START * item, y: 0 }}
        >
          {WHEEL.map((a, k) => (
            <Tile
              key={a.id}
              app={a}
              index={k}
              x={x}
              item={item}
              tile={tile}
              locked={!pro && a.id !== FREE}
              onLocked={() => setGate(true)}
            />
          ))}
        </Animated.ScrollView>

      </View>

      <Animated.View key={app.id} entering={FadeIn.duration(220)} style={st.legend}>
        <Text variant="displayM">{app.name}</Text>
        <Text variant="label" tone="secondary">{dict.ui[app.sub]}</Text>
        <Open
          id={app.id}
          minutes={minutes[app.id] ?? 0}
          locked={!pro && app.id !== FREE}
          onLocked={() => setGate(true)}
        />
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
          <Pressable
            style={st.panelHead}
            onPress={() => { haptics.tap(); setOpen((v) => !v); }}
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
          >
            <Text variant="label" tone="tertiary" style={{ flex: 1 }}>
              {fillIn(dict.ui.appSettings, { name: app.name })}
            </Text>
            <Animated.View style={chevron}>
              <ChevronDown size={16} strokeWidth={2.2} color={withAlpha(c.mist, 0.5)} />
            </Animated.View>
          </Pressable>
          {open && <Toggles app={app.id} locked={!pro} onLocked={() => setGate(true)} />}
        </Glass>
      </Animated.View>

      <ProGate visible={gate} onClose={() => setGate(false)} />
    </View>
  );
}

/** Une icone de la roue. Elle recule, s'efface et se tourne de biais. */
function Tile({
  app, index, x, item, tile, locked, onLocked,
}: {
  app: (typeof APPS)[number];
  index: number;
  x: SharedValue<number>;
  item: number;
  tile: number;
  locked: boolean;
  onLocked: () => void;
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
        accessibilityLabel={dict.ui.openApp.replace('{name}', app.name)}
        onPress={() => {
          haptics.press();
          if (locked) { onLocked(); return; }
          router.push(`/client/${app.id}`);
        }}
      >
        <Image
          source={LOGOS[app.id]}
          style={{ width: tile, height: tile, opacity: locked ? 0.38 : 1 }}
          contentFit="contain"
        />
        {locked && (
          <View style={st.lockBadge}>
            <Lock size={20} strokeWidth={2.2} color={c.mist} />
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

function Open({
  id, minutes, locked, onLocked,
}: { id: ClientId; minutes: number; locked: boolean; onLocked: () => void }) {
  const router = useRouter();
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const ref = useAnchor('home-open');

  return (
    <Pressable
      ref={ref}
      collapsable={false}
      style={st.open}
      accessibilityRole="button"
      onPress={() => {
        haptics.press();
        if (locked) { onLocked(); return; }
        router.push(`/client/${id}`);
      }}
    >
      <Text variant="label" color={c.accent}>
        {locked
          ? dict.blockTab.unlock
          : minutes > 0
            ? dict.misc.openMin.replace('{n}', String(minutes))
            : dict.misc.open}
      </Text>
      <ChevronRight size={15} strokeWidth={2.2} color={c.accent} />
    </Pressable>
  );
}

function Toggles({
  app, locked, onLocked,
}: { app: ClientId; locked: boolean; onLocked: () => void }) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const isOn = useAppsStore((s) => s.isOn);
  const toggle = useAppsStore((s) => s.toggle);
  useAppsStore((s) => s.settings); // re-rend a chaque changement

  return (
    <View>
      {APP_TOGGLES[app].map((t) => (
        <View key={t.key} style={st.line}>
          <Text
            variant="body"
            tone={t.locked ? 'secondary' : 'primary'}
            style={{ flex: 1 }}
          >
            {dict.toggles[t.label]}
          </Text>
          {t.locked
            ? <LockedPill />
            : locked
              ? <LockedPill label="Pro" onPress={onLocked} />
              : <Toggle on={isOn(app, t.key)} onChange={(v) => toggle(app, t.key, v)} />}
        </View>
      ))}
    </View>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: space.md, marginTop: space.md },
  gridCell: {
    width: '48%', aspectRatio: 1, borderRadius: 24, alignItems: 'center', justifyContent: 'center', gap: space.sm,
    borderWidth: 1, borderColor: c.glassEdge, backgroundColor: c.glassSolid,
  },
  listRow: {
    flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: 20,
    borderWidth: 1, borderColor: c.glassEdge, backgroundColor: c.glassSolid,
  },
  slot: { alignItems: 'center', justifyContent: 'center', paddingVertical: space.md },
  lockBadge: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  legend: { alignItems: 'center', gap: 4, marginTop: space.md },
  open: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: space.md,
    paddingHorizontal: space.lg, paddingVertical: space.sm, borderRadius: 999,
    backgroundColor: withAlpha(c.accent, 0.12),
    borderWidth: StyleSheet.hairlineWidth, borderColor: withAlpha(c.accent, 0.35),
  },
  panel: { marginTop: space.lg, paddingHorizontal: space.lg, paddingBottom: space.sm },
  panelHead: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: space.lg, paddingBottom: space.lg,
  },
  line: {
    flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 13,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: withAlpha(c.mist, 0.1),
  },
});

/**
 * La grille et la liste : toutes les apps d'un coup d'oeil, sans geste.
 * Une app verrouillee ouvre l'offre, les autres s'ouvrent directement.
 */
function AppBoard({ mode, minutes }: { mode: 'grid' | 'list'; minutes: Record<string, number> }) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const router = useRouter();
  const pro = useProStore((p) => p.pro);
  const [gate, setGate] = useState(false);
  const open = (id: ClientId) => {
    haptics.tap();
    if (!pro && id !== FREE) { setGate(true); return; }
    router.push(`/client/${id}`);
  };
  void minutes;
  return (
    <View>
      {mode === 'grid' ? (
        <View style={st.grid}>
          {APPS.map((a) => {
            const locked = !pro && a.id !== FREE;
            return (
              <Pressable key={a.id} onPress={() => open(a.id)} style={st.gridCell} accessibilityRole="button" accessibilityLabel={a.name}>
                <Image source={LOGOS[a.id]} style={{ width: 72, height: 72, opacity: locked ? 0.4 : 1 }} contentFit="contain" />
                <Text variant="title">{a.name}</Text>
                {locked && <Lock size={13} strokeWidth={2.4} color={withAlpha(c.mist, 0.5)} />}
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={{ gap: space.sm }}>
          {APPS.map((a) => {
            const locked = !pro && a.id !== FREE;
            return (
              <Pressable key={a.id} onPress={() => open(a.id)} style={st.listRow} accessibilityRole="button" accessibilityLabel={a.name}>
                <Image source={LOGOS[a.id]} style={{ width: 44, height: 44, opacity: locked ? 0.4 : 1 }} contentFit="contain" />
                <View style={{ flex: 1 }}>
                  <Text variant="title">{a.name}</Text>
                  <Text variant="label" tone="secondary">{dict.ui[a.sub]}</Text>
                </View>
                {locked
                  ? <Lock size={15} strokeWidth={2.2} color={withAlpha(c.mist, 0.5)} />
                  : <ChevronRight size={18} color={withAlpha(c.mist, 0.4)} />}
              </Pressable>
            );
          })}
        </View>
      )}
      <ProGate visible={gate} onClose={() => setGate(false)} />
    </View>
  );
}
