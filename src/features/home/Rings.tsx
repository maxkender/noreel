import { StyleSheet, View } from 'react-native';
import { colors, withAlpha } from '@/theme/colors';
import { space } from '@/theme/spacing';
import { Text } from '@/components/type/Text';

/** Trois anneaux de tete, comme les cercles Sommeil / Focus / Repos. */
export function Rings({
  items,
}: { items: { label: string; value: number; max: number }[] }) {
  return (
    <View style={st.row}>
      {items.map((it) => {
        const pct = it.max > 0 ? Math.min(1, it.value / it.max) : 0;
        return (
          <View key={it.label} style={st.item}>
            <View style={st.ring}>
              {/* Arc de progression : une bordure haute coloree suffit a lire
                  le niveau, sans dependre d'une bibliotheque de dessin. */}
              <View
                style={[
                  st.arc,
                  {
                    borderTopColor: pct > 0.05 ? colors.accent : colors.line,
                    borderRightColor: pct > 0.35 ? colors.accent : colors.line,
                    borderBottomColor: pct > 0.65 ? colors.accent : colors.line,
                    borderLeftColor: pct > 0.9 ? colors.accent : colors.line,
                  },
                ]}
              />
              <Text variant="title">{Math.round(it.value)}</Text>
            </View>
            <Text variant="label" color={colors.accent}>{it.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
  item: { flex: 1, alignItems: 'center', gap: space.sm },
  ring: {
    width: 76, height: 76, borderRadius: 38,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: withAlpha(colors.mist, 0.04),
  },
  arc: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 38, borderWidth: 3, borderColor: colors.line,
  },
});
