import { useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS, useAnimatedStyle, useSharedValue, withSpring,
} from 'react-native-reanimated';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { springs } from '@/theme/motion';
import { haptics } from '@/lib/haptics';

const MIN = 15, MAX = 720, STEP = 15;
const KNOB = 38;

/** Rail de verre, poignee de verre. La poignee grossit sous le doigt. */
export function TimeSlider({
  minutes, onChange,
}: { minutes: number; onChange: (m: number) => void }) {
  const c = useColors();
  const styles = useMemo(() => sheet(c), [c]);
  const { width } = useWindowDimensions();
  const track = width - 48 - KNOB;        // marges d'ecran + demi-poignees
  const ratio = (minutes - MIN) / (MAX - MIN);
  const x = useSharedValue(ratio * track);
  const grab = useSharedValue(0);         // 0 pose, 1 saisi

  const commit = (px: number) => {
    const r = Math.min(1, Math.max(0, px / track));
    const v = Math.round((MIN + r * (MAX - MIN)) / STEP) * STEP;
    if (v !== minutes) {
      onChange(v);
      haptics.tick();
    }
  };

  // La poignee suit le doigt au pixel ; seule la VALEUR est arrondie au quart
  // d'heure. Arrondir la position faisait sauter le curseur.
  const pan = Gesture.Pan()
    .minDistance(0)
    .onBegin(() => { grab.value = withSpring(1, springs.snappy); })
    .onChange((e) => {
      x.value = Math.min(track, Math.max(0, x.value + e.changeX));
      runOnJS(commit)(x.value);
    })
    .onFinalize(() => { grab.value = withSpring(0, springs.gentle); });

  const knob = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { scale: 1 + grab.value * 0.3 },
    ],
    shadowOpacity: 0.35 + grab.value * 0.45,
  }));
  const filled = useAnimatedStyle(() => ({ width: x.value + KNOB / 2 }));
  const halo = useAnimatedStyle(() => ({
    opacity: grab.value * 0.5,
    transform: [{ translateX: x.value }, { scale: 1 + grab.value * 0.9 }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <View style={[styles.root, { width: track + KNOB }]}>
        {/* Le rail est lui aussi du verre : flou, filet, creux. */}
        <View style={styles.track}>
          <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />
          <View style={styles.trackTint} />
        </View>

        <Animated.View style={[styles.filledWrap, filled]}>
          <LinearGradient
            colors={[c.accent, c.accentDeep, c.accentWarm]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        {/* Halo sous la poignee : il ne naît qu'au contact du doigt. */}
        <Animated.View style={[styles.halo, halo]} pointerEvents="none" />

        <Animated.View style={[styles.knob, knob]}>
          <BlurView intensity={75} tint="light" style={StyleSheet.absoluteFill} />
          <LinearGradient
            colors={[withAlpha(c.mist, 0.4), withAlpha(c.accentDeep, 0.35), withAlpha(c.accentWarm, 0.3)]}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={['transparent', withAlpha(c.mist, 0.9), 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.knobSheen}
          />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  root: { height: 52, justifyContent: 'center' },
  track: {
    height: 10, borderRadius: 5, marginHorizontal: KNOB / 2, overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth, borderColor: withAlpha(c.mist, 0.16),
  },
  trackTint: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: withAlpha(c.mist, 0.06),
  },
  filledWrap: {
    position: 'absolute', left: KNOB / 2 - 1, height: 10, borderRadius: 5,
    overflow: 'hidden',
  },
  halo: {
    position: 'absolute', left: 0, width: KNOB, height: KNOB,
    borderRadius: KNOB / 2, backgroundColor: c.accent,
  },
  knob: {
    position: 'absolute', left: 0, width: KNOB, height: KNOB, borderRadius: KNOB / 2,
    overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: withAlpha(c.mist, 0.55),
    shadowColor: c.accentDeep, shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
  },
  knobSheen: { position: 'absolute', top: 0, left: 0, right: 0, height: 1.5 },
});

export const SLIDER = { MIN, MAX, STEP };
