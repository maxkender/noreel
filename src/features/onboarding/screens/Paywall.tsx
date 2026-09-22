import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Check, X } from 'lucide-react-native';
import { colors, withAlpha } from '@/theme/colors';
import { radii, space } from '@/theme/spacing';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/type/Text';
import { Glass } from '@/components/glass/Glass';
import { haptics } from '@/lib/haptics';
import { formatHours } from '@/lib/format';
import { useOnboardingStore } from '@/store/onboarding';

type Trial = 'free7' | 'paid30';

/**
 * UI seule — aucun achat n'est branche. La croix et le lien du bas mènent
 * tous deux a l'accueil : il n'y a jamais de mur.
 */
export function Paywall({ onDone }: { onDone: () => void }) {
  const minutes = useOnboardingStore((x) => x.minutesPerDay);
  const [trial, setTrial] = useState<Trial>('free7');
  const [more, setMore] = useState(false);

  // Quatre semaines : trois telles quelles, la derniere a -30 %.
  const weeks = [
    Math.round(minutes * 0.62),
    Math.round(minutes * 1.02),
    Math.round(minutes * 0.86),
    Math.round(minutes * 0.7),
  ];
  const top = Math.max(...weeks);

  return (
    <Screen cta="Démarrer mon essai gratuit" onPress={onDone} secondary="Continuer sans Pro" onSecondary={onDone}>
      <View style={st.head}>
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => { haptics.tap(); onDone(); }} hitSlop={14}>
          <X size={22} strokeWidth={2} color={withAlpha(colors.mist, 0.5)} />
        </Pressable>
      </View>

      <Text variant="displayM" style={st.center}>Suis ton progrès semaine après semaine</Text>

      {/* Le graphe : la derniere barre est celle qu'on promet. */}
      <View style={st.chart}>
        {weeks.map((m, i) => {
          const last = i === weeks.length - 1;
          return (
            <View key={i} style={st.col}>
              <Text variant="label" tone={last ? 'primary' : 'tertiary'} color={last ? colors.accent : undefined}>
                {formatHours(m)}
              </Text>
              <Animated.View
                entering={FadeInUp.delay(200 + i * 110).duration(620)}
                style={[st.bar, { height: 30 + (m / top) * 110 }]}
              >
                <LinearGradient
                  colors={last
                    ? [colors.accent, withAlpha(colors.accentDeep, 0.5)]
                    : [withAlpha(colors.mist, 0.16), withAlpha(colors.mist, 0.04)]}
                  style={StyleSheet.absoluteFill}
                />
              </Animated.View>
            </View>
          );
        })}
      </View>

      <Glass radius={radii.tile} intensity={55} warmEdge="none" style={st.plan}>
        <View style={st.planTop}>
          <View style={{ flex: 1 }}>
            <Text variant="title">Annuel</Text>
            <Text variant="label" tone="tertiary">0,27 €/jour · annule quand tu veux</Text>
          </View>
          <Text variant="title">99,99 €</Text>
        </View>

        <View style={st.options}>
          <Option
            on={trial === 'free7'}
            title="Gratuit pendant 7 jours"
            sub="Pas de paiement aujourd’hui"
            onPress={() => { haptics.tick(); setTrial('free7'); }}
          />
          <View style={st.optLine} />
          <Option
            on={trial === 'paid30'}
            title="4,99 € pendant 30 jours"
            sub="Prolonger ton essai"
            onPress={() => { haptics.tick(); setTrial('paid30'); }}
          />
        </View>
      </Glass>

      <Pressable
        onPress={() => { haptics.tap(); setMore((m) => !m); }}
        style={st.more}
      >
        <Text variant="label" tone="secondary">Autres forfaits {more ? '⌃' : '⌄'}</Text>
      </Pressable>

      {more && (
        <Animated.View entering={FadeInUp.duration(300)} style={st.others}>
          <Text variant="body" tone="secondary">Mensuel · 12,99 €/mois</Text>
          <Text variant="body" tone="secondary">À vie · 199,99 €, une fois</Text>
        </Animated.View>
      )}

      <Text variant="label" tone="tertiary" style={[st.center, { marginTop: space.lg, lineHeight: 18 }]}>
        7 jours gratuits, puis 99,99 €/an. Annule quand tu veux. Les achats ne
        sont pas encore actifs : tout est débloqué pendant la bêta.
      </Text>
    </Screen>
  );
}

function Option({
  on, title, sub, onPress,
}: { on: boolean; title: string; sub: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={st.opt} accessibilityRole="radio" accessibilityState={{ selected: on }}>
      <View style={{ flex: 1 }}>
        <Text variant="body">{title}</Text>
        <Text variant="label" tone="tertiary">{sub}</Text>
      </View>
      <View style={[st.radio, on && st.radioOn]}>
        {on && <Check size={14} strokeWidth={3} color={colors.night} />}
      </View>
    </Pressable>
  );
}

const st = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: space.lg },
  center: { textAlign: 'center' },
  chart: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    gap: space.sm, marginTop: space.xl, marginBottom: space.lg,
  },
  col: { flex: 1, alignItems: 'center', gap: 6 },
  bar: { width: '100%', borderRadius: 12, overflow: 'hidden' },
  plan: { padding: space.lg, marginTop: space.lg },
  planTop: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  options: {
    marginTop: space.lg, borderRadius: 16,
    backgroundColor: withAlpha(colors.mist, 0.05),
    borderWidth: StyleSheet.hairlineWidth, borderColor: withAlpha(colors.mist, 0.12),
  },
  opt: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md },
  optLine: { height: StyleSheet.hairlineWidth, backgroundColor: withAlpha(colors.mist, 0.12) },
  radio: {
    width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: withAlpha(colors.mist, 0.28),
  },
  radioOn: { backgroundColor: colors.mist, borderColor: colors.mist },
  more: {
    alignSelf: 'center', marginTop: space.lg,
    paddingHorizontal: space.lg, paddingVertical: space.sm, borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth, borderColor: withAlpha(colors.mist, 0.16),
  },
  others: { marginTop: space.md, gap: space.xs, alignItems: 'center' },
});
