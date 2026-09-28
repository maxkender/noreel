import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming, Easing,
} from 'react-native-reanimated';
import {
  Bookmark, ChevronLeft, Clapperboard, Heart, House, MessageCircle,
  MoreHorizontal, Plus, Search, Send, User,
} from 'lucide-react-native';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { Text } from '@/components/type/Text';

/*
 * Un fil imite, il ne capture pas.
 *
 * On ne peut pas filmer le vrai Instagram pour une demonstration : ce sont les
 * publications de gens reels, leurs visages, et la marque d'un tiers. Ce fil-ci
 * en reprend la GRAMMAIRE — la barre du haut, la bande de stories cerclees, le
 * bandeau d'auteur, le media, la rangee d'actions, la barre d'onglets — assez
 * pour qu'on reconnaisse l'app au premier coup d'oeil, et pas assez pour la
 * copier.
 *
 * Les photos sont des degrades. Une photo generique tiree d'une banque d'images
 * se remarque plus qu'un aplat : on cherche a reconnaitre le lieu au lieu de
 * regarder ce qui disparait.
 */

type Post = {
  /** Sa place dans la liste : elle choisit le visage, et ne change jamais. */
  idx: number;
  who: string;
  where?: string;
  /** Un reel : c'est lui qui tombe quand le filtre passe. */
  reel: boolean;
  /** Les deux teintes de la photo. */
  art: [string, string];
  likes: string;
};

const POSTS: Post[] = [
  {
    idx: 0,
    who: 'lea.mrn', where: 'Biarritz', reel: false,
    art: ['#F0A868', '#D9544D'], likes: '1 284',
  },
  {
    idx: 1,
    who: 'son original', reel: true,
    art: ['#7A5CE0', '#C2415C'], likes: '42,1 k',
  },
  {
    idx: 2,
    who: 'thomas_b', where: 'Lyon', reel: false,
    art: ['#4F8DF5', '#2E4E8F'], likes: '312',
  },
  {
    idx: 3,
    who: 'son original', reel: true,
    art: ['#E0568B', '#8A2E63'], likes: '18,7 k',
  },
  {
    idx: 4,
    who: 'camille.d', where: 'Paris 11e', reel: false,
    art: ['#3FBF8F', '#1E6E63'], likes: '867',
  },
  {
    idx: 5,
    who: 'son original', reel: true,
    art: ['#F2B441', '#C2611E'], likes: '93,4 k',
  },
  {
    idx: 6,
    who: 'basket_hec', where: 'Jouy-en-Josas', reel: false,
    art: ['#6E7BF2', '#3A3F8F'], likes: '2 041',
  },
];

/*
 * Les visages, fournis par le studio.
 *
 * Ce sont eux qui font la difference entre « une maquette » et « mon
 * Instagram ». Des aplats de couleur a la place des avatars se lisent comme un
 * squelette de page ; des visages ronds dans des anneaux colores se lisent
 * comme un fil. Les photos des publications restent des degrades : c'est la
 * FORME verticale du reel qui doit se remarquer, pas son contenu.
 */
const FACES = [
  require('@/assets/faces/face-1.webp'),
  require('@/assets/faces/face-2.webp'),
  require('@/assets/faces/face-3.webp'),
  require('@/assets/faces/face-4.webp'),
  require('@/assets/faces/face-5.webp'),
  require('@/assets/faces/face-6.webp'),
  require('@/assets/faces/face-7.webp'),
  require('@/assets/faces/face-8.webp'),
];

/** Les anneaux de la bande de stories, dans l'ordre. */
const RINGS = ['#F2B441', '#E0568B', '#9B5DE5', '#5B9DFF', '#3FBF8F'];
const NAMES = ['ariesspears', 'matteorbrt', 'corriere', 'valentin.t', 'jules'];

export const REELS = POSTS.filter((p) => p.reel).length;

const FALL = 420;   // duree de l'effondrement d'un reel
const STEP = 130;   // decalage entre deux reels : ils tombent en cascade

/**
 * Le fil, avant et apres le filtre.
 *
 * `filtered` fait tomber les reels un a un, du haut vers le bas — et retire
 * l'onglet Reels de la barre du bas. Les deux comptent : on bloque un format,
 * pas seulement des publications, et c'est l'onglet qui manque qui le dit.
 */
