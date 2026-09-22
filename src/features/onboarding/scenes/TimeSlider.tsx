import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS, useAnimatedStyle, useSharedValue, withSpring,
} from 'react-native-reanimated';
import { colors, withAlpha } from '@/theme/colors';
import { springs } from '@/theme/motion';
import { haptics } from '@/lib/haptics';

const MIN = 15, MAX = 720, STEP = 15;

/** Une ligne, une poignee de verre. Rien d'autre. */
export function TimeSlider({
  minutes, onChange,
}: { minutes: number; onChange: (m: number) => void }) {
  const { width } = useWindowDimensions();
  const track = width - 48 - 32;          // marges d'ecran + demi-poignees
  const ratio = (minutes - MIN) / (MAX - MIN);
  const x = useSharedValue(ratio * track);

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
    .onChange((e) => {
      x.value = Math.min(track, Math.max(0, x.value + e.changeX));
      runOnJS(commit)(x.value);
    });

  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const filled = useAnimatedStyle(() => ({ width: x.value + 16 }));

  return (
    <GestureDetector gesture={pan}>
      <View style={[styles.root, { width: track + 32 }]}>
        <View style={styles.track} />
        <Animated.View style={[styles.filled, filled]} />
        <Animated.View style={[styles.knob, knob]}>
          <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
          <View style={styles.knobFill} />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  root: { height: 44, justifyContent: 'center' },
  track: {
    height: 2, borderRadius: 1, marginHorizontal: 16,
    backgroundColor: withAlpha(colors.mist, 0.12),
  },
  filled: {
    position: 'absolute', left: 8, height: 2, borderRadius: 1,
    backgroundColor: colors.accent,
  },
  knob: {
    position: 'absolute', left: 0, width: 32, height: 32, borderRadius: 16,
    overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth, borderColor: withAlpha(colors.mist, 0.5),
  },
  knobFill: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: withAlpha(colors.mist, 0.18),
  },
});

export const SLIDER = { MIN, MAX, STEP };
