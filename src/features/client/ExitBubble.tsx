import { useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming,
} from 'react-native-reanimated';
import { X } from 'lucide-react-native';
import { colors, withAlpha } from '@/theme/colors';
import { springs } from '@/theme/motion';
import { haptics } from '@/lib/haptics';
import { Text } from '@/components/type/Text';

const SIZE = 58;
const MARGIN = 14;

/**
 * Sortie de secours posee PAR-DESSUS la WebView, hors de son flux : la page
 * ne peut pas lui voler les touches.
 *
 * Le glissement et l'appui sont deux gestes distincts, pas un booleen pose
 * dans onTouchMove. La version precedente marquait « deplace » au moindre
 * pixel, si bien qu'un appui normal — qui bouge toujours un peu — n'ouvrait
 * jamais la sortie. C'etait ca, la croix qui ne marchait pas.
 */
export function ExitBubble({ onExit }: { onExit: () => void }) {
  const { width, height } = useWindowDimensions();
  const x = useSharedValue(width - SIZE - MARGIN);
  const y = useSharedValue(height * 0.56);
  const press = useSharedValue(0);
  const [hint, setHint] = useState(true);

  useEffect(() => {
    const id = setTimeout(() => setHint(false), 5000);
    return () => clearTimeout(id);
  }, []);

  const fire = () => { haptics.press(); onExit(); };

  const tap = Gesture.Tap()
    .maxDuration(900)
    .onBegin(() => { press.value = withTiming(1, { duration: 90 }); })
    .onFinalize(() => { press.value = withSpring(0, springs.snappy); })
    .onEnd(() => { runOnJS(fire)(); });

  // 10 pt avant d'etre considere comme un glissement : en dessous, c'est un appui.
  const pan = Gesture.Pan()
    .minDistance(10)
    .onChange((e) => {
      x.value += e.changeX;
      y.value += e.changeY;
    })
    .onEnd(() => {
      const snapX = x.value + SIZE / 2 < width / 2 ? MARGIN : width - SIZE - MARGIN;
      x.value = withSpring(snapX, springs.snappy);
      y.value = withSpring(Math.min(Math.max(y.value, 90), height - SIZE - 80), springs.snappy);
    });

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { scale: 1 - press.value * 0.08 },
    ],
  }));

  return (
    <>
      {hint && (
        <Animated.View style={styles.hint} pointerEvents="none">
          <Text variant="label" tone="secondary">Touche la croix pour revenir</Text>
        </Animated.View>
      )}

      <GestureDetector gesture={Gesture.Exclusive(pan, tap)}>
        <Animated.View
          style={[styles.bubble, style]}
          accessibilityRole="button"
          accessibilityLabel="Revenir à UnSwipe"
        >
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.tint} />
          <X size={24} strokeWidth={2.6} color={colors.mist} />
        </Animated.View>
      </GestureDetector>
    </>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute', top: 0, left: 0,
    width: SIZE, height: SIZE, borderRadius: SIZE / 2, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: withAlpha(colors.mist, 0.45),
    shadowColor: '#000', shadowOpacity: 0.55, shadowRadius: 16,
    shadowOffset: { width: 0, height: 5 }, elevation: 16,
    zIndex: 100,
  },
  tint: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: withAlpha(colors.night, 0.6),
  },
  hint: {
    position: 'absolute', bottom: 40, alignSelf: 'center',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    backgroundColor: withAlpha(colors.night, 0.88),
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.lineStrong,
    zIndex: 99,
  },
});
