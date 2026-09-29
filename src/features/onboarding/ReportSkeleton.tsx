import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { space } from '@/theme/spacing';

/**
 * Ce qu'on voit pendant que le dessin d'Apple arrive.
 *
 * L'extension met une demi-seconde, parfois deux, a rendre son premier
 * dessin — et pendant ce temps la vue est vide. Un ecran vide sous un titre
 * se lit comme une panne. Trois barres qui respirent disent « ca vient »,
 * puis s'effacent d'elles-memes : l'app ne saura jamais quand le dessin est
 * la, alors elle ne l'attend pas, elle lui laisse la place.
 */
export function ReportSkeleton({ rows = 3 }: { rows?: number }) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const [pulse] = useState(() => new Animated.Value(0.35));

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 0.9, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.35, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const widths = ['42%', '68%', '54%'] as const;
  return (
    <View style={st.root} pointerEvents="none">
      {Array.from({ length: rows }, (_, i) => (
        <Animated.View key={i} style={[st.bar, { width: widths[i % widths.length], opacity: pulse }]} />
      ))}
    </View>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  root: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center', gap: space.md,
  },
  bar: { height: 14, borderRadius: 7, backgroundColor: withAlpha(c.mist, 0.14) },
});
