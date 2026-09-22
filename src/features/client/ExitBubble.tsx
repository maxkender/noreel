import { useEffect, useRef, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  useAnimatedStyle, useSharedValue, withSpring, withTiming,
} from 'react-native-reanimated';
import { X } from 'lucide-react-native';
import { colors, withAlpha } from '@/theme/colors';
import { springs } from '@/theme/motion';
import { haptics } from '@/lib/haptics';
import { Text } from '@/components/type/Text';

const SIZE = 54;
const MARGIN = 14;
const SLOP = 6;

/**
 * Sortie de secours posee PAR-DESSUS la WebView.
 * Elle vit hors de son flux : la WebView ne peut pas lui voler les touches,
 * contrairement a un bouton place dans la barre haute.
 */
export function ExitBubble({ onExit }: { onExit: () => void }) {
  const { width, height } = Dimensions.get('window');
  const start = { x: width - SIZE - MARGIN, y: height * 0.58 };

  const x = useSharedValue(start.x);
  const y = useSharedValue(start.y);
  const origin = useRef(start);
  const moved = useRef(false);
  const [hint, setHint] = useState(true);

  useEffect(() => {
    const id = setTimeout(() => setHint(false), 4000);
    return () => clearTimeout(id);
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }],
  }));

  return (
    <>
      {hint && (
        <Animated.View style={styles.hint} pointerEvents="none">
          <Text variant="label" tone="secondary">Touche pour revenir</Text>
        </Animated.View>
      )}

      <Animated.View style={[styles.bubble, style]}>
        <Pressable
          onPress={() => { if (!moved.current) { haptics.press(); onExit(); } }}
          onTouchStart={() => { moved.current = false; }}
          onTouchMove={(e) => {
            const t = e.nativeEvent.pageX;
            void t;
            moved.current = true;
          }}
          onTouchEnd={(e) => {
            if (!moved.current) return;
            // Aimantation sur le bord le plus proche, comme une bulle de chat.
            const px = e.nativeEvent.pageX - SIZE / 2;
            const py = e.nativeEvent.pageY - SIZE / 2;
            const snapX = px + SIZE / 2 < width / 2 ? MARGIN : width - SIZE - MARGIN;
            const snapY = Math.min(Math.max(py, 80), height - SIZE - 60);
            origin.current = { x: snapX, y: snapY };
            x.value = withSpring(snapX, springs.snappy);
            y.value = withSpring(snapY, springs.snappy);
          }}
          onTouchCancel={() => { moved.current = false; }}
          style={styles.hit}
          accessibilityRole="button"
          accessibilityLabel="Revenir à NoReel"
        >
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.tint} />
          <X size={22} strokeWidth={2.4} color={colors.mist} />
        </Pressable>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute', top: 0, left: 0,
    width: SIZE, height: SIZE, borderRadius: SIZE / 2,
    shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 }, elevation: 14,
    zIndex: 100,
  },
  hit: {
    width: SIZE, height: SIZE, borderRadius: SIZE / 2, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth, borderColor: withAlpha(colors.mist, 0.4),
  },
  tint: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: withAlpha(colors.night, 0.55),
  },
  hint: {
    position: 'absolute', bottom: 40, alignSelf: 'center',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    backgroundColor: withAlpha(colors.night, 0.85),
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.lineStrong,
    zIndex: 99,
  },
});
