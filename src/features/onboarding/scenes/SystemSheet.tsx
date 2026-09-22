import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import { colors, withAlpha } from '@/theme/colors';
import { space } from '@/theme/spacing';
import { Text } from '@/components/type/Text';

/**
 * Maquette de l'alerte systeme, montree AVANT la vraie. Le bouton a presser
 * est mis en lumiere, l'autre est eteint, et une fleche le designe — sans
 * ca, un tiers des gens appuie sur le bouton bleu et bloque l'app.
 * Ce n'est qu'une image : elle ne declenche rien.
 */
export function SystemSheet({
  title, body, good, bad, goodSide = 'left',
}: {
  title: string;
  body: string;
  good: string;
  bad: string;
  goodSide?: 'left' | 'right';
}) {
  const buttons = goodSide === 'left'
    ? [{ label: good, on: true }, { label: bad, on: false }]
    : [{ label: bad, on: false }, { label: good, on: true }];

  return (
    <Animated.View entering={FadeIn.delay(400).duration(700)} style={st.wrap}>
      {/* Cadre violet lumineux : l'oeil va la, pas ailleurs. */}
      <LinearGradient
        colors={[colors.accent, withAlpha(colors.accentDeep, 0.75)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={st.frame}
      >
        <View style={st.sheet}>
          <Text variant="title" style={st.title}>{title}</Text>
          <Text variant="body" tone="secondary" style={st.body}>{body}</Text>

          <View style={st.row}>
            {buttons.map((b) => (
              <View key={b.label} style={[st.btn, b.on ? st.btnOn : st.btnOff]}>
                <Text
                  variant="button"
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                  color={b.on ? colors.mist : withAlpha('#4A7DFF', 0.55)}
                >
                  {b.label}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </LinearGradient>

      <Arrow side={goodSide} />
    </Animated.View>
  );
}

/** Fleche courbe qui remonte vers le bon bouton. */
function Arrow({ side }: { side: 'left' | 'right' }) {
  // Trace pour la gauche ; on le retourne pour la droite.
  const d = 'M118 96 C 96 76, 52 68, 30 24';
  const head = 'M30 24 L 26 44 M30 24 L 48 32';

  return (
    <Animated.View
      entering={FadeIn.delay(1100).duration(700)}
      style={[st.arrow, side === 'right' && st.arrowFlip]}
      pointerEvents="none"
    >
      <Svg width={148} height={104} viewBox="0 0 148 104">
        <Path d={d} stroke={colors.accent} strokeWidth={3} fill="none" strokeLinecap="round" />
        <Path d={head} stroke={colors.accent} strokeWidth={3} fill="none" strokeLinecap="round" />
      </Svg>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  wrap: { alignItems: 'center', marginTop: space.xl },
  frame: { borderRadius: 30, padding: 2, width: '100%' },
  sheet: {
    borderRadius: 28, backgroundColor: '#15171C',
    padding: space.lg, paddingTop: space.xl,
  },
  title: { marginBottom: space.md },
  body: { lineHeight: 21 },
  row: { flexDirection: 'row', gap: space.md, marginTop: space.xl },
  btn: {
    flex: 1, height: 46, borderRadius: 23, paddingHorizontal: space.md,
    alignItems: 'center', justifyContent: 'center',
  },
  btnOn: { backgroundColor: withAlpha(colors.mist, 0.22) },
  btnOff: { backgroundColor: withAlpha('#2B4C9E', 0.45) },
  arrow: { marginTop: -8, alignSelf: 'center', marginLeft: -90 },
  arrowFlip: { transform: [{ scaleX: -1 }], marginLeft: 90 },
});
