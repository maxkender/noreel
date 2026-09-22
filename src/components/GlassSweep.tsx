import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing, useAnimatedStyle, useSharedValue, withTiming,
} from 'react-native-reanimated';
import { colors, withAlpha } from '@/theme/colors';

/**
 * Une lame de verre traverse l'ecran en diagonale a l'ouverture d'une page.
 * Elle ne dure que le temps du geste et ne prend aucun toucher.
 */
export function GlassSweep({ delay = 0 }: { delay?: number }) {
  const { width, height } = useWindowDimensions();
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = 0;
    t.value = withTiming(1, {
      duration: 760,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    });
  }, [t]);

  const span = width + height;

  const anim = useAnimatedStyle(() => ({
    opacity: t.value < 0.12 ? t.value / 0.12 : 1 - (t.value - 0.12) / 0.88,
    transform: [
      { rotate: '-24deg' },
      { translateX: -span + t.value * span * 2.2 },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.band,
        { width: span * 0.55, height: span * 1.6, top: -height * 0.3 },
        anim,
      ]}
    >
      <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={['transparent', withAlpha(colors.accent, 0.14), withAlpha(colors.accentWarm, 0.12), 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  band: { position: 'absolute', left: 0, zIndex: 40, overflow: 'hidden' },
});
