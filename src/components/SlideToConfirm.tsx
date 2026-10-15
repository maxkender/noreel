import { useMemo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming,
} from 'react-native-reanimated';
import { ChevronsRight, Lock } from 'lucide-react-native';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { springs } from '@/theme/motion';
import { haptics } from '@/lib/haptics';
import { Text } from './type/Text';

const H = 64;
const KNOB = 52;

/**
 * Glisser pour confirmer.
 *
 * Un geste qui demande une intention : on ne l'active pas en effleurant.
 * Le rond suit le doigt ; lache avant le bout, il revient ; au bout, l'action
 * part. Une fois active, la piste montre l'etat et un toucher ouvre la porte
 * de sortie (gerer a l'appelant).
 */
export function SlideToConfirm({
  label, onConfirm, done, doneLabel, onDonePress, tone,
}: {
  label: string;
  onConfirm: () => void;
  /** Deja actif : la piste est pleine, le rond au bout. */
  done?: boolean;
  doneLabel?: string;
  onDonePress?: () => void;
  tone?: string;
}) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const colour = tone ?? c.danger;
  const [w, setW] = useState(0);
  const x = useSharedValue(0);
  const max = Math.max(0, w - KNOB - 12);

  const fire = () => { haptics.success(); onConfirm(); };
  const pan = Gesture.Pan()
    .enabled(!done)
    .onUpdate((e) => { x.value = Math.max(0, Math.min(max, e.translationX)); })
    .onEnd(() => {
      if (max > 0 && x.value > max * 0.85) {
        x.value = withTiming(max, { duration: 120 });
        runOnJS(fire)();
        x.value = withSpring(0, springs.snappy);
      } else {
        x.value = withSpring(0, springs.snappy);
      }
    });
  const tap = Gesture.Tap().enabled(!!done).onEnd(() => { if (onDonePress) runOnJS(onDonePress)(); });

  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: done ? max : x.value }] }));
  const fill = useAnimatedStyle(() => ({ width: (done ? max : x.value) + KNOB + 6 }));
  const hint = useAnimatedStyle(() => ({ opacity: done ? 1 : 1 - (max ? x.value / max : 0) }));

  return (
    <GestureDetector gesture={Gesture.Exclusive(pan, tap)}>
      <View
        style={[st.track, done && { borderColor: withAlpha(colour, 0.5) }]}
        onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
        accessibilityRole="adjustable"
        accessibilityLabel={done ? doneLabel : label}
      >
        <Animated.View style={[st.fill, { backgroundColor: withAlpha(colour, 0.14) }, fill]} />
        <Animated.View style={[st.labelWrap, hint]} pointerEvents="none">
          {!done && <ChevronsRight size={18} color={withAlpha(colour, 0.7)} />}
          <Text variant="body" color={done ? colour : withAlpha(c.mist, 0.55)}>{done ? doneLabel : label}</Text>
        </Animated.View>
        <Animated.View style={[st.knob, { backgroundColor: colour }, knob]}>
          <Lock size={22} strokeWidth={2.4} color="#fff" />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  track: {
    height: H, borderRadius: H / 2, justifyContent: 'center', overflow: 'hidden',
    backgroundColor: c.glassSolid, borderWidth: 1, borderColor: c.glassEdge,
  },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: H / 2 },
  labelWrap: {
    position: 'absolute', left: KNOB + 18, right: 16, top: 0, bottom: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  knob: {
    position: 'absolute', left: 6, width: KNOB, height: KNOB, borderRadius: KNOB / 2,
    alignItems: 'center', justifyContent: 'center',
  },
});
