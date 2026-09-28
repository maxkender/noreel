import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { space } from '@/theme/spacing';
import { Text } from '@/components/type/Text';
import { Glass } from '@/components/glass/Glass';
import { formatHours } from '@/lib/format';
import { APPS, LOGOS } from './AppSlider';
import { dict, interpolate } from '@/i18n';
import { combine } from '@/services/realtime';

/**
 * Le temps du jour, app par app — en second plan, sous le reste.
 *
 * Les barres sont en POURCENTAGE de la ligne, pas en flex : la version
 * precedente empilait des `flex` autour d'un texte, ce qui donnait des
 * barres de travers des qu'une valeur changeait.
 */
export function ScreenTime({
  minutes, realFloor = null,
}: {
  minutes: Record<string, number>;
  /**
   * Le plancher venu d'iOS pour les VRAIES apps, ou nul si on ne sait pas.
   *
   * Apple ne donne jamais le total : il previent quand un seuil est franchi,
   * rien de plus. On additionne donc un chiffre exact — le notre, chronometre
   * dans nos propres ecrans — et une borne basse. La somme est une borne
   * basse, et c'est ecrit comme tel.
   */
  realFloor?: number | null;
}) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const rows = APPS.map((a) => ({ ...a, m: minutes[a.id] ?? 0 }))
    .sort((x, y) => y.m - x.m);
  const mine = rows.reduce((n, r) => n + r.m, 0);
  const { total, atLeast } = combine(mine, realFloor);
  const top = Math.max(1, rows[0]?.m ?? 1);

  return (
    <Glass radius={20} intensity={40} warmEdge="none" style={st.card}>
      <View style={st.head}>
        <Text variant="label" tone="tertiary">{dict.misc.screenToday}</Text>
        <Text variant="label" tone="secondary">
          {atLeast
            ? interpolate(dict.misc.atLeast, { h: formatHours(total) })
            : formatHours(total)}
        </Text>
      </View>

      <View style={st.list}>
        {rows.map((r) => {
          const pct = Math.max(3, Math.round((r.m / top) * 100));
          const heavy = total > 0 && r.m > total / 3;
          const tint = heavy ? c.danger : c.accent;
          return (
            <View key={r.id} style={st.row}>
              <Image source={LOGOS[r.id]} style={st.logo} contentFit="contain" />
              <View style={st.body}>
                <View style={st.labels}>
                  <Text variant="label" tone="secondary" numberOfLines={1} style={{ flex: 1 }}>
                    {r.name}
                  </Text>
                  <Text variant="label" color={tint}>{formatHours(r.m)}</Text>
                </View>
                <View style={st.track}>
                  <View style={[st.fill, { width: `${pct}%` }]}>
                    <LinearGradient
                      colors={[withAlpha(tint, 0.5), tint]}
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

      {/*
        Les vraies apps, a part.

        Elles ne peuvent pas rejoindre les barres du dessus : celles-ci sont
        mesurees a la minute, celle-ci est un palier. Les melanger ferait une
        barre qui a l'air aussi precise que les autres et qui ne l'est pas —
        et ce serait sur le seul chiffre que les gens viennent verifier.
      */}
      {realFloor !== null && realFloor > 0 && (
        <View style={st.real}>
          <View style={st.labels}>
            <Text variant="label" tone="secondary" style={{ flex: 1 }}>
              {dict.misc.realApps}
            </Text>
            <Text variant="label" color={c.danger}>
              {interpolate(dict.misc.atLeast, { h: formatHours(realFloor) })}
            </Text>
          </View>
          <Text variant="label" tone="tertiary" style={{ marginTop: 3 }}>
            {dict.misc.realWhy}
          </Text>
        </View>
      )}
    </Glass>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
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
    backgroundColor: withAlpha(c.mist, 0.08),
  },
  fill: { height: 4, borderRadius: 2, overflow: 'hidden' },
  real: {
    marginTop: space.md, paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: withAlpha(c.mist, 0.12),
  },
});
