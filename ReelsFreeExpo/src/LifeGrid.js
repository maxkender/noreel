import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { T } from './theme';

const LIFE_YEARS = 80;
const COLS = 52;                       // une case = une semaine
const TOTAL = LIFE_YEARS * COLS;

export const CATS = [
  { key: 'past',   label: 'Déjà vécu', color: '#7C3AED' },
  { key: 'sleep',  label: 'Sommeil',   color: '#1E40AF' },
  { key: 'work',   label: 'Travail',   color: '#047857' },
  { key: 'chores', label: 'Quotidien', color: '#B45309' },
  { key: 'scroll', label: 'Scrolling', color: '#EF4444' },
  { key: 'free',   label: 'À toi',     color: '#1F2937' },
];
const COLOR = Object.fromEntries(CATS.map(c => [c.key, c.color]));

export function computeLife(age, hoursPerDay) {
  const past = Math.min(age, LIFE_YEARS) * COLS;
  const left = Math.max(TOTAL - past, 0);

  // Parts du temps restant. Le scrolling est calcule sur 24 h reelles,
  // c est ce qui rend le chiffre credible plutot qu alarmiste.
  const scroll = Math.round(left * (hoursPerDay / 24));
  const sleep  = Math.round(left * 0.33);
  const work   = Math.round(left * 0.21);
  const chores = Math.round(left * 0.07);
  const free   = Math.max(left - scroll - sleep - work - chores, 0);

  return {
    segments: [
      { key: 'past', n: past },
      { key: 'sleep', n: sleep },
      { key: 'work', n: work },
      { key: 'chores', n: chores },
      { key: 'scroll', n: scroll },
      { key: 'free', n: free },
    ].filter(s => s.n > 0),
    scrollYears: scroll / COLS,
    freeYears: free / COLS,
  };
}

/**
 * Rend la grille par "runs" contigus plutot que case par case :
 * 4160 cases deviennent ~200 Views, sinon le premier rendu bloque une seconde.
 */
export default function LifeGrid({ age, hoursPerDay }) {
  const { segments } = useMemo(() => computeLife(age, hoursPerDay), [age, hoursPerDay]);

  const rows = useMemo(() => {
    const out = [];
    let row = [];
    let used = 0;
    for (const seg of segments) {
      let n = seg.n;
      while (n > 0) {
        const take = Math.min(n, COLS - used);
        row.push({ key: seg.key, take });
        used += take;
        n -= take;
        if (used === COLS) { out.push(row); row = []; used = 0; }
      }
    }
    if (row.length) out.push(row);
    return out;
  }, [segments]);

  return (
    <View style={styles.grid}>
      {rows.map((row, i) => (
        <View key={i} style={styles.row}>
          {row.map((run, j) => (
            <View
              key={j}
              style={{ flex: run.take, backgroundColor: COLOR[run.key], marginHorizontal: 0.4 }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

export function Legend({ age, hoursPerDay }) {
  const { scrollYears } = computeLife(age, hoursPerDay);
  return (
    <View style={styles.legend}>
      {CATS.map(c => (
        <View key={c.key} style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: c.color }]} />
          <Text style={styles.legendText}>
            {c.label}
            {c.key === 'scroll' ? ` · ${scrollYears.toFixed(1)} ans` : ''}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { width: '100%', gap: 1.2 },
  row: { flexDirection: 'row', height: 4.2, gap: 0 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 2 },
  legendText: { color: T.dim, fontSize: 11 },
});
