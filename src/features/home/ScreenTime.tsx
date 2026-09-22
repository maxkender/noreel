import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, withAlpha } from '@/theme/colors';
import { space } from '@/theme/spacing';
import { Text } from '@/components/type/Text';
import { Glass } from '@/components/glass/Glass';
import { formatHours } from '@/lib/format';
import { APPS, LOGOS } from './AppSlider';

/**
 * Le temps du jour, app par app — en second plan, sous le reste.
 *
 * Les barres sont en POURCENTAGE de la ligne, pas en flex : la version
 * precedente empilait des `flex` autour d'un texte, ce qui donnait des
 * barres de travers des qu'une valeur changeait.
 */
export function ScreenTime({ minutes }: { minutes: Record<string, number> }) {
  const rows = APPS.map((a) => ({ ...a, m: minutes[a.id] ?? 0 }))
    .sort((x, y) => y.m - x.m);
  const total = rows.reduce((n, r) => n + r.m, 0);
  const top = Math.max(1, rows[0]?.m ?? 1);

  return (
    <Glass radius={20} intensity={40} warmEdge="none" style={st.card}>
      <View style={st.head}>
        <Text variant="label" tone="tertiary">TEMPS D’ÉCRAN · AUJOURD’HUI</Text>
        <Text variant="label" tone="secondary">{formatHours(total)}</Text>
      </View>

      <View style={st.list}>
        {rows.map((r) => {
          const pct = Math.max(3, Math.round((r.m / top) * 100));
          const heavy = total > 0 && r.m > total / 3;
          const c = heavy ? colors.danger : colors.accent;
          return (
            <View key={r.id} style={st.row}>
              <Image source={LOGOS[r.id]} style={st.logo} contentFit="contain" />
              <View style={st.body}>
                <View style={st.labels}>
                  <Text variant="label" tone="secondary" numberOfLines={1} style={{ flex: 1 }}>
                    {r.name}
                  </Text>
                  <Text variant="label" color={c}>{formatHours(r.m)}</Text>
                </View>
                <View style={st.track}>
                  <View style={[st.fill, { width: `${pct}%` }]}>
                    <LinearGradient
                      colors={[withAlpha(c, 0.5), c]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={StyleSheet.absoluteFill}
                    />
                  </View>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </Glass>
  );
}

const st = StyleSheet.create({
  card: { padding: space.md, paddingHorizontal: space.lg },
  head: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: space.md,
  },
  list: { gap: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  logo: { width: 24, height: 24 },
  body: { flex: 1, gap: 5 },
  labels: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  track: {
    height: 4, borderRadius: 2, overflow: 'hidden',
    backgroundColor: withAlpha(colors.mist, 0.08),
  },
  fill: { height: 4, borderRadius: 2, overflow: 'hidden' },
});
