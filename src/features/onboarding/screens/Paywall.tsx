import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, withAlpha } from '@/theme/colors';
import { radii, space } from '@/theme/spacing';
import { Screen } from '@/components/Screen';
import { Typewriter } from '@/components/type/Typewriter';
import { Text } from '@/components/type/Text';
import { haptics } from '@/lib/haptics';
import { useT } from '@/i18n';

/** UI seule. Les DEUX boutons menent a la Home : jamais de mur. */
export function Paywall({ onDone }: { onDone: () => void }) {
  const { d } = useT();
  const [plan, setPlan] = useState<'yearly' | 'monthly'>('yearly');

  return (
    <Screen
      cta={d.paywall.cta}
      onPress={onDone}
      secondary={d.paywall.skip}
      onSecondary={onDone}
    >
      <Text variant="label" tone="secondary">{d.paywall.kicker}</Text>
      <Typewriter text={d.paywall.title} variant="displayM" />
      <Text variant="lead" tone="secondary" style={{ marginTop: space.sm }}>
        {d.paywall.subtitle}
      </Text>

      <View style={{ marginTop: space.xl, gap: space.md }}>
        {[d.paywall.f1, d.paywall.f2, d.paywall.f3, d.paywall.f4, d.paywall.f5].map((f) => (
          <View key={f} style={st.row}>
            <View style={st.check}><Text variant="label" color="#0B0D1F">✓</Text></View>
            <Text variant="body" tone="secondary" style={{ flex: 1 }}>{f}</Text>
          </View>
        ))}
      </View>

      <View style={st.plans}>
        {(['yearly', 'monthly'] as const).map((k) => {
          const on = plan === k;
          return (
            <Pressable
              key={k}
              onPress={() => { setPlan(k); haptics.tick(); }}
              style={[st.plan, on && st.planOn]}
            >
              <Text variant="title">
                {k === 'yearly' ? d.paywall.yearly : d.paywall.monthly}
              </Text>
              <Text variant="label" tone="secondary">
                {k === 'yearly' ? d.paywall.yearlySub : d.paywall.monthlySub}
              </Text>
              {k === 'yearly' && (
                <Text variant="label" color={colors.sun} style={{ marginTop: 4 }}>
                  {d.paywall.save}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>

      <Text variant="label" tone="tertiary" style={{ marginTop: space.lg }}>
        {d.paywall.soon}
      </Text>
    </Screen>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  check: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.sun,
  },
  plans: { flexDirection: 'row', gap: space.sm, marginTop: space.xl },
  plan: {
    flex: 1, padding: space.lg, borderRadius: radii.tile, gap: 2,
    borderWidth: 1, borderColor: withAlpha(colors.mist, 0.14),
  },
  planOn: { borderColor: colors.sun, backgroundColor: withAlpha(colors.sun, 0.1) },
});
