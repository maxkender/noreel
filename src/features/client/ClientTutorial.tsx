import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaInsetsContext, initialWindowMetrics } from 'react-native-safe-area-context';
import Animated, {
  Easing, FadeIn, FadeInDown, FadeOut, ZoomIn, cancelAnimation, runOnJS, useAnimatedStyle, useSharedValue,
  withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';
import {
  ChevronLeft, ChevronRight, House, Link, LogIn, RotateCw, Search, Send, Settings, User, UsersRound,
} from 'lucide-react-native';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { radii, space } from '@/theme/spacing';
import { Button } from '@/components/Button';
import { Text } from '@/components/type/Text';
import { CortiRig } from '@/components/CortiRig';
import { MockTabBar } from '@/components/MockFeed';
import { MockDM } from '@/components/MockDM';
import { PhoneFrame } from '@/components/PhoneFrame';
import { haptics } from '@/lib/haptics';
import { useT } from '@/i18n';
import type { ClientId } from './blockers';

/** Le temps d'une story : une phrase, pas plus. */
const SLIDE_MS = 4200;
const SLIDES = 6;

/*
 * La premiere fois qu'on ouvre Instagram ici : une story, pas un mode d'emploi.
 *
 * Le format que la personne connait le mieux — des barres en haut, un tap
 * pour avancer, un tap a gauche pour revenir — et six temps, UNE idee
 * chacun, avec une grande image et une ligne : ce qui reste, l'onglet Reels
 * qui part (on le voit partir), les quatre boutons d'Instagram, le rond
 * d'UnSwipe et ses touches, le reel qu'un ami envoie, la page de connexion
 * qui n'est pas la notre. Une fois, et on peut passer.
 *
 * Les barres se posent SOUS l'encoche, avec la marge lue sur l'appareil —
 * et une marge de secours si personne ne la fournit : posees a trois points
 * du bord, on ne les voyait pas.
 */
export function ClientTutorial({ id, onDone }: { id: ClientId; onDone: () => void }) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const { d } = useT();
  // Le contexte, pas le hook : sans fournisseur au-dessus, le hook leve, et
  // la marge de l'appareil au lancement suffit alors.
  const insets = useContext(SafeAreaInsetsContext);
  const top = Math.max(insets?.top ?? 0, initialWindowMetrics?.insets.top ?? 0, 20);
  const bottom = Math.max(insets?.bottom ?? 0, initialWindowMetrics?.insets.bottom ?? 0, 12);
  const [i, setI] = useState(0);
  const fill = useSharedValue(0);
  const last = i >= SLIDES - 1;
  const hold = useRef<ReturnType<typeof setTimeout> | null>(null);
  const paused = useRef(false);

  const go = (n: number) => {
    setI(Math.max(0, Math.min(SLIDES - 1, n)));
    haptics.tick();
  };
  const advance = () => { setI((n) => (n < SLIDES - 1 ? n + 1 : n)); };

  /*
    La barre de la story en cours se remplit sur le fil d'animation ; a la
    fin, on passe a la suivante — sauf la derniere, qui attend le bouton.
    On repart d'ou elle en etait quand on relache : c'est ce qui permet la
    PAUSE, comme dans une vraie story.
  */
  const run = (from: number) => {
    fill.value = from;
    fill.value = withTiming(1, { duration: SLIDE_MS * (1 - from), easing: Easing.linear }, (finished) => {
      if (finished) runOnJS(advance)();
    });
  };
  useEffect(() => {
    paused.current = false;
    run(0);
    return () => cancelAnimation(fill);
  // La barre repart de zero a chaque planche, et seulement la.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  /*
    Le doigt qui RESTE pose met la story en pause ; un appui bref avance ou
    recule. Les deux gestes partent du meme toucher : au bout de deux
    dixiemes de seconde, ce n'est plus un tap.
  */
  const down = () => {
    hold.current = setTimeout(() => {
      hold.current = null;
      paused.current = true;
      cancelAnimation(fill);
    }, 200);
  };
  const up = (dir: -1 | 1) => {
    if (hold.current) {
      clearTimeout(hold.current);
      hold.current = null;
      if (dir > 0 && last) { onDone(); return; }
      go(i + dir);
      return;
    }
    if (paused.current) { paused.current = false; run(fill.value); }
  };
  const barStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: fill.value }] }));

  const slides = [
    [d.tuto.t1, d.tuto.b1], [d.tuto.t2, d.tuto.b2], [d.tuto.t3, d.tuto.b3],
    [d.tuto.t4, d.tuto.b4], [d.tuto.t5, d.tuto.b5], [d.tuto.t6, d.tuto.b6],
  ] as const;
  const [title, body] = slides[i];

  return (
    <View style={[st.root, { paddingTop: top + 10, paddingBottom: bottom }]} testID={`tuto-${id}`}>
      <View style={st.bars}>
        {slides.map((_, k) => (
          <View key={k} style={st.track}>
            {k < i && <View style={[st.fill, { transform: [{ scaleX: 1 }] }]} />}
            {k === i && <Animated.View style={[st.fill, barStyle]} />}
          </View>
        ))}
      </View>

      <View style={st.head}>
        <Text variant="label" tone="tertiary">{`${i + 1} / ${SLIDES}`}</Text>
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => { haptics.tap(); onDone(); }} hitSlop={12} accessibilityRole="button" style={st.skip}>
          <Text variant="label" tone="secondary">{d.tuto.skip}</Text>
        </Pressable>
      </View>

      {/* Chaque temps se fond dans le suivant : la cle change, l'ancien
          s'efface pendant que le nouveau arrive. */}
      <View style={st.stage}>
        <Animated.View key={i} entering={FadeIn.duration(280)} exiting={FadeOut.duration(160)} style={st.slide}>
          <View style={st.art}><Art i={i} /></View>
          <Text variant="displayM" style={st.center}>{title}</Text>
          {body ? (
            <Text variant="lead" tone="secondary" style={[st.center, { marginTop: space.md }]}>{body}</Text>
          ) : null}
        </Animated.View>
      </View>

      {/* Les deux zones de tap, comme dans une story : un tiers a gauche pour
          revenir, le reste pour avancer. Elles s'arretent au-dessus du
          bouton, qui doit rester le sien. */}
      <Pressable style={[st.zoneL, { top: top + 60 }]} onPressIn={down} onPressOut={() => up(-1)} onPress={() => {}} testID="tuto-prev" accessibilityLabel={d.client.back} />
      <Pressable style={[st.zoneR, { top: top + 60 }]} onPressIn={down} onPressOut={() => up(1)} onPress={() => {}} testID="tuto-next" accessibilityLabel={d.client.forward} />

      <View style={st.foot}>
        {last
          ? <Button label={d.tuto.go} onPress={onDone} />
          : <Text variant="label" tone="tertiary" style={st.center}>{d.tuto.hint}</Text>}
      </View>
    </View>
  );
}

