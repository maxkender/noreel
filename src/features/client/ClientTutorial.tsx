import { useContext, useEffect, useMemo, useState } from 'react';
import { Animated as RNAnimated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaInsetsContext, initialWindowMetrics } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
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
  const [fill] = useState(() => new RNAnimated.Value(0));
  const last = i >= SLIDES - 1;

  const go = (n: number) => {
    setI(Math.max(0, Math.min(SLIDES - 1, n)));
    haptics.tick();
  };

  // La barre de la story en cours se remplit sur le fil natif ; a la fin,
  // on passe a la suivante — sauf la derniere, qui attend le bouton.
  useEffect(() => {
    fill.setValue(0);
    const anim = RNAnimated.timing(fill, {
      toValue: 1, duration: SLIDE_MS, easing: Easing.linear, useNativeDriver: true,
    });
    anim.start(({ finished }) => { if (finished && i < SLIDES - 1) setI(i + 1); });
    return () => anim.stop();
  }, [i, fill]);

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
            {k === i && <RNAnimated.View style={[st.fill, { transform: [{ scaleX: fill }] }]} />}
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
      <Pressable style={[st.zoneL, { top: top + 60 }]} onPress={() => go(i - 1)} testID="tuto-prev" accessibilityLabel={d.client.back} />
      <Pressable style={[st.zoneR, { top: top + 60 }]} onPress={() => (last ? onDone() : go(i + 1))} testID="tuto-next" accessibilityLabel={d.client.forward} />

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
          <View style={st.dotRow}>
            <View style={[st.dot, { backgroundColor: c.accent, shadowColor: c.accent }]}>
              <CortiRig level={3} size={34} expression="auto" animated={false} />
            </View>
          </View>
          <View style={st.keys}>
            {keys.map(([Icon, label], k) => {
              const I = Icon as typeof House;
              const last = k === keys.length - 1;
              return (
                <View key={label} style={st.navKey}>
                  <View style={[st.navIcon, last && { backgroundColor: withAlpha(c.accent, 0.18) }]}>
                    <I size={18} strokeWidth={2.2} color={last ? c.accent : c.mist} />
                  </View>
                  <Text variant="label" tone="secondary" style={st.center}>{label}</Text>
                </View>
              );
            })}
          </View>
        </View>
      );
    }
    case 4:
      return <PhoneFrame width={168}><MockDM playing /></PhoneFrame>;
    default:
      return (
        <View style={st.ring}>
          <LogIn size={38} strokeWidth={2.2} color={c.accent} />
        </View>
      );
  }
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
  dotRow: { alignItems: 'center' },
  dot: {
    width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center',
    shadowOpacity: 0.55, shadowRadius: 14, shadowOffset: { width: 0, height: 4 },
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
