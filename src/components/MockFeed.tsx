import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming, Easing,
} from 'react-native-reanimated';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { Text } from '@/components/type/Text';

type Post = { who: string; reel: boolean };

/*
 * Un fil imite, pas capture.
 *
 * On ne peut pas filmer le vrai Instagram pour une video de presentation :
 * ce sont les publications de gens reels, et leur marque. Ce fil-ci n'a que
 * ce qu'il faut pour qu'on reconnaisse la forme — un en-tete, un media, une
 * barre d'actions — et pour que la disparition des reels se VOIE.
 */
const POSTS: Post[] = [
  { who: 'lea.mrn', reel: false },
  { who: 'son original', reel: true },
  { who: 'thomas_b', reel: false },
  { who: 'son original', reel: true },
  { who: 'camille.d', reel: false },
  { who: 'son original', reel: true },
  { who: 'basket_hec', reel: false },
];

export const REELS = POSTS.filter((p) => p.reel).length;

const FALL = 420;   // duree de l'effondrement d'un reel
const STEP = 130;   // decalage entre deux reels : ils tombent en cascade

/**
 * Le fil, avant et apres le filtre.
 *
 * `filtered` fait tomber les reels un a un, du haut vers le bas. En cascade
 * et non tous ensemble : c'est le decalage qui rend la disparition lisible a
 * l'oeil, et filmable.
 *
 * `u` met tout le fil a l'echelle. Le meme dessin sert en vignette dans une
 * maquette de telephone et en plein ecran pour une video : une seule source
 * de verite pour la forme, un facteur pour la taille.
 */
export function MockFeed({
  filtered, u = 1, drift = false,
}: {
  filtered: boolean;
  u?: number;
  /**
   * Fait descendre le fil tout seul.
   *
   * Un fil arrete est une capture d'ecran : on croit voir une image, pas une
   * app. Quelques dizaines de points de deplacement lent suffisent a ce que
   * l'oeil lise « ca defile », et c'est ce qui rend la demonstration
   * credible.
   */
  drift?: boolean;
}) {
  const c = useColors();
  const st = useMemo(() => sheet(c, u), [c, u]);
  const slide = useSharedValue(0);
  let rank = 0;

  useEffect(() => {
    if (!drift) { slide.value = 0; return; }
    slide.value = withRepeat(
      withTiming(1, { duration: 9000, easing: Easing.linear }),
      -1,
      false
    );
  }, [drift, slide]);

  const move = useAnimatedStyle(() => ({
    transform: [{ translateY: -slide.value * 150 * u }],
  }));

  return (
    <Animated.View style={[st.root, drift && move]}>
      <View style={st.bar}>
        <Text variant="label" tone="secondary" style={{ fontSize: 7 * u }}>UnSwipe</Text>
      </View>
      <View style={st.tray}>
        {Array.from({ length: 5 }, (_, i) => <View key={i} style={st.ring} />)}
      </View>
      {POSTS.map((p, i) => (
        <Row key={i} post={p} filtered={filtered} rank={p.reel ? rank++ : 0} u={u} />
      ))}
    </Animated.View>
  );
}

function Row({
  post, filtered, rank, u,
}: { post: Post; filtered: boolean; rank: number; u: number }) {
  const c = useColors();
  const st = useMemo(() => sheet(c, u), [c, u]);
  const open = useSharedValue(1);
  // La hauteur totale d'une carte, mesuree sur la feuille : elle doit suivre
  // l'echelle sans etre redonnee a la main a chaque appel.
  const tall = (post.reel ? 92 : 52) * u + 34 * u;

  useEffect(() => {
    if (!post.reel) return;
    open.value = withDelay(
      filtered ? rank * STEP : 0,
      withTiming(filtered ? 0 : 1, { duration: FALL, easing: Easing.inOut(Easing.cubic) })
    );
  }, [filtered, post.reel, rank, open]);

  const anim = useAnimatedStyle(() => ({
    height: tall * open.value,
    opacity: open.value,
    transform: [{ scale: 0.92 + open.value * 0.08 }],
  }));

  const body = (
    <>
      <View style={st.head}>
        <View style={st.avatar} />
        <View style={{ flex: 1, gap: 3 * u }}>
          <View style={[st.line, { width: 54 * u }]} />
          {post.reel && <View style={[st.line, { width: 34 * u, opacity: 0.6 }]} />}
        </View>
      </View>
      <View style={[st.media, post.reel && st.mediaReel]} />
      <View style={st.actions}>
        {Array.from({ length: 3 }, (_, k) => <View key={k} style={st.dot} />)}
      </View>
    </>
  );

  if (!post.reel) return <View style={st.post}>{body}</View>;
  return <Animated.View style={[st.post, anim]}>{body}</Animated.View>;
}

const sheet = (c: Palette, u: number) => StyleSheet.create({
  root: { flex: 1, paddingTop: 34 * u },
  bar: {
    paddingHorizontal: 10 * u, paddingBottom: 6 * u,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: withAlpha(c.mist, 0.1),
  },
  tray: { flexDirection: 'row', gap: 7 * u, padding: 8 * u },
  ring: {
    width: 26 * u, height: 26 * u, borderRadius: 13 * u,
    borderWidth: 1.5, borderColor: withAlpha(c.accent, 0.5),
    backgroundColor: withAlpha(c.mist, 0.07),
  },
  post: { paddingHorizontal: 8 * u, paddingTop: 6 * u, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 * u },
  avatar: {
    width: 18 * u, height: 18 * u, borderRadius: 9 * u,
    backgroundColor: withAlpha(c.mist, 0.18),
  },
  line: { height: 4 * u, borderRadius: 2 * u, backgroundColor: withAlpha(c.mist, 0.18) },
  media: {
    height: 52 * u, borderRadius: 6 * u, marginTop: 5 * u,
    backgroundColor: withAlpha(c.mist, 0.09),
  },
  // Un reel est VERTICAL : c'est sa forme qui le trahit, pas sa couleur.
  mediaReel: { height: 92 * u, backgroundColor: withAlpha(c.ember, 0.22) },
  actions: { flexDirection: 'row', gap: 6 * u, paddingVertical: 5 * u },
  dot: {
    width: 9 * u, height: 9 * u, borderRadius: 4.5 * u,
    backgroundColor: withAlpha(c.mist, 0.14),
  },
});