/** L'image de chaque temps : Corti, ou une piece de l'ecran qu'on va voir. */
function Art({ i }: { i: number }) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const { d } = useT();
  switch (i) {
    case 0:
      return <CortiRig level={3} size={210} expression="ravi" />;
    case 1:
      // La barre du bas, grossie, et l'onglet Reels qui s'en va sous les yeux.
      return (
        <View style={st.card}>
          <MockTabBar u={2.6} gone ms={900} />
        </View>
      );
    case 2:
      // Les quatre boutons, nommes. La meme barre, deja sans l'onglet.
      return (
        <View style={st.card}>
          <MockTabBar u={2.6} gone ms={0} />
          <View style={st.labels}>
            {[[House, d.tuto.bar1], [Search, d.tuto.bar2], [Send, d.tuto.bar3], [User, d.tuto.bar4]].map(([Icon, label]) => {
              const I = Icon as typeof House;
              return (
                <View key={String(label)} style={st.labelCol}>
                  <I size={16} strokeWidth={2.2} color={c.accent} />
                  <Text variant="label" tone="secondary" style={st.center}>{String(label)}</Text>
                </View>
              );
            })}
          </View>
        </View>
      );
    case 3: {
      // Le rond d'UnSwipe, puis ses touches, chacune nommee.
      const keys = [
        [ChevronLeft, d.tuto.nav1], [House, d.tuto.nav2], [RotateCw, d.tuto.nav3], [ChevronRight, d.tuto.nav4],
        [UsersRound, d.tuto.nav5], [Link, d.tuto.nav6], [Settings, d.tuto.nav7],
      ] as const;
      return (
        <View style={[st.card, st.nav]}>
          <DotOpening />
          <View style={st.keys}>
            {keys.map(([Icon, label], k) => {
              const I = Icon as typeof House;
              const last = k === keys.length - 1;
              return (
                <Animated.View key={label} entering={FadeInDown.delay(1100 + k * 110).duration(420)} style={st.navKey}>
                  <View style={[st.navIcon, last && { backgroundColor: withAlpha(c.accent, 0.18) }]}>
                    <I size={18} strokeWidth={2.2} color={last ? c.accent : c.mist} />
                  </View>
                  <Text variant="label" tone="secondary" style={st.center}>{label}</Text>
                </Animated.View>
              );
            })}
          </View>
        </View>
      );
    }
    case 4:
      // Assez petit pour tenir dans son cadre : a 168 points il debordait
      // sur le titre.
      return <PhoneFrame width={122}><MockDM playing /></PhoneFrame>;
    default:
      return (
        <View style={st.ring}>
          <LogIn size={38} strokeWidth={2.2} color={c.accent} />
        </View>
      );
  }
}

