import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, withAlpha } from '@/theme/colors';

const COLS = 24;

/**
 * Le remplissage avance par paliers pilotes en JS : on voit reellement les
 * cases s'allumer une a une. La version precedente animait chaque case avec
 * son propre worklet, ce qui ne produisait aucun mouvement visible.
 */
export function LifeGrid({
  width, lived, lost, total, running, reclaiming,
}: {
  width: number; lived: number; lost: number; total: number;
  running: boolean; reclaiming: boolean;
}) {
  const [lit, setLit] = useState(0);
  const [back, setBack] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval>>(undefined);

  const gap = 2;
  const cell = Math.max(2, (width - gap * (COLS - 1)) / COLS);
  const rows = Math.ceil(total / COLS);

  // ~24 paliers : assez pour que l'oeil suive, assez peu pour rester fluide.
  useEffect(() => {
    if (!running) return;
    const steps = 24;
    let i = 0;
    timer.current = setInterval(() => {
      i += 1;
      setLit(Math.round((lost * i) / steps));
      if (i >= steps && timer.current) clearInterval(timer.current);
    }, 70);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [running, lost]);

  useEffect(() => {
    if (!reclaiming) return;
    const steps = 20;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setBack(Math.round((lost * i) / steps));
      if (i >= steps) clearInterval(id);
    }, 60);
    return () => clearInterval(id);
  }, [reclaiming, lost]);

  const cells = useMemo(
    () => Array.from({ length: total }, (_, i) => i),
    [total]
  );

  return (
    <View style={[styles.grid, { width, height: rows * (cell + gap) }]}>
      {cells.map((i) => {
        const isLost = i >= lived && i < lived + lost;
        const k = i - lived;
        let bg = withAlpha(colors.mist, 0.05);          // devant toi
        if (i < lived) bg = withAlpha(colors.mist, 0.13); // vecu
        else if (isLost && k < back) bg = colors.mist;    // recupere
        else if (isLost && k < lit) bg = colors.accent;   // sur ton telephone
        return (
          <View
            key={i}
            style={{
              width: cell, height: cell, marginRight: gap, marginBottom: gap,
              borderRadius: 1.5, backgroundColor: bg,
            }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
});
