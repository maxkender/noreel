import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Check, Minus } from 'lucide-react-native';
import { colors, withAlpha } from '@/theme/colors';
import { gutter, radii, space } from '@/theme/spacing';
import { Text } from '@/components/type/Text';
import { Glass } from '@/components/glass/Glass';
import { GlassButton } from '@/components/glass/GlassButton';
import { haptics } from '@/lib/haptics';
import { useT } from '@/i18n';
import { useSky } from '@/components/sky/SkyProvider';

/**
 * UI seule : RevenueCat n'est pas branche (TODO produit).
 * Le paywall est TOUJOURS contournable — "Continuer avec la version gratuite"
 * mene a la Home. Aucun mur dur tant que les paiements n'existent pas.
 */
export function Paywall({ onDone }: { onDone: () => void }) {
  const { d } = useT();
  const sky = useSky();
  const [plan, setPlan] = useState<'yearly' | 'monthly'>('yearly');

  useEffect(() => { sky.to('morning'); }, [sky]);

  const rows = [
    { label: d.paywall.f1, free: true },
    { label: d.paywall.f2, free: false },
    { label: d.paywall.f3, free: false },
    { label: d.paywall.f4, free: false },
    { label: d.paywall.f5, free: false },
  ];

  return (
    <ScrollView contentContainerStyle={styles.root} showsVerticalScrollIndicator={false}>
      <Text variant="label" tone="secondary">{d.paywall.kicker}</Text>
      <Text variant="displayM" style={{ marginTop: space.xs }}>{d.paywall.title}</Text>
      <Text variant="lead" tone="secondary" style={{ marginTop: space.sm }}>
        {d.paywall.subtitle}
      </Text>

      <Glass style={styles.table}>
        <View style={styles.head}>
          <View style={{ flex: 1 }} />
          <Text variant="label" tone="secondary" style={styles.col}>{d.paywall.free}</Text>
          <Text variant="label" style={styles.col}>{d.paywall.pro}</Text>
        </View>
        {rows.map((r) => (
          <View key={r.label} style={styles.row}>
            <Text variant="body" tone="secondary" style={{ flex: 1 }}>{r.label}</Text>
            <View style={styles.col}>
              {r.free
                ? <Check size={16} strokeWidth={1.5} color={withAlpha(colors.mist, 0.55)} />
                : <Minus size={16} strokeWidth={1.5} color={withAlpha(colors.mist, 0.25)} />}
            </View>
            <View style={styles.col}>
              <Check size={16} strokeWidth={1.5} color={colors.sun} />
            </View>
          </View>
        ))}
      </Glass>

      <View style={styles.plans}>
        {(['yearly', 'monthly'] as const).map((k) => {
          const on = plan === k;
          return (
            <Pressable
              key={k}
              onPress={() => { setPlan(k); haptics.tick(); }}
              style={[styles.plan, on && styles.planOn]}
            >
              {k === 'yearly' && (
                <View style={styles.badge}>
                  <Text variant="label" color="#00131F">{d.paywall.save}</Text>
                </View>
              )}
              <Text variant="title">{k === 'yearly' ? d.paywall.yearly : d.paywall.monthly}</Text>
              <Text variant="label" tone="secondary">
                {k === 'yearly' ? d.paywall.yearlySub : d.paywall.monthlySub}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text variant="label" tone="tertiary" style={styles.soon}>{d.paywall.soon}</Text>

      <GlassButton label={d.paywall.cta} onPress={onDone} />

      {/* La sortie est toujours la, jamais cachee. */}
      <Pressable onPress={onDone} style={styles.skip} hitSlop={10}>
        <Text variant="body" tone="secondary" style={styles.skipText}>{d.paywall.skip}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: gutter, paddingTop: space.lg, paddingBottom: space.xxl },
  table: { padding: space.lg, marginTop: space.xl, borderRadius: radii.panel },
  head: { flexDirection: 'row', alignItems: 'center', paddingBottom: space.sm },
  row: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: space.sm,
    borderTopWidth: 1, borderTopColor: withAlpha(colors.mist, 0.08),
  },
  col: { width: 56, alignItems: 'center' },
  plans: { flexDirection: 'row', gap: space.sm, marginTop: space.lg },
  plan: {
    flex: 1, padding: space.lg, borderRadius: radii.tile, gap: 2,
    borderWidth: 1, borderColor: withAlpha(colors.mist, 0.14),
    backgroundColor: withAlpha(colors.mist, 0.05),
  },
  planOn: {
    borderColor: withAlpha(colors.sun, 0.6),
    backgroundColor: withAlpha(colors.sun, 0.1),
  },
  badge: {
    alignSelf: 'flex-start', marginBottom: 6,
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: radii.pill,
    backgroundColor: colors.sun,
  },
  soon: { marginTop: space.md, marginBottom: space.lg, textAlign: 'center' },
  skip: { marginTop: space.lg, alignSelf: 'center' },
  skipText: { textDecorationLine: 'underline' },
});
