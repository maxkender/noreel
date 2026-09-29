import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS, useAnimatedStyle, useSharedValue, withSpring,
} from 'react-native-reanimated';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { springs } from '@/theme/motion';
import { haptics } from '@/lib/haptics';
import { formatHours } from '@/lib/format';
import { Text } from '@/components/type/Text';

export const GAUGE_MIN = 15;
export const GAUGE_MAX = 720;
export const GAUGE_STEP = 15;

const W = 104;
const H = 280;

/**
 * Une jauge VERTICALE qui se remplit sous le doigt.
 *
 * Le curseur horizontal donnait un temps comme on regle un volume : une
 * position sur une regle, abstraite. Une colonne qui se remplit vers le haut
 * se lit comme un verre — et douze heures d'ecran font une colonne pleine,
 * ce qu'aucune position de curseur ne montre. Le chiffre est pose AU-DESSUS,
 * pas dedans : dedans, il disparaissait sous le doigt au moment de le lire.
 *
 * Le remplissage suit le doigt au pixel ; seule la VALEUR est arrondie au
 * quart d'heure. Arrondir la hauteur faisait sauter la jauge par crans.
 */
export function VerticalGauge({
  minutes, onChange, onCommit,
}: {
  minutes: number;
  onChange: (m: number) => void;
  onCommit?: (m: number) => void;
}) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const ratio = (minutes - GAUGE_MIN) / (GAUGE_MAX - GAUGE_MIN);
  const fill = useSharedValue(ratio * H);
  const grab = useSharedValue(0);

  const commit = (px: number) => {
    const r = Math.min(1, Math.max(0, px / H));
    const v = Math.round((GAUGE_MIN + r * (GAUGE_MAX - GAUGE_MIN)) / GAUGE_STEP) * GAUGE_STEP;
    if (v !== minutes) { onChange(v); haptics.tick(); }
  };
  const release = (px: number) => {
    const r = Math.min(1, Math.max(0, px / H));
    onCommit?.(Math.round((GAUGE_MIN + r * (GAUGE_MAX - GAUGE_MIN)) / GAUGE_STEP) * GAUGE_STEP);
  };

  // Un glissement vers le HAUT remplit : changeY est negatif quand on monte.
  const pan = Gesture.Pan()
    .minDistance(0)
    // Un geste vertical, annonce comme tel : sans ca, un parent qui defile
    // pouvait le reclamer au premier pixel et la jauge restait figee.
    .activeOffsetY([-1, 1])
    .onBegin((e) => {
      grab.value = withSpring(1, springs.snappy);
      // Toucher la colonne y pose le niveau : on n'a pas a aller chercher
      // la surface du liquide pour commencer a regler.
      fill.value = Math.min(H, Math.max(0, H - e.y));
      runOnJS(commit)(fill.value);
    })
    .onChange((e) => {
      fill.value = Math.min(H, Math.max(0, fill.value - e.changeY));
      runOnJS(commit)(fill.value);
    })
    .onFinalize(() => {
      grab.value = withSpring(0, springs.snappy);
      runOnJS(release)(fill.value);
    });

  const liquid = useAnimatedStyle(() => ({ height: fill.value }));
  const column = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + grab.value * 0.03 }],
  }));

  return (
    <View style={st.root}>
      <Text variant="hero" color={c.accent} style={st.value} numberOfLines={1} adjustsFontSizeToFit>
        {formatHours(minutes)}
      </Text>
      <GestureDetector gesture={pan}>
        <Animated.View style={[st.column, column]}>
          <Animated.View style={[st.liquid, liquid]}>
            <LinearGradient
              colors={[withAlpha(c.accent, 0.95), c.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  root: { alignItems: 'center', gap: 14 },
  value: { textAlign: 'center', alignSelf: 'stretch' },
  column: {
    width: W, height: H, borderRadius: W / 2, overflow: 'hidden',
    justifyContent: 'flex-end',
    backgroundColor: withAlpha(c.accent, 0.16),
    borderWidth: 1, borderColor: withAlpha(c.mist, 0.12),
  },
  liquid: { width: '100%', overflow: 'hidden' },
});
