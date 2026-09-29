import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Info, LogIn, Timer } from 'lucide-react-native';
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

/** Le temps d'une story : le temps de lire deux phrases, pas de s'ennuyer. */
const SLIDE_MS = 5000;
const SLIDES = 6;

/*
 * La premiere fois qu'on ouvre Instagram ici : une story, pas un mode d'emploi.
 *
 * C'est le format que la personne connait le mieux — des barres en haut,
 * un tap pour avancer, un tap a gauche pour revenir — et c'est Corti qui
 * parle. Six temps : ce qui reste, l'onglet qui part (on le voit partir),
 * le chrono et le « i » en haut, le mur du fil pour qui le veut, les Reels
 * qu'un ami envoie, et la page de connexion, qui n'est pas la notre. Elle
 * se montre une fois, avant que la page ne charge, et on peut la passer.
 */
export function ClientTutorial({ id, onDone }: { id: ClientId; onDone: () => void }) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const { d } = useT();
  const [i, setI] = useState(0);
  const [fill] = useState(() => new Animated.Value(0));
  const last = i >= SLIDES - 1;

  const go = (n: number) => {
    setI(Math.max(0, Math.min(SLIDES - 1, n)));
    haptics.tick();
  };

  // La barre de la story en cours se remplit sur le fil natif ; a la fin,
  // on passe a la suivante — sauf la derniere, qui attend le bouton.
  useEffect(() => {
    fill.setValue(0);
    const anim = Animated.timing(fill, {
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
    <SafeAreaView style={st.root} edges={['top', 'bottom']} testID={`tuto-${id}`}>
      <View style={st.bars}>
        {slides.map((_, k) => (
          <View key={k} style={st.track}>
            {k < i && <View style={[st.fill, { transform: [{ scaleX: 1 }] }]} />}
            {k === i && <Animated.View style={[st.fill, { transform: [{ scaleX: fill }] }]} />}
          </View>
        ))}
      </View>

      <View style={st.head}>
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => { haptics.tap(); onDone(); }} hitSlop={12} accessibilityRole="button">
          <Text variant="label" tone="tertiary">{d.tuto.skip}</Text>
        </Pressable>
      </View>

      <View style={st.stage}>
        {/* La cle change avec la story : chaque image repart de son debut. */}
        <View key={i} style={st.art}><Art i={i} /></View>
        <Text variant="displayM" style={st.center}>{title}</Text>
        <Text variant="lead" tone="secondary" style={[st.center, { marginTop: space.md }]}>{body}</Text>
      </View>

      {/* Les deux zones de tap, comme dans une story : un tiers a gauche pour
          revenir, le reste pour avancer. Elles s'arretent au-dessus du
          bouton, qui doit rester le sien. */}
      <Pressable style={st.zoneL} onPress={() => go(i - 1)} testID="tuto-prev" accessibilityLabel={d.client.back} />
      <Pressable style={st.zoneR} onPress={() => (last ? onDone() : go(i + 1))} testID="tuto-next" accessibilityLabel={d.client.forward} />

      <View style={st.foot}>
        {last
          ? <Button label={d.tuto.go} onPress={onDone} />
          : <Text variant="label" tone="tertiary" style={st.center}>{d.tuto.hint}</Text>}
      </View>
    </SafeAreaView>
  );
}

/** L'image de chaque temps : Corti, ou une piece de l'ecran qu'on va voir. */
function Art({ i }: { i: number }) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const { d } = useT();
  switch (i) {
    case 0:
      return <CortiRig level={3} size={200} expression="ravi" arrive />;
    case 1:
      // La barre du bas, grossie, et l'onglet Reels qui s'en va sous les yeux.
      return (
        <View style={st.card}>
          <MockTabBar u={2.4} gone ms={900} />
        </View>
      );
    case 2:
      return (
        <View style={[st.card, st.topBar]}>
          <Timer size={16} strokeWidth={2.2} color={withAlpha(c.mist, 0.6)} />
          <Text variant="label" color={withAlpha(c.mist, 0.7)}>0:42</Text>
          <View style={{ flex: 1 }} />
          <View style={st.info}><Info size={16} strokeWidth={2.2} color={withAlpha(c.mist, 0.6)} /></View>
        </View>
      );
    case 3:
      return (
        <View style={[st.card, st.wall]}>
          <Text variant="title" style={st.center}>{d.client.wallTitle}</Text>
          <Text variant="body" tone="secondary" style={st.center}>{d.client.wallBody}</Text>
          <Text variant="body" color={c.accent} style={st.center}>{d.client.wallHint}</Text>
        </View>
      );
    case 4:
      return <PhoneFrame width={150}><MockDM playing /></PhoneFrame>;
    default:
      return (
        <View style={st.ring}>
          <LogIn size={34} strokeWidth={2.2} color={c.accent} />
        </View>
      );
  }
}

const sheet = (c: Palette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.night },
  bars: { flexDirection: 'row', gap: 4, paddingHorizontal: space.lg, paddingTop: space.sm },
  track: { flex: 1, height: 3, borderRadius: 2, overflow: 'hidden', backgroundColor: withAlpha(c.mist, 0.22) },
  fill: { height: 3, borderRadius: 2, backgroundColor: c.mist, transformOrigin: 'left' },
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingVertical: space.md },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xl },
  art: { height: 260, alignItems: 'center', justifyContent: 'center', marginBottom: space.xl },
  center: { textAlign: 'center' },
  card: {
    alignSelf: 'stretch', borderRadius: radii.tile, overflow: 'hidden',
    backgroundColor: withAlpha(c.mist, 0.06), borderWidth: 1, borderColor: withAlpha(c.mist, 0.12),
  },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, height: 46 },
  info: {
    width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth, borderColor: withAlpha(c.mist, 0.2),
  },
  wall: { padding: space.lg, gap: space.sm, alignItems: 'center' },
  ring: {
    width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: withAlpha(c.accent, 0.5), backgroundColor: withAlpha(c.accent, 0.1),
  },
  zoneL: { position: 'absolute', left: 0, top: 90, bottom: 140, width: '30%' },
  zoneR: { position: 'absolute', right: 0, top: 90, bottom: 140, width: '70%' },
  foot: { paddingHorizontal: space.lg, paddingBottom: space.md, minHeight: 84, justifyContent: 'center' },
});
