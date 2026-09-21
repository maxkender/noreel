import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Fill, Shader, Skia, useClock } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import { toRgb01 } from '@/theme/colors';
import { LIFE_GRID_SKSL } from './lifegrid.sksl';

const effect = Skia.RuntimeEffect.Make(LIFE_GRID_SKSL);
if (!effect && __DEV__) console.error('LifeGrid : le shader ne compile pas');

const CANDIDATES = [24, 30, 32, 40];

/** Choisit le nombre de colonnes qui donne les plus gros carreaux carres. */
export function gridGeometry(total: number, w: number, h: number) {
  let best = { cols: 24, rows: 40, cell: 0 };
  for (const cols of CANDIDATES) {
    const rows = Math.ceil(total / cols);
    const cell = Math.min(w / cols, h / rows);
    if (cell > best.cell) best = { cols, rows, cell };
  }
  return best;
}

export function LifeGrid({
  width, height, lived, lost, total,
  reveal, fill, reclaim,
}: {
  width: number; height: number; lived: number; lost: number; total: number;
  reveal: SharedValue<number>; fill: SharedValue<number>; reclaim: SharedValue<number>;
}) {
  const clock = useClock();
  const g = useMemo(() => gridGeometry(total, width, height), [total, width, height]);
  const ox = (width - g.cols * g.cell) / 2;
  const oy = 0;

  const uniforms = useDerivedValue(() => ({
    u_origin: [ox, oy],
    u_cell: g.cell,
    u_cols: g.cols,
    u_rows: g.rows,
    u_total: total,
    u_lived: lived,
    u_lost: lost,
    u_reveal: reveal.value,
    u_fill: fill.value,
    u_reclaim: reclaim.value,
    u_time: clock.value / 1000,
    u_cLived: toRgb01('#F4A0B5'),
    u_cFuture: toRgb01('#EEF0FA'),
    u_cLost: toRgb01('#8FB8FF'),
    u_cReclaimed: toRgb01('#FFB37D'),
  }));

  if (!effect) return <View style={{ width, height }} />;
  return (
    <Canvas style={{ width, height }} pointerEvents="none">
      <Fill>
        <Shader source={effect} uniforms={uniforms} />
      </Fill>
    </Canvas>
  );
}

export const gridStyles = StyleSheet.create({});
