import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { X } from 'lucide-react-native';
import { colors, withAlpha } from '@/theme/colors';
import { radii, space } from '@/theme/spacing';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/type/Text';
import { Glass } from '@/components/glass/Glass';
import { SelectCard } from '@/components/SelectCard';
import { haptics } from '@/lib/haptics';
import { formatHours } from '@/lib/format';
import { useOnboardingStore } from '@/store/onboarding';
import { useProStore } from '@/store/pro';
import { PURCHASES_ENABLED, buy, currentOffering } from '@/services/purchases';
import type { PurchasesPackage } from 'react-native-purchases';

const LOCKUP = require('@/assets/brand/lockup.png');

type Trial = 'free7' | 'paid30';

/**
 * UI seule — aucun achat n'est branche. La croix et le lien du bas mènent
 * tous deux a l'accueil : il n'y a jamais de mur.
 */
export function Paywall({ onDone }: { onDone: () => void }) {
  const minutes = useOnboardingStore((x) => x.minutesPerDay);
  const [trial, setTrial] = useState<Trial>('free7');
  const [more, setMore] = useState(false);
  const [packs, setPacks] = useState<PurchasesPackage[]>([]);
  const [busy, setBusy] = useState(false);
  const setPro = useProStore((x) => x.setPro);
  const restorePro = useProStore((x) => x.restore);

  // Les vrais prix viennent du magasin. Sans cle, la liste reste vide et
  // l'ecran garde ses valeurs d'exemple.
  useEffect(() => {
    let alive = true;
    void currentOffering().then((o) => {
      if (alive && o) setPacks(o.availablePackages);
    });
    return () => { alive = false; };
  }, []);

  const chosen = packs[trial === 'free7' ? 0 : Math.min(1, packs.length - 1)];

  const go = async () => {
    // Sans achat configure, le bouton continue vers l'app : jamais de mur.
    if (!PURCHASES_ENABLED || !chosen) { onDone(); return; }
    setBusy(true);
    const r = await buy(chosen);
    setBusy(false);
    if (r === 'bought') { setPro(true); onDone(); return; }
    if (r === 'cancelled') return;   // l'utilisateur a renonce : on le laisse
    onDone();                        // un echec ne doit pas l'enfermer ici
  };

  // Quatre semaines : trois telles quelles, la derniere a -30 %.
  const weeks = [
    Math.round(minutes * 0.62),
    Math.round(minutes * 1.02),
    Math.round(minutes * 0.86),
    Math.round(minutes * 0.7),
  ];
  const top = Math.max(...weeks);

  return (
    <Screen
      cta={busy ? 'Un instant…' : 'Démarrer mon essai gratuit'}
      onPress={() => { void go(); }}
      disabled={busy}
      secondary="Continuer sans Pro"
      onSecondary={onDone}
      hue="warm"
    >
      <View style={st.head}>
        <Image source={LOCKUP} style={st.lockup} contentFit="contain" />
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
                    ? [colors.accent, colors.accentDeep, colors.accentWarm]
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
          <SelectCard
            label="Gratuit pendant 7 jours"
            sub="Pas de paiement aujourd’hui"
            selected={trial === 'free7'}
            onPress={() => setTrial('free7')}
          />
          <SelectCard
            label="4,99 € pendant 30 jours"
            sub="Prolonger ton essai"
            selected={trial === 'paid30'}
            onPress={() => setTrial('paid30')}
          />
        </View>
      </Glass>

      <Pressable
        onPress={() => { haptics.tap(); void restorePro(); }}
        style={{ alignSelf: 'center', marginTop: space.lg, paddingVertical: space.sm }}
      >
        <Text variant="label" tone="tertiary">
          {PURCHASES_ENABLED ? 'Restaurer mes achats' : 'Gratuit pendant la bêta.'}
        </Text>
      </Pressable>

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

    </Screen>
  );
}

const st = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: space.lg },
  lockup: { width: 112, height: 42 },
  center: { textAlign: 'center' },
  chart: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    gap: space.sm, marginTop: space.xl, marginBottom: space.lg,
  },
  col: { flex: 1, alignItems: 'center', gap: 6 },
  bar: { width: '100%', borderRadius: 12, overflow: 'hidden' },
  plan: { padding: space.lg, marginTop: space.lg },
  planTop: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  options: { marginTop: space.lg, gap: space.sm },
  more: {
    alignSelf: 'center', marginTop: space.lg,
    paddingHorizontal: space.lg, paddingVertical: space.sm, borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth, borderColor: withAlpha(colors.mist, 0.16),
  },
  others: { marginTop: space.md, gap: space.xs, alignItems: 'center' },
});
