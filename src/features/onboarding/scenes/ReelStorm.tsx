import { useMemo } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import {
  Canvas, Group, RoundedRect, Circle, Blur, LinearGradient, vec,
} from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import { seg } from '@/lib/useTimeline';
import { ease } from '@/lib/ease';

/** Partition de l'ecran 1 (§7). Les bornes sont en ms. */
export const T1 = {
  lift: [0, 350],
  spin: [350, 1100],
  storm: [700, 2000],
  freeze: 2000,
  lieDown: [2180, 2900],
  sunrise: [2400, 3200],
  wordmark: [3200, 3700],
  title: [3700, 4100],
  cta: [4100, 4400],
  total: 4400,
} as const;

const CARDS = 24;
const COLS = 3;

type Card = { col: number; i: number; speed: number; w: number; h: number; delay: number };

export function ReelStorm({ t }: { t: SharedValue<number> }) {
  const { width, height } = useWindowDimensions();
  const cx = width / 2;
  const horizonY = height * 0.46;

  const cards = useMemo<Card[]>(() => {
    const speeds = [900, 1300, 1100];
    const w = width * 0.22;
    return Array.from({ length: CARDS }, (_, i) => ({
      col: i % COLS,
      i,
      speed: speeds[i % COLS],
      w,
      h: (w * 16) / 9,
      // reparties sur la colonne pour qu'elles defilent en continu
      delay: Math.floor(i / COLS) * 0.28,
    }));
  }, [width]);

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      {cards.map((c) => (
        <StormCard key={c.i} card={c} t={t} width={width} height={height} horizonY={horizonY} />
      ))}
      <Ring t={t} cx={cx} horizonY={horizonY} size={width * 0.17} />
    </Canvas>
  );
}

function StormCard({
  card, t, width, height, horizonY,
}: {
  card: Card; t: SharedValue<number>; width: number; height: number; horizonY: number;
}) {
  const colX = width / 2 + (card.col - 1) * (card.w * 1.18);

  const transform = useDerivedValue(() => {
    const storm = seg(t.value, T1.storm[0], T1.storm[1]);
    const down = seg(t.value, T1.lieDown[0], T1.lieDown[1]);

    // Montee continue tant que la tempete dure ; gel a l'arret net.
    const travel = ((storm * card.speed) / 600 + card.delay) % 1.6;
    const y = height + card.h - travel * (height + card.h * 2);

    // Puis elles se couchent : rotation vers l'horizontale, ecrasement, chute.
    const d = ease.out(Math.min(1, Math.max(0, down - card.delay * 0.2)));
    const fallY = y + (horizonY - y) * d;
    const scaleY = 1 - d * 0.98;

    return [
      { translateX: colX },
      { translateY: fallY },
      { rotate: (-8 * Math.PI) / 180 + (d * 8 * Math.PI) / 180 },
      { scaleY: Math.max(scaleY, 0.02) },
    ];
  });

  const opacity = useDerivedValue(() => {
    const appear = seg(t.value, T1.storm[0], T1.storm[0] + 220);
    const gone = seg(t.value, T1.lieDown[1] - 180, T1.lieDown[1]);
    return appear * (1 - gone);
  });

  return (
    <Group transform={transform} opacity={opacity} origin={vec(0, 0)}>
      <RoundedRect x={-card.w / 2} y={-card.h / 2} width={card.w} height={card.h} r={14}>
        <LinearGradient
          start={vec(0, -card.h / 2)}
          end={vec(0, card.h / 2)}
          colors={['#2B3B63', '#16203A']}
        />
      </RoundedRect>
      {/* Contenu abstrait : une tache floue, deux barres, trois cercles d'action. */}
      <Circle cx={0} cy={-card.h * 0.12} r={card.w * 0.22} color="#8FB8FF55">
        <Blur blur={8} />
      </Circle>
      <RoundedRect x={-card.w * 0.34} y={card.h * 0.18} width={card.w * 0.52} height={3} r={2} color="#EEF0FA33" />
      <RoundedRect x={-card.w * 0.34} y={card.h * 0.26} width={card.w * 0.32} height={3} r={2} color="#EEF0FA22" />
      {[0, 1, 2].map((k) => (
        <Circle key={k} cx={card.w * 0.34} cy={card.h * (0.04 + k * 0.1)} r={2.6} color="#EEF0FA33" />
      ))}
    </Group>
  );
}

/** L'anneau : bobine pendant le chaos, soleil apres. */
function Ring({
  t, cx, horizonY, size,
}: { t: SharedValue<number>; cx: number; horizonY: number; size: number }) {
  const r = size / 2;

  const transform = useDerivedValue(() => {
    const lift = ease.out(seg(t.value, T1.lift[0], T1.lift[1]));
    const spin = seg(t.value, T1.spin[0], T1.spin[1]);
    const rise = ease.out(seg(t.value, T1.sunrise[0], T1.sunrise[1]));
    // Il plonge sous l'horizon puis remonte : c'est le lever.
    const dip = Math.sin(rise * Math.PI) * size * 0.35;
    return [
      { translateX: cx },
      { translateY: horizonY - 12 * lift + dip * (1 - rise) },
      { rotate: ease.in(spin) * Math.PI * 14 },
    ];
  });

  const color = useDerivedValue(() => {
    const warm = seg(t.value, T1.sunrise[0], T1.sunrise[1]);
    // bleu d'ecran -> abricot
    const mix = (a: number, b: number) => Math.round(a + (b - a) * warm);
    const c = [mix(0x8f, 0xff), mix(0xb8, 0xb3), mix(0xff, 0x7d)];
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  });

  const strokeW = size * 0.09;
  return (
    <Group transform={transform}>
      <Circle cx={0} cy={0} r={r} style="stroke" strokeWidth={strokeW} color={color} />
    </Group>
  );
}