export function MockFeed({
  filtered, u = 1, drift = false,
}: {
  filtered: boolean;
  u?: number;
  /**
   * Fait descendre le fil tout seul. Un fil arrete est une capture d'ecran :
   * on croit voir une image, pas une app.
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
      withTiming(1, { duration: 11000, easing: Easing.linear }), -1, false
    );
  }, [drift, slide]);

  const move = useAnimatedStyle(() => ({
    transform: [{ translateY: -slide.value * 210 * u }],
  }));

  return (
    <View style={st.root}>
      <TopBar u={u} />

      <Animated.View style={drift ? move : undefined}>
        <Tray u={u} />
        {POSTS.map((p, i) => (
          <Row key={i} post={p} filtered={filtered} rank={p.reel ? rank++ : 0} u={u} />
        ))}
      </Animated.View>

      <TabBar u={u} filtered={filtered} />
    </View>
  );
}

/** La barre du haut : un titre de fil, et deux actions a droite. */
function TopBar({ u }: { u: number }) {
  const c = useColors();
  const st = useMemo(() => sheet(c, u), [c, u]);
  return (
    <View style={st.top}>
      <ChevronLeft size={13 * u} strokeWidth={2.4} color={c.mist} />
      <Text variant="button" style={{ fontSize: 11 * u, flex: 1 }}>Suivi(e)</Text>
      <Plus size={12 * u} strokeWidth={2.4} color={c.mist} />
      <Heart size={12 * u} strokeWidth={2.2} color={c.mist} />
    </View>
  );
}

/** La bande de stories : des anneaux colores, et un prenom dessous. */
function Tray({ u }: { u: number }) {
  const c = useColors();
  const st = useMemo(() => sheet(c, u), [c, u]);
  return (
    <View style={st.tray}>
      {RINGS.map((ring, i) => (
        <View key={ring} style={st.storyCol}>
          <View style={[st.ring, { borderColor: ring }]}>
            <Image source={FACES[i]} style={st.ringIn} contentFit="cover" />
          </View>
          <Text
            variant="label"
            tone="tertiary"
            numberOfLines={1}
            style={{ fontSize: 4.6 * u, maxWidth: 30 * u }}
          >
            {NAMES[i]}
          </Text>
        </View>
      ))}
    </View>
  );
}

/**
 * La barre d'onglets.
 *
 * L'onglet Reels DISPARAIT quand le filtre passe, et les autres se
 * repartissent. C'est le detail qui fait comprendre l'app sans un mot : on ne
 * masque pas des publications, on retire une porte.
 */
function TabBar({ u, filtered }: { u: number; filtered: boolean }) {
  const c = useColors();
  const st = useMemo(() => sheet(c, u), [c, u]);
  const fade = useSharedValue(1);

  useEffect(() => {
    fade.value = withDelay(
      filtered ? 3 * STEP + 200 : 0,
      withTiming(filtered ? 0 : 1, { duration: 320 })
    );
  }, [filtered, fade]);

  const gone = useAnimatedStyle(() => ({
    opacity: fade.value,
    width: 14 * u * fade.value,
    transform: [{ scale: 0.6 + fade.value * 0.4 }],
  }));

  return (
    <View style={st.tabs}>
      <House size={13 * u} strokeWidth={2.2} color={c.mist} />
      <Search size={13 * u} strokeWidth={2.2} color={withAlpha(c.mist, 0.6)} />
      <Animated.View style={[st.tabGone, gone]}>
        <Clapperboard size={13 * u} strokeWidth={2.2} color={withAlpha(c.mist, 0.6)} />
      </Animated.View>
      <Send size={13 * u} strokeWidth={2.2} color={withAlpha(c.mist, 0.6)} />
      <User size={13 * u} strokeWidth={2.2} color={withAlpha(c.mist, 0.6)} />
    </View>
  );
}

function Row({
  post, filtered, rank, u,
}: { post: Post; filtered: boolean; rank: number; u: number }) {
  const c = useColors();
  const st = useMemo(() => sheet(c, u), [c, u]);
  const open = useSharedValue(1);
  // La hauteur totale d'une carte : en-tete, media, actions, legende.
  const media = post.reel ? 104 : 74;
  const tall = (media + 46) * u;

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
        <Image
          source={FACES[(post.idx + 3) % FACES.length]}
          style={st.avatar}
          contentFit="cover"
        />
        <View style={{ flex: 1 }}>
          <Text variant="label" style={{ fontSize: 5.4 * u, letterSpacing: 0 }}>
            {post.who}
          </Text>
          {post.where && (
            <Text variant="label" tone="tertiary" style={{ fontSize: 4.4 * u, letterSpacing: 0 }}>
              {post.where}
            </Text>
          )}
        </View>
        <MoreHorizontal size={9 * u} strokeWidth={2.4} color={withAlpha(c.mist, 0.6)} />
      </View>

      <LinearGradient
        colors={post.art}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[st.media, { height: media * u }]}
      />

      <View style={st.actions}>
        <Heart size={10 * u} strokeWidth={2.2} color={c.mist} />
        <MessageCircle size={10 * u} strokeWidth={2.2} color={c.mist} />
        <Send size={10 * u} strokeWidth={2.2} color={c.mist} />
        <View style={{ flex: 1 }} />
        <Bookmark size={10 * u} strokeWidth={2.2} color={c.mist} />
      </View>

      <Text variant="label" tone="secondary" style={{ fontSize: 4.6 * u, letterSpacing: 0 }}>
        {post.likes} J’aime
      </Text>
    </>
  );

  if (!post.reel) return <View style={st.post}>{body}</View>;
  return <Animated.View style={[st.post, anim]}>{body}</Animated.View>;
}

const sheet = (c: Palette, u: number) => StyleSheet.create({
  root: { flex: 1, paddingTop: 26 * u },
  top: {
    flexDirection: 'row', alignItems: 'center', gap: 7 * u,
    paddingHorizontal: 8 * u, paddingBottom: 6 * u,
  },
  tray: { flexDirection: 'row', gap: 6 * u, paddingHorizontal: 8 * u, paddingBottom: 8 * u },
  storyCol: { alignItems: 'center', gap: 2 * u },
  ring: {
    width: 26 * u, height: 26 * u, borderRadius: 13 * u,
    borderWidth: 1.6, alignItems: 'center', justifyContent: 'center',
  },
  ringIn: { width: 21 * u, height: 21 * u, borderRadius: 11 * u, overflow: 'hidden' },
  post: { paddingHorizontal: 8 * u, paddingBottom: 6 * u, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 5 * u, paddingVertical: 5 * u },
  avatar: { width: 17 * u, height: 17 * u, borderRadius: 9 * u, overflow: 'hidden' },
  media: { borderRadius: 5 * u },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 * u, paddingVertical: 5 * u },
  tabs: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    paddingVertical: 7 * u, paddingHorizontal: 10 * u,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: withAlpha(c.mist, 0.12),
  },
  // La largeur est animee avec l'opacite : sans ca, l'onglet disparait mais
  // laisse son trou, et les autres ne se rapprochent jamais.
  tabGone: { alignItems: 'center', overflow: 'hidden' },
});
