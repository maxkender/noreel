import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { X } from 'lucide-react-native';
import { colors, withAlpha } from '@/theme/colors';
import { space } from '@/theme/spacing';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/type/Text';
import { SelectCard } from '@/components/SelectCard';
import { haptics } from '@/lib/haptics';
import { formatHours } from '@/lib/format';
import { useOnboardingStore } from '@/store/onboarding';
import { useProStore } from '@/store/pro';
import { PURCHASES_ENABLED, buy, currentOffering } from '@/services/purchases';
import type { PurchasesPackage } from 'react-native-purchases';

const LOCKUP = require('@/assets/brand/lockup.png');

type Plan = 'annual' | 'monthly';

// Prix de reference, affiches tant que le magasin n'a pas repondu.
// Ils doivent coller a ceux d'App Store Connect, sinon l'ecran ment
// pendant la seconde de chargement.
const FALLBACK = { annual: '39,99 €', monthly: '8,99 €' };

/**
 * UI seule — aucun achat n'est branche. La croix et le lien du bas mènent
 * tous deux a l'accueil : il n'y a jamais de mur.
 */
export function Paywall({ onDone }: { onDone: () => void }) {
  const minutes = useOnboardingStore((x) => x.minutesPerDay);
  const [plan, setPlan] = useState<Plan>('annual');
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

  // On vise le forfait par son identifiant, jamais par sa position :
  // l'ordre se change au tableau de bord sans prevenir.
  const find = (k: string) => packs.find((x) => x.identifier === k);
  const annual = find('$rc_annual');
  const monthly = find('$rc_monthly');
  const chosen = plan === 'annual' ? annual : monthly;

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
      cta={busy ? 'Un instant…' : 'Passer en Pro'}
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

      <View style={st.options}>
        <SelectCard
          label={`Annuel · ${annual?.product.priceString ?? FALLBACK.annual}`}
          sub="0,11 €/jour — deux tiers d’économie"
          selected={plan === 'annual'}
          onPress={() => setPlan('annual')}
        />
        <SelectCard
          label={`Mensuel · ${monthly?.product.priceString ?? FALLBACK.monthly}`}
          sub="Sans engagement, annule quand tu veux"
          selected={plan === 'monthly'}
          onPress={() => setPlan('monthly')}
        />
      </View>

      <Pressable
        onPress={() => { haptics.tap(); void restorePro(); }}
        style={{ alignSelf: 'center', marginTop: space.lg, paddingVertical: space.sm }}
      >
        <Text variant="label" tone="tertiary">
          {PURCHASES_ENABLED ? 'Restaurer mes achats' : 'Gratuit pendant la bêta.'}
        </Text>
      </Pressable>

      <Pressable
        onPress={() => { haptics.tap(); void restorePro(); }}
        style={{ alignSelf: 'center', marginTop: space.lg, paddingVertical: space.sm }}
      >
        <Text variant="label" tone="tertiary">
          {PURCHASES_ENABLED ? 'Restaurer mes achats' : 'Gratuit pendant la bêta.'}
        </Text>
      </Pressable>

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
  options: { marginTop: space.xl, gap: space.md },
});
