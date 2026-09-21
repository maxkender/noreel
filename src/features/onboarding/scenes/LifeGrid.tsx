import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { colors, withAlpha } from '@/theme/colors';

const COLS = 24;

/**
 * 960 mois en vues simples, groupes par lignes.
 * Le shader Skia precedent crashait l'app en build release ; ici il n'y a
 * rien a compiler a l'execution.
 */
export function LifeGrid({
  width, lived, lost, total, fill, reclaim,
}: {
  width: number; lived: number; lost: number; total: number;
  fill: SharedValue<number>; reclaim: SharedValue<number>;
}) {
  const rows = Math.ceil(total / COLS);
  const gap = 2;
  const cell = Math.max(2, (width - gap * (COLS - 1)) / COLS);

  const cells = useMemo(
    () => Array.from({ length: total }, (_, i) => ({
      i,
      kind: i < lived ? 'lived' : i < lived + lost ? 'lost' : 'ahead',
      k: i < lived ? 0 : (i - lived) / Math.max(lost, 1),
    })),
    [total, lived, lost]
  );

  return (
    <View style={[styles.grid, { width, height: rows * (cell + gap) }]}>
      {cells.map((c) =>
        c.kind === 'lost'
          ? <LostCell key={c.i} size={cell} gap={gap} k={c.k} fill={fill} reclaim={reclaim} />
          : (
            <View
              key={c.i}
              style={{
                width: cell, height: cell, marginRight: gap, marginBottom: gap,
                borderRadius: 1.5,
                backgroundColor: c.kind === 'lived'
                  ? withAlpha(colors.mist, 0.14)
                  : withAlpha(colors.mist, 0.05),
              }}
            />
          )
      )}
    </View>
  );
}

function LostCell({
  size, gap, k, fill, reclaim,
}: {
  size: number; gap: number; k: number;
  fill: SharedValue<number>; reclaim: SharedValue<number>;
}) {
  const s = useAnimatedStyle(() => {
    const lit = fill.value > k ? 1 : 0;
    const back = reclaim.value > k ? 1 : 0;
    return {
      opacity: 0.18 + lit * 0.82,
      backgroundColor: back ? colors.mist : colors.accent,
    };
  });
  return (
    <Animated.View
      style={[
        { width: size, height: size, marginRight: gap, marginBottom: gap, borderRadius: 1.5 },
        s,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
});
