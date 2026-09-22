import { type ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, withAlpha } from '@/theme/colors';
import { radii } from '@/theme/spacing';
import { useReduceTransparency } from '@/lib/useReducedMotion';

type Props = {
  children?: ReactNode;
  radius?: number;
  intensity?: number;
  /** Côté du liseré chaud : le soleil est bas, donc « bottom » par défaut (§4.4). */
  warmEdge?: 'bottom' | 'top' | 'none';
  style?: StyleProp<ViewStyle>;
  /** Un panneau devant du détail mérite un vrai flou ; sur un ciel lisse, non. */
  blur?: boolean;
};

export function Glass({
  children,
  radius = radii.panel,
  intensity = Platform.OS === 'ios' ? 50 : 40,
  warmEdge = 'bottom',
  style,
  blur = true,
}: Props) {
  const opaque = useReduceTransparency() || (Platform.OS === 'android' && Platform.Version < 31);

  const shell: ViewStyle = {
    borderRadius: radius,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: withAlpha(colors.mist, 0.18),
    backgroundColor: opaque ? '#171A33F0' : withAlpha(colors.mist, 0.07),
  };

  return (
    <View style={[styles.shadow, shell, style]}>
      {!opaque && blur && (
        <BlurView
          intensity={intensity}
          tint="dark"
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      )}

      {/* Lumière du ciel : un reflet froid d'1 pt en haut. */}
      <LinearGradient
        colors={['transparent', withAlpha(colors.mist, 0.45), 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.topLight}
        pointerEvents="none"
      />

      {/* Signature UnSwipe : le liseré chaud du côté du soleil, donc en bas. */}
      {warmEdge !== 'none' && (
        <LinearGradient
          colors={['transparent', withAlpha(colors.sun, 0.55), 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.warm, warmEdge === 'bottom' ? { bottom: 0 } : { top: 0 }]}
          pointerEvents="none"
        />
      )}

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  topLight: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  warm: { position: 'absolute', left: 0, right: 0, height: 1.5 },
});
