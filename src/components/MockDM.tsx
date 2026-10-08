import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing, FadeIn, useAnimatedStyle, useSharedValue, withDelay, withTiming,
} from 'react-native-reanimated';
import { ChevronLeft, Phone, Play, Video } from 'lucide-react-native';
import { withAlpha } from '@/theme/colors';
import { dict } from '@/i18n';
import { useColors, type Palette } from '@/theme/useColors';
import { Text } from '@/components/type/Text';

const FRIEND = require('@/assets/faces/face-3.webp');
const ME = require('@/assets/faces/face-6.webp');

const W = 164;
const PLAY_MS = 3600;

/*
 * Une conversation, un reel dedans — et il se REGARDE.
 *
 * C'est la premiere objection a « plus de reels » : « et ceux que mes amis
 * m'envoient ? ». On repond en le montrant : le message arrive, le reel
 * arrive avec, il se joue jusqu'au bout. Ce qui manque, c'est la suite :
 * aucun autre ne vient derriere. Le format court n'est pas interdit, c'est
 * l'enchainement qui l'est.
 */
export function MockDM({ playing, onDone }: { playing: boolean; onDone?: () => void }) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const bar = useSharedValue(0);

  useEffect(() => {
    if (!playing) { bar.value = 0; return; }
    bar.value = withDelay(400, withTiming(1, { duration: PLAY_MS, easing: Easing.linear }));
    const t = setTimeout(() => onDone?.(), 400 + PLAY_MS);
    return () => clearTimeout(t);
  }, [playing, bar, onDone]);

  const progress = useAnimatedStyle(() => ({ width: `${bar.value * 100}%` }));
  const play = useAnimatedStyle(() => ({ opacity: 1 - bar.value }));

  return (
    <View style={st.root}>
      <View style={st.head}>
        <ChevronLeft size={16} strokeWidth={2.4} color={c.mist} />
        <Image source={FRIEND} style={st.avatar} contentFit="cover" />
        <View style={{ flex: 1 }}>
          <Text variant="label" style={{ color: c.mist }}>thomas_b</Text>
          <Text variant="label" tone="tertiary" style={{ fontSize: 9 }}>{dict.ui.online}</Text>
        </View>
        <Phone size={14} strokeWidth={2.2} color={c.mist} />
        <Video size={15} strokeWidth={2.2} color={c.mist} />
      </View>

      <View style={st.thread}>
        <Animated.View entering={FadeIn.duration(360)} style={[st.bubble, st.mine]}>
          <Text variant="label" style={{ color: c.mist }}>{dict.ui.dm1}</Text>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(500).duration(360)} style={st.row}>
          <Image source={FRIEND} style={st.small} contentFit="cover" />
          <View style={[st.bubble, st.theirs]}>
            <Text variant="label" style={{ color: c.mist }}>{dict.ui.dm2}</Text>
          </View>
        </Animated.View>

        {/* Le reel : une carte a fond perdu, un bouton lecture, et une barre
            qui avance jusqu'au bout. C'est la barre qui prouve qu'on le VOIT. */}
        <Animated.View entering={FadeIn.delay(900).duration(420)} style={st.row}>
          <Image source={FRIEND} style={st.small} contentFit="cover" />
          <View style={st.reel}>
            <LinearGradient
              colors={['#7A5CE0', '#C2415C']}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={st.reelTop}>
              <Image source={ME} style={st.tiny} contentFit="cover" />
              <Text variant="label" style={{ color: '#FFF', fontSize: 9 }}>lea.mrn · Reel</Text>
            </View>
            <Animated.View style={[st.play, play]}>
              <Play size={16} strokeWidth={2.6} color="#FFFFFF" fill="#FFFFFF" />
            </Animated.View>
            <View style={st.track}>
              <Animated.View style={[st.fill, progress]} />
            </View>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0C1014', width: W, paddingTop: 22 },
  head: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: withAlpha(c.mist, 0.16),
  },
  avatar: { width: 22, height: 22, borderRadius: 11 },
  small: { width: 16, height: 16, borderRadius: 8, marginTop: 4 },
  tiny: { width: 12, height: 12, borderRadius: 6 },
  thread: { padding: 8, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 5 },
  bubble: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 14, maxWidth: 120 },
  mine: { alignSelf: 'flex-end', backgroundColor: '#3797F0' },
  theirs: { backgroundColor: withAlpha(c.mist, 0.14) },
  reel: {
    width: 104, height: 160, borderRadius: 12, overflow: 'hidden', justifyContent: 'space-between',
  },
  reelTop: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 6 },
  play: {
    position: 'absolute', top: 62, left: 34, width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)',
    paddingLeft: 3,
  },
  track: { height: 3, backgroundColor: 'rgba(255,255,255,0.3)' },
  fill: { height: 3, backgroundColor: '#FFFFFF' },
});
