import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming, Easing,
} from 'react-native-reanimated';
import {
  BadgeCheck, Bookmark, ChevronLeft, Clapperboard, Heart, House, MessageCircle,
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
 * en reprend la GRAMMAIRE, assez pour qu'on reconnaisse l'app au premier coup
 * d'oeil, et pas assez pour la copier.
 *
 * Les proportions sont relevees sur une capture reelle, et c'est ce qui manquait
 * a la premiere version : un titre de fil ECRIT GRAND, des anneaux de stories en
 * degrade et non en aplat, et surtout une photo A FOND PERDU. Une image posee
 * dans une carte arrondie avec des marges se lit comme un squelette de page ; la
 * meme image bord a bord se lit comme Instagram. C'est toute la difference entre
 * une maquette et l'app.
 */

type Post = {
  /** Sa place dans la liste : elle choisit le visage, et ne change jamais. */
  idx: number;
  who: string;
  where?: string;
  verified?: boolean;
  /** Un reel : c'est lui qui tombe quand le filtre passe. */
  reel: boolean;
  /** Les deux teintes de la photo. */
  art: [string, string];
  likes: string;
};

const POSTS: Post[] = [
  { idx: 0, who: 'lea.mrn', where: 'Biarritz', reel: false, art: ['#F0A868', '#D9544D'], likes: '1 284' },
  { idx: 1, who: 'son original', reel: true, art: ['#7A5CE0', '#C2415C'], likes: '42,1 k' },
  { idx: 2, who: 'thomas_b', where: 'Lyon', verified: true, reel: false, art: ['#4F8DF5', '#2E4E8F'], likes: '312' },
  { idx: 3, who: 'son original', reel: true, art: ['#E0568B', '#8A2E63'], likes: '18,7 k' },
  { idx: 4, who: 'camille.d', where: 'Paris 11e', reel: false, art: ['#3FBF8F', '#1E6E63'], likes: '867' },
  { idx: 5, who: 'son original', reel: true, art: ['#F2B441', '#C2611E'], likes: '93,4 k' },
  { idx: 6, who: 'basket_hec', where: 'Jouy-en-Josas', reel: false, art: ['#6E7BF2', '#3A3F8F'], likes: '2 041' },
];

/*
 * Les visages, fournis par le studio. Ce sont eux qui font la difference entre
 * « une maquette » et « mon Instagram » : des aplats de couleur a la place des
 * avatars se lisent comme un squelette de page.
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

/**
 * L'anneau des stories : jaune, rose, violet.
 *
 * C'est la signature visuelle d'Instagram, et un aplat de couleur a sa place ne
 * trompe personne — c'etait le premier defaut de la version precedente.
 */
const RING: [string, string, string] = ['#F9CE34', '#EE2A7B', '#6228D7'];

const NAMES = ['ariesspears', 'matteorbrt', 'corriere', 'valentin.t', 'jules'];

export const REELS = POSTS.filter((p) => p.reel).length;

/**
 * La largeur du fil dans le repere de ce fichier, en points a u = 1.
 *
 * C'est la largeur utile de la maquette de telephone (196 points de cadre,
 * moins ses bords). Toutes les hauteurs de media s'y rapportent, pour que les
 * proportions tiennent quelle que soit l'echelle.
 */
const WIDTH = 188;

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
  filtered, u = 1, drift = false, tab,
}: {
  filtered: boolean;
  u?: number;
  /**
   * L'onglet Reels est-il encore la ?
   *
   * Par defaut il suit `filtered`, avec le retard de la cascade : il s'en va
   * une fois les publications tombees. L'onboarding, lui, veut separer les
   * deux temps — on regarde d'abord tomber les Reels, PUIS on va voir la
   * barre du bas de pres. Passer ce booleen prend la main sur le retard.
   */
  tab?: boolean;
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
      withTiming(1, { duration: 13000, easing: Easing.linear }), -1, false
    );
  }, [drift, slide]);

  const move = useAnimatedStyle(() => ({
    // Assez pour traverser deux publications : les cartes font maintenant
    // pres de deux cents points, un deplacement de 260 ne montrait qu'une
    // photo et demie sur les treize secondes du cycle.
    transform: [{ translateY: -slide.value * 430 * u }],
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

      <TabBar
        u={u}
        gone={tab === undefined ? filtered : !tab}
        wait={tab === undefined && filtered ? 3 * STEP + 200 : 0}
      />
    </View>
  );
}

/** La barre du haut : un titre ECRIT GRAND, et deux actions a droite. */
function TopBar({ u }: { u: number }) {
  const c = useColors();
  const st = useMemo(() => sheet(c, u), [c, u]);
  return (
    <View style={st.top}>
      <ChevronLeft size={15 * u} strokeWidth={2.6} color={c.mist} />
      <Text style={[st.feedTitle, { fontSize: 15 * u }]}>Suivi(e)</Text>
      <View style={{ flex: 1 }} />
      <Plus size={14 * u} strokeWidth={2.6} color={c.mist} />
      <View>
        <Heart size={14 * u} strokeWidth={2.2} color={c.mist} />
        <View style={st.dot} />
      </View>
    </View>
  );
}

/** La bande de stories : anneau en degrade, photo dedans, prenom dessous. */
function Tray({ u }: { u: number }) {
  const c = useColors();
  const st = useMemo(() => sheet(c, u), [c, u]);
  return (
    <View style={st.tray}>
      {NAMES.map((name, i) => (
        <View key={name} style={st.storyCol}>
          <LinearGradient
            colors={RING}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={st.ring}
          >
            {/* Le lisere sombre entre l'anneau et la photo : sans lui, le
                degrade touche le visage et l'anneau disparait. */}
            <View style={st.ringGap}>
              <Image source={FACES[i]} style={st.ringPhoto} contentFit="cover" />
            </View>
          </LinearGradient>
          <Text
            tone="secondary"
            numberOfLines={1}
            style={{ fontSize: 5.4 * u, maxWidth: 32 * u }}
          >
            {name}
          </Text>
        </View>
      ))}
    </View>
  );
}

/**
 * La barre d'onglets.
 *
 * L'onglet Reels DISPARAIT quand le filtre passe, largeur comprise pour que les
 * autres se rapprochent. C'est le detail qui fait comprendre l'app sans un mot :
 * on ne masque pas des publications, on retire une porte.
 *
 * Le retard lui est DONNE au lieu d'etre calcule ici : selon l'ecran, l'onglet
 * part dans la foulee des publications ou bien plus tard, quand on a eu le
 * temps de venir le regarder de pres.
 */
function TabBar({
  u, gone, wait, ms = 320,
}: { u: number; gone: boolean; wait: number; ms?: number }) {
  const c = useColors();
  const st = useMemo(() => sheet(c, u), [c, u]);
  const fade = useSharedValue(1);

  useEffect(() => {
    fade.value = withDelay(wait, withTiming(gone ? 0 : 1, {
      duration: ms, easing: Easing.inOut(Easing.cubic),
    }));
  }, [gone, wait, ms, fade]);

  // La LARGEUR fait partie de l'animation : sans elle l'onglet s'effacerait en
  // laissant son trou, et un trou se lit comme un bouton casse, pas comme un
  // bouton retire. Les quatre autres se rapprochent, et la barre se referme.
  const shrink = useAnimatedStyle(() => ({
    opacity: fade.value,
    width: 16 * u * fade.value,
    transform: [{ scale: 0.6 + fade.value * 0.4 }],
  }));

  return (
    <View style={st.tabs}>
      <House size={14 * u} strokeWidth={2.4} color={c.mist} fill={c.mist} />
      <Search size={14 * u} strokeWidth={2.2} color={c.mist} />
      <Animated.View style={[st.tabGone, shrink]}>
        <Clapperboard size={14 * u} strokeWidth={2.2} color={c.mist} />
      </Animated.View>
      <View>
        <Send size={14 * u} strokeWidth={2.2} color={c.mist} />
        <View style={st.badge} />
      </View>
      <User size={14 * u} strokeWidth={2.2} color={c.mist} />
    </View>
  );
}

/**
 * La barre d'onglets seule, a l'echelle qu'on veut.
 *
 * Dans un telephone de 196 points, un bouton fait quatorze points de haut :
 * on voit bien qu'il se passe quelque chose en bas, on ne voit pas QUOI. Le
 * parcours la ressort donc du cadre et la montre en grand — ce sont les
 * memes boutons, le meme composant, juste regardes de pres.
 */
export function MockTabBar({
  u = 1, gone = false, ms,
}: { u?: number; gone?: boolean; ms?: number }) {
  return <TabBar u={u} gone={gone} wait={0} ms={ms} />;
}

function Row({
  post, filtered, rank, u,
}: { post: Post; filtered: boolean; rank: number; u: number }) {
  const c = useColors();
  const st = useMemo(() => sheet(c, u), [c, u]);
  const open = useSharedValue(1);
  /*
    La hauteur du media est donnee PAR RAPPORT A LA LARGEUR du fil.

    Le repere de ce fichier est cale sur un cadre de 188 points de large — la
    largeur utile de la maquette de telephone. Une hauteur choisie sans tenir
    compte de cette largeur donnait une photo deux fois plus large que haute,
    ce qui ne ressemble a aucun format d'Instagram.

    Une photo en paysage, un reel nettement plus haut que large : le format
    4:5 serait plus juste pour la photo, mais il ne laisse voir qu'une
    publication a la fois — et on ne verrait plus les reels tomber, qui est
    tout l'objet de la demonstration.
  */
  const media = post.reel ? WIDTH * 0.95 : WIDTH * 0.62;
  const tall = (media + 52) * u;

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
    transform: [{ scale: 0.94 + open.value * 0.06 }],
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
          <View style={st.nameRow}>
            <Text style={[st.who, { fontSize: 6.4 * u }]}>{post.who}</Text>
            {post.verified && (
              <BadgeCheck size={6.8 * u} strokeWidth={0} fill="#3B9BF7" color="#3B9BF7" />
            )}
          </View>
          {post.where && (
            <Text tone="secondary" style={{ fontSize: 5.4 * u }}>{post.where}</Text>
          )}
        </View>
        <MoreHorizontal size={10 * u} strokeWidth={2.4} color={c.mist} />
      </View>

      {/* A FOND PERDU : c'est ce qui fait qu'on lit Instagram et non une carte. */}
      <LinearGradient
        colors={post.art}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ height: media * u }}
      />

      <View style={st.actions}>
        <Heart size={11 * u} strokeWidth={2} color={c.mist} />
        <MessageCircle size={11 * u} strokeWidth={2} color={c.mist} />
        <Send size={11 * u} strokeWidth={2} color={c.mist} />
        <View style={{ flex: 1 }} />
        <Bookmark size={11 * u} strokeWidth={2} color={c.mist} />
      </View>

      <Text style={[st.likes, { fontSize: 5.6 * u }]}>{post.likes} J’aime</Text>
    </>
  );

  if (!post.reel) return <View style={st.post}>{body}</View>;
  return <Animated.View style={[st.post, anim]}>{body}</Animated.View>;
}

