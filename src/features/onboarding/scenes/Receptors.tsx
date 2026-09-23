import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { space } from '@/theme/spacing';
import { Text } from '@/components/type/Text';

const BARS = 14;
const H = 132;
// La premiere barre monte a 94 % de la hauteur : le repere se posait
// dessus et se faisait couper. Il vit au-dessus du trace, pas dedans.
const TOP = 26;

/**
 * Ce que « les recepteurs s'aplatissent » veut dire, en une image.
 *
 * La phrase seule ne montre rien : on comprend les mots sans voir la
 * courbe. Ici chaque barre est une video, et sa hauteur le plaisir qu'elle
 * procure. La premiere touche le niveau normal ; les suivantes retombent,
 * de moins en moins haut, alors meme qu'on en regarde toujours plus. C'est
 * la DESCENTE qui porte l'idee, pas le mot « recepteur ».
 */
export function Receptors() {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);

  // Decroissance geometrique : chaque video rend un peu moins que la
  // precedente, et la chute ralentit sans jamais remonter.
  const bars = Array.from({ length: BARS }, (_, i) => 0.94 * Math.pow(0.88, i));

  return (
    <View style={st.root}>
      <View style={st.plot}>
        {/* Le niveau normal, en pointilles : sans repere, une barre qui
            baisse ne baisse par rapport a rien. */}
        <View style={st.ruleWrap}>
          <View style={st.rule}>
            {Array.from({ length: 22 }, (_, i) => <View key={i} style={st.dash} />)}
          </View>
          <Text variant="label" tone="tertiary" style={st.ruleLabel}>niveau normal</Text>
        </View>

        <View style={st.bars}>
          {bars.map((v, i) => (
            <Animated.View
              key={i}
              entering={FadeIn.delay(360 + i * 90).duration(320)}
              style={[st.bar, { height: Math.max(3, v * H) }]}
            />
          ))}
        </View>
      </View>

      <View style={st.axis}>
        <Text variant="label" tone="tertiary">1re vidéo</Text>
        <Text variant="label" tone="tertiary">300e</Text>
      </View>
    </View>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  root: { marginTop: space.xl, paddingTop: TOP },
  plot: { height: H, justifyContent: 'flex-end' },
  ruleWrap: { position: 'absolute', top: -TOP, left: 0, right: 0 },
  rule: { flexDirection: 'row', justifyContent: 'space-between' },
  dash: { width: 6, height: 1, backgroundColor: withAlpha(c.mist, 0.28) },
  ruleLabel: { marginTop: 4, marginBottom: 2 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: H },
  bar: { flex: 1, borderRadius: 3, backgroundColor: withAlpha(c.ember, 0.85) },
  axis: {
    flexDirection: 'row', justifyContent: 'space-between', marginTop: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: withAlpha(c.mist, 0.14),
    paddingTop: space.xs,
  },
});
