import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { Check, Infinity as Infin, Moon, ShieldCheck, Sparkles, X } from 'lucide-react-native';
import { colors, withAlpha } from '@/theme/colors';
import { space } from '@/theme/spacing';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/type/Text';
import { haptics } from '@/lib/haptics';
import { formatHours } from '@/lib/format';
import { screenYears } from '../calculations';
import { useOnboardingStore } from '@/store/onboarding';
import { useProStore } from '@/store/pro';
import { PURCHASES_ENABLED, buy, currentOffering } from '@/services/purchases';
import type { PurchasesPackage } from 'react-native-purchases';

const LOCKUP = require('@/assets/brand/lockup.png');

type Plan = 'annual' | 'monthly';

// Prix de secours, affiches tant que le magasin n'a pas repondu. Ils
// doivent coller a ceux d'App Store Connect, sinon l'ecran ment pendant la
// seconde de chargement.
const FALLBACK = { annual: '39,99 €', monthly: '8,99 €' };
const ANNUAL_EUR = 39.99;
const MONTHLY_EUR = 8.99;
const SAVING = Math.round((1 - ANNUAL_EUR / (MONTHLY_EUR * 12)) * 100);

const PERKS = [
  { icon: Sparkles, t: 'Les quatre apps, filtrées', s: 'Instagram, TikTok, X, YouTube' },
  { icon: ShieldCheck, t: 'Blocage des apps d’origine', s: 'La porte de derrière reste fermée' },
  { icon: Moon, t: 'Règles horaires', s: 'Nuit calme, matin clair, bloc concentré' },
  { icon: Infin, t: 'Tout ce qui arrive ensuite', s: 'Compris, sans supplément' },
];

/**
 * Le paywall.
 *
 * Il arrive au sommet du parcours, juste apres la promesse chiffree. Trois
 * regles tenues : le prix est dit en entier, la croix est toujours la, et
 * les deux sorties menent a l'app. Jamais de mur.
 */
export function Paywall({ onDone }: { onDone: () => void }) {
  const minutes = useOnboardingStore((x) => x.minutesPerDay);
  const name = useOnboardingStore((x) => x.firstName);
  const [plan, setPlan] = useState<Plan>('annual');
  const [packs, setPacks] = useState<PurchasesPackage[]>([]);
  const [busy, setBusy] = useState(false);
  const setPro = useProStore((x) => x.setPro);
  const restorePro = useProStore((x) => x.restore);

  useEffect(() => {
    let alive = true;
    void currentOffering().then((o) => { if (alive && o) setPacks(o.availablePackages); });
    return () => { alive = false; };
  }, []);

  // On vise le forfait par son identifiant, jamais par sa position :
  // l'ordre se change au tableau de bord sans prevenir.
  const find = (k: string) => packs.find((x) => x.identifier === k);
  const annual = find('$rc_annual');
  const monthly = find('$rc_monthly');
  const chosen = plan === 'annual' ? annual : monthly;

  const years = Math.max(1, Math.round(screenYears(minutes) * 0.3));
  const weeks = [
    Math.round(minutes * 0.62), Math.round(minutes * 1.02),
    Math.round(minutes * 0.86), Math.round(minutes * 0.7),
  ];
  const top = Math.max(...weeks);

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
        <Pressable onPress={() => { haptics.tap(); onDone(); }} hitSlop={16} style={st.close}>
          <X size={19} strokeWidth={2.2} color={withAlpha(colors.mist, 0.55)} />
        </Pressable>
      </View>

      <Text variant="displayM" style={st.title}>
        {name ? `${name}, récupère ` : 'Récupère '}
        <Text variant="displayM" color={colors.accent}>{years} ans</Text>
        {' de ta vie'}
      </Text>

      {/* Le graphe dit la promesse mieux qu'une phrase : la derniere barre
          est celle qu'on s'engage a obtenir. */}
      <View style={st.chart}>
        {weeks.map((m, i) => {
          const last = i === weeks.length - 1;
          return (
            <View key={i} style={st.col}>
              <Text variant="label" color={last ? colors.accent : withAlpha(colors.mist, 0.35)}>
                {formatHours(m)}
              </Text>
              <Animated.View
                entering={FadeInUp.delay(140 + i * 110).duration(600)}
                style={[st.bar, { height: 26 + (m / top) * 104 }]}
              >
                <LinearGradient
                  colors={last
                    ? [colors.accent, colors.accentDeep, colors.accentWarm]
                    : [withAlpha(colors.mist, 0.14), withAlpha(colors.mist, 0.04)]}
                  style={StyleSheet.absoluteFill}
                />
              </Animated.View>
              <Text variant="label" tone="tertiary">S{i + 1}</Text>
            </View>
          );
        })}
      </View>

      <View style={st.perks}>
        {PERKS.map((p, i) => (
          <Animated.View key={p.t} entering={FadeIn.delay(300 + i * 90).duration(420)} style={st.perk}>
            <View style={st.perkIcon}>
              <p.icon size={16} strokeWidth={2} color={colors.accent} />
            </View>
            <View style={{ flex: 1, gap: 1 }}>
              <Text variant="body">{p.t}</Text>
              <Text variant="label" tone="tertiary">{p.s}</Text>
            </View>
          </Animated.View>
        ))}
      </View>

      <View style={st.plans}>
        <PlanCard
          label="Annuel"
          price={annual?.product.priceString ?? FALLBACK.annual}
          note={`${(ANNUAL_EUR / 365).toFixed(2).replace('.', ',')} € par jour`}
          badge={`−${SAVING} %`}
          on={plan === 'annual'}
          onPress={() => { haptics.tick(); setPlan('annual'); }}
        />
        <PlanCard
          label="Mensuel"
          price={monthly?.product.priceString ?? FALLBACK.monthly}
          note="Sans engagement"
          on={plan === 'monthly'}
          onPress={() => { haptics.tick(); setPlan('monthly'); }}
        />
      </View>

      <Text variant="label" tone="tertiary" style={st.terms}>
        {plan === 'annual'
          ? `${annual?.product.priceString ?? FALLBACK.annual} par an, renouvelé automatiquement. Annule quand tu veux.`
          : `${monthly?.product.priceString ?? FALLBACK.monthly} par mois, renouvelé automatiquement. Annule quand tu veux.`}
      </Text>

      <Pressable
        onPress={() => { haptics.tap(); void restorePro(); }}
        style={st.restore}
      >
        <Text variant="label" tone="tertiary">
          {PURCHASES_ENABLED ? 'Restaurer mes achats' : 'Gratuit pendant la bêta'}
        </Text>
      </Pressable>
    </Screen>
  );
}