const sheet = (c: Palette, u: number) => StyleSheet.create({
  root: { flex: 1, paddingTop: 22 * u },
  top: {
    flexDirection: 'row', alignItems: 'center', gap: 5 * u,
    paddingHorizontal: 8 * u, paddingBottom: 8 * u,
  },
  // Le titre du fil est GROS et gras : c'est lui qui donne l'echelle de l'app.
  feedTitle: { color: c.mist, fontFamily: 'SansBold', letterSpacing: -0.3 },
  dot: {
    position: 'absolute', top: -1, right: -1,
    width: 4 * u, height: 4 * u, borderRadius: 2 * u, backgroundColor: '#FF3B30',
  },
  tray: { flexDirection: 'row', gap: 5 * u, paddingHorizontal: 7 * u, paddingBottom: 9 * u },
  storyCol: { alignItems: 'center', gap: 3 * u },
  ring: {
    width: 34 * u, height: 34 * u, borderRadius: 17 * u,
    alignItems: 'center', justifyContent: 'center',
  },
  ringGap: {
    width: 30 * u, height: 30 * u, borderRadius: 15 * u, overflow: 'hidden',
    borderWidth: 1.5, borderColor: c.night,
  },
  ringPhoto: { width: '100%', height: '100%' },
  // Aucune marge laterale : la photo touche les bords.
  post: { overflow: 'hidden' },
  head: {
    flexDirection: 'row', alignItems: 'center', gap: 5 * u,
    paddingHorizontal: 8 * u, paddingVertical: 5 * u,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 2.5 * u },
  who: { color: c.mist, fontFamily: 'SansSemi' },
  avatar: { width: 20 * u, height: 20 * u, borderRadius: 10 * u, overflow: 'hidden' },
  actions: {
    flexDirection: 'row', alignItems: 'center', gap: 9 * u,
    paddingHorizontal: 8 * u, paddingVertical: 5 * u,
  },
  likes: { color: c.mist, fontFamily: 'SansSemi', paddingHorizontal: 8 * u },
  tabs: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    paddingVertical: 8 * u, paddingHorizontal: 8 * u,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: withAlpha(c.mist, 0.14),
  },
  badge: {
    position: 'absolute', top: -2 * u, right: -3 * u,
    width: 5 * u, height: 5 * u, borderRadius: 2.5 * u, backgroundColor: '#FF3B30',
  },
  tabGone: { alignItems: 'center', overflow: 'hidden' },
});