/**
 * Le rond d'UnSwipe, tel qu'on le verra : il arrive en grandissant, une onde
 * en part deux fois — « c'est lui qu'on touche » — puis les touches sortent
 * de dessous, une par une. Sans ca, on ne le VOYAIT pas.
 */
function DotOpening() {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const wave = useSharedValue(0);
  useEffect(() => {
    wave.value = withRepeat(withSequence(
      withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 0 }),
      withTiming(0, { duration: 500 }),
    ), -1, false);
    return () => cancelAnimation(wave);
  }, [wave]);
  const ring = useAnimatedStyle(() => ({
    opacity: (1 - wave.value) * 0.7,
    transform: [{ scale: 1 + wave.value * 1.1 }],
  }));
  return (
    <View style={st.dotRow}>
      <Animated.View style={[st.wave, { borderColor: c.accent }, ring]} pointerEvents="none" />
      <Animated.View entering={ZoomIn.springify().damping(12).stiffness(180)} style={[st.dot, { backgroundColor: c.accent, shadowColor: c.accent }]}>
        <CortiRig level={3} size={38} expression="auto" animated={false} />
      </Animated.View>
    </View>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.night },
  bars: { flexDirection: 'row', gap: 5, paddingHorizontal: space.lg },
  track: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden', backgroundColor: withAlpha(c.mist, 0.28) },
  fill: { height: 4, borderRadius: 2, width: '100%', backgroundColor: c.mist, transformOrigin: 'left' },
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingVertical: space.md },
  skip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: radii.pill, backgroundColor: withAlpha(c.mist, 0.1) },
  stage: { flex: 1, justifyContent: 'center', paddingHorizontal: space.xl },
  slide: { alignItems: 'center' },
  art: { height: 280, alignItems: 'center', justifyContent: 'center', marginBottom: space.xl, alignSelf: 'stretch' },
  center: { textAlign: 'center' },
  card: {
    alignSelf: 'stretch', borderRadius: radii.tile, overflow: 'hidden',
    backgroundColor: withAlpha(c.mist, 0.06), borderWidth: 1, borderColor: withAlpha(c.mist, 0.12),
  },
  labels: {
    flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 8 * 2.6,
    paddingBottom: space.md, gap: 4,
  },
  labelCol: { alignItems: 'center', gap: 4, width: 64 },
  nav: { paddingVertical: space.md, paddingHorizontal: space.sm, gap: space.md },
  dotRow: { alignItems: 'center', justifyContent: 'center', height: 84 },
  wave: { position: 'absolute', width: 64, height: 64, borderRadius: 32, borderWidth: 2 },
  dot: {
    width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center',
    shadowOpacity: 0.6, shadowRadius: 16, shadowOffset: { width: 0, height: 4 },
  },
  keys: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.sm },
  navKey: { width: 66, alignItems: 'center', gap: 5 },
  navIcon: {
    width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center',
    backgroundColor: withAlpha(c.mist, 0.08),
  },
  ring: {
    width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: withAlpha(c.accent, 0.5), backgroundColor: withAlpha(c.accent, 0.1),
  },
  zoneL: { position: 'absolute', left: 0, bottom: 140, width: '30%' },
  zoneR: { position: 'absolute', right: 0, bottom: 140, width: '70%' },
  foot: { paddingHorizontal: space.lg, paddingBottom: space.md, minHeight: 84, justifyContent: 'center' },
});
