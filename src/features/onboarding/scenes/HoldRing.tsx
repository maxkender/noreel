import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedProps, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { withAlpha } from '@/theme/colors';
import { useColors } from '@/theme/useColors';

const ACircle = Animated.createAnimatedComponent(Circle);

/**
 * Un anneau qui se remplit pendant qu'on tient.
 *
 * La pilule qui se remplissait de gauche a droite disait « attends ». Un
 * anneau autour de Corti dit « c'est lui que tu tiens » — et comme il se
 * vide quand on lache, on voit ce qu'on abandonne. Il vit sur le fil
 * d'animation : sa valeur est partagee avec le geste, pas recalculee par
 * React a chaque image.
 */
export function HoldRing({
  progress, size = 280, stroke = 5, children,
}: {
  progress: SharedValue<number>;
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
}) {
  const c = useColors();
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const st = useMemo(() => sheet(size), [size]);

  const dash = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  return (
    <View style={st.root}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={withAlpha(c.mist, 0.12)} strokeWidth={stroke} fill="none" />
        <ACircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={c.accent}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={dash}
          // Le trait part du haut, comme une horloge, pas de trois heures.
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={st.inner}>{children}</View>
    </View>
  );
}

const sheet = (size: number) => StyleSheet.create({
  root: { width: size, height: size, alignItems: 'center', justifyContent: 'center' },
  inner: { alignItems: 'center', justifyContent: 'center' },
});
