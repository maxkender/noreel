import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { BookOpen, Music, Sparkles, Utensils } from 'lucide-react-native';
import Animated, {
  Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming,
} from 'react-native-reanimated';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';

const PLEASURES = [BookOpen, Utensils, Music, Sparkles];

/**
 * Les plaisirs lents, qui s'eteignent un a un.
 *
 * « Plus rien ne fait d'effet » est abstrait. Un livre, un diner, une
 * chanson, une surprise : quatre choses qu'on aime, en couleur — puis
 * chacune se grise, l'une apres l'autre, sans que rien d'autre ne bouge.
 * On ne les perd pas d'un coup ; on les perd dans l'ordre, et c'est ce
 * rythme-la qu'on veut faire sentir.
 */
export function Dulled() {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  return (
    <View style={st.root}>
      {PLEASURES.map((Icon, i) => <Fade key={i} Icon={Icon} at={900 + i * 520} />)}
    </View>
  );
}

function Fade({ Icon, at }: { Icon: (typeof PLEASURES)[number]; at: number }) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const life = useSharedValue(1);

  useEffect(() => {
    life.value = withDelay(at, withTiming(0, { duration: 900, easing: Easing.inOut(Easing.ease) }));
  }, [life, at]);

  const dim = useAnimatedStyle(() => ({
    opacity: 0.22 + life.value * 0.78,
    transform: [{ scale: 0.9 + life.value * 0.1 }],
  }));

  return (
    <Animated.View style={[st.cell, dim]}>
      <Icon size={22} strokeWidth={2.2} color={c.accent} />
    </Animated.View>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  root: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginTop: 26 },
  cell: {
    width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center',
    backgroundColor: withAlpha(c.accent, 0.12), borderWidth: 1, borderColor: withAlpha(c.accent, 0.3),
  },
});