/** Un forfait. Le choix se voit au liseré et à la pastille, pas à la taille. */
function PlanCard({
  label, price, note, badge, on, onPress,
}: {
  label: string;
  price: string;
  note: string;
  badge?: string;
  on: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[st.plan, on && st.planOn]}
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
    >
      {on && (
        <LinearGradient
          colors={[withAlpha(colors.accent, 0.18), withAlpha(colors.accentWarm, 0.08)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}

      <View style={[st.tick, on && st.tickOn]}>
        {on && <Check size={13} strokeWidth={3} color={colors.night} />}
      </View>

      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="body">{label}</Text>
        <Text variant="label" tone="tertiary">{note}</Text>
      </View>

      <Text variant="title">{price}</Text>

      {badge && (
        <View style={st.badge}>
          <Text variant="label" color={colors.night}>{badge}</Text>
        </View>
      )}
    </Pressable>
  );
}

const st = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: space.lg },
  lockup: { width: 100, height: 38 },
  close: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth, borderColor: withAlpha(colors.mist, 0.18),
  },
  title: { textAlign: 'center' },
  chart: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    gap: space.sm, marginTop: space.xl,
  },
  col: { flex: 1, alignItems: 'center', gap: 6 },
  bar: { width: '100%', borderRadius: 10, overflow: 'hidden' },
  perks: { marginTop: space.xl, gap: space.md },
  perk: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  perkIcon: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: withAlpha(colors.accent, 0.12),
    borderWidth: StyleSheet.hairlineWidth, borderColor: withAlpha(colors.accent, 0.28),
  },
  plans: { marginTop: space.xl, gap: space.sm },
  plan: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    paddingHorizontal: space.lg, paddingVertical: 16,
    borderRadius: 20, overflow: 'hidden',
    borderWidth: 1, borderColor: withAlpha(colors.mist, 0.12),
    backgroundColor: withAlpha(colors.mist, 0.04),
  },
  planOn: { borderColor: withAlpha(colors.accent, 0.6) },
  tick: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: withAlpha(colors.mist, 0.26),
  },
  tickOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  badge: {
    position: 'absolute', top: -1, right: 74,
    paddingHorizontal: 8, paddingVertical: 3,
    borderBottomLeftRadius: 8, borderBottomRightRadius: 8,
    backgroundColor: colors.accent,
  },
  terms: { textAlign: 'center', marginTop: space.lg, lineHeight: 17 },
  restore: { alignSelf: 'center', marginTop: space.sm, paddingVertical: space.sm },
});
