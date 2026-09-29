import { useEffect, type ReactNode, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle, useSharedValue, withSpring, withTiming,
} from 'react-native-reanimated';
import { Check } from 'lucide-react-native';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { space } from '@/theme/spacing';
import { springs } from '@/theme/motion';
import { haptics } from '@/lib/haptics';
import { Text } from './type/Text';

const A = Animated.createAnimatedComponent(Pressable);

/**
 * Reponse de QCM.
 *
 * Tout ce qui bouge est une opacite ou une echelle — aucune couleur n'est
 * interpolee et aucun flou n'est empile. Les etats selectionnes sont des
 * calques poses par-dessus qu'on allume : c'est plus leger a l'image, et ca
 * evite d'animer bordure et fond, les deux proprietes les plus fragiles.
 * La hauteur, elle, ne change jamais : la liste ne saute pas.
 */
export function SelectCard({
  label, sub, lead, selected, onPress, shape = 'radio',
}: {
  label: string;
  sub?: string;
  /** Emoji, icone ou logo pose a gauche. */
  lead?: ReactNode;
  selected: boolean;
  onPress: () => void;
  shape?: 'radio' | 'check';
}) {
  const on = useSharedValue(selected ? 1 : 0);
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const press = useSharedValue(0);

  useEffect(() => {
    on.value = withSpring(selected ? 1 : 0, springs.snappy);
  }, [selected, on]);

  const shell = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - press.value * 0.025 }],
  }));
  const lit = useAnimatedStyle(() => ({ opacity: on.value }));
  const tick = useAnimatedStyle(() => ({
    opacity: on.value,
    transform: [{ scale: 0.5 + on.value * 0.5 }],
  }));

  return (
    <A
      accessibilityRole={shape === 'check' ? 'checkbox' : 'radio'}
      accessibilityState={shape === 'check' ? { checked: selected } : { selected }}
      onPressIn={() => { press.value = withTiming(1, { duration: 90 }); }}
      onPressOut={() => { press.value = withSpring(0, springs.snappy); }}
      onPress={() => { haptics.tick(); onPress(); }}
      style={[st.shell, shell]}
    >
      <View style={st.base} />
      {/* Reflet haut : l'epaisseur du verre, sans flou a calculer. */}
      <LinearGradient
        colors={[withAlpha(c.mist, 0.1), 'transparent']}
        style={st.sheen}
        pointerEvents="none"
      />

      {/* Les deux calques d'etat : teinte puis liseré, allumes ensemble. */}
      <Animated.View style={[StyleSheet.absoluteFill, lit]} pointerEvents="none">
        <LinearGradient
          colors={[withAlpha(c.accent, 0.22), withAlpha(c.accentWarm, 0.1)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Animated.View style={[st.ring, lit]} pointerEvents="none" />

      {/* Le logo reste tel quel : agrandi a la selection, un PNG de vingt-six
          points se reechantillonnait et paraissait flou. */}
      {lead ? <View style={st.lead}>{lead}</View> : null}

      <View style={st.text}>
        <Text variant="body">{label}</Text>
        {sub ? <Text variant="label" tone="tertiary">{sub}</Text> : null}
      </View>

      {/* Toujours rond, jamais rogne : le disque plein est un calque pose
          dessous, la coche vit au-dessus sans etre coupee. */}
      <View style={st.dot}>
        <Animated.View style={[st.fill, lit]} pointerEvents="none" />
        <Animated.View style={tick}>
          <Check size={15} strokeWidth={3} color={c.night} />
        </Animated.View>
      </View>
    </A>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  shell: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    paddingHorizontal: space.lg, paddingVertical: 17,
    borderRadius: 20, overflow: 'hidden',
    borderWidth: 1, borderColor: withAlpha(c.mist, 0.12),
  },
  base: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: withAlpha(c.mist, 0.06),
  },
  sheen: { position: 'absolute', top: 0, left: 0, right: 0, height: 22 },
  ring: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 20, borderWidth: 1.5, borderColor: withAlpha(c.accent, 0.65),
  },
  lead: { minWidth: 30, alignItems: 'center' },
  text: { flex: 1, gap: 1 },
  dot: {
    width: 26, height: 26, borderRadius: 13,
    borderWidth: 1.5, borderColor: withAlpha(c.mist, 0.26),
    alignItems: 'center', justifyContent: 'center',
  },
  fill: {
    position: 'absolute', top: -1.5, left: -1.5, right: -1.5, bottom: -1.5,
    borderRadius: 13, backgroundColor: c.accent,
  },
});
