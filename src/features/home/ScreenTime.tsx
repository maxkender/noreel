import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ChevronRight } from 'lucide-react-native';
import { colors, withAlpha } from '@/theme/colors';
import { space } from '@/theme/spacing';
import { Text } from '@/components/type/Text';
import { Glass } from '@/components/glass/Glass';
import { formatHours } from '@/lib/format';
import { APPS, LOGOS } from './AppSlider';

/**
 * Le temps du jour, app par app. La barre dit la duree, sa couleur dit si
 * c'est du temps subi ou du temps choisi : au-dela du tiers de la journee
 * d'ecran, elle vire au rouge.
 */
export function ScreenTime({ minutes }: { minutes: Record<string, number> }) {
  const rows = APPS.map((a) => ({ ...a, m: minutes[a.id] ?? 0 }))
    .sort((x, y) => y.m - x.m);
  const total = rows.reduce((n, r) => n + r.m, 0);
  const top = Math.max(1, rows[0]?.m ?? 1);

  return (
    <Glass radius={24} intensity={55} warmEdge="none" style={st.card}>
      <View style={st.head}>
        <Text variant="label" tone="secondary">TEMPS D’ÉCRAN</Text>
        <ChevronRight size={15} strokeWidth={2.2} color={withAlpha(colors.mist, 0.4)} />
      </View>

      <Text variant="hero" style={st.total} numberOfLines={1} adjustsFontSizeToFit>
        {formatHours(total)}
      </Text>
      <Text variant="body" tone="tertiary">Aujourd’hui</Text>

      <View style={st.rule} />

      <View style={{ gap: space.md }}>
        {rows.map((r, i) => {
          const heavy = r.m > total / 3;
          const c = heavy ? colors.danger : colors.accent;
          return (
            <Animated.View
              key={r.id}
              entering={FadeIn.delay(80 * i).duration(420)}
              style={st.row}
            >
              <Image source={LOGOS[r.id]} style={st.logo} contentFit="contain" />
              <View style={{ flex: 1, gap: 5 }}>
                <Text variant="body">{r.name}</Text>
                <View style={st.barRow}>
                  <View style={[st.bar, { flex: Math.max(0.04, r.m / top) }]}>
                    <LinearGradient
                      colors={[withAlpha(c, 0.55), c]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={StyleSheet.absoluteFill}
                    />
                  </View>
                  <Text variant="label" color={c}>{formatHours(r.m)}</Text>
                  <View style={{ flex: Math.max(0.02, 1 - r.m / top) }} />
                </View>
              </View>
            </Animated.View>
          );
        })}
      </View>
    </Glass>
  );
}

const st = StyleSheet.create({
  card: { padding: space.lg },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  total: { marginTop: space.sm },
  rule: {
    height: StyleSheet.hairlineWidth, marginVertical: space.lg,
    backgroundColor: withAlpha(colors.mist, 0.14),
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  logo: { width: 38, height: 38 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  bar: { height: 5, borderRadius: 3, overflow: 'hidden' },
});
