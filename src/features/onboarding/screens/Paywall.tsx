import { useMemo, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Check, Minus, X } from 'lucide-react-native';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { space } from '@/theme/spacing';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/type/Text';
import { haptics } from '@/lib/haptics';
import { useOnboardingStore } from '@/store/onboarding';
import { useProStore } from '@/store/pro';
import { PURCHASES_ENABLED, buy, currentOffering } from '@/services/purchases';
import type { PurchasesPackage } from 'react-native-purchases';

const LOCKUP = require('@/assets/brand/lockup.png');

type Plan = 'annual' | 'weekly';

// Prix de secours, affiches tant que le magasin n'a pas repondu. Ils
// doivent coller a ceux d'App Store Connect, sinon l'ecran ment pendant la
// seconde de chargement.
const FALLBACK = { annual: '44,99 €', weekly: '4,99 €' };
// L'essai n'existe que sur l'annuel, et il est porte par App Store Connect :
// c'est Apple qui l'applique a l'achat, pas nous. On l'ANNONCE ici, on ne le
// fabrique pas — l'annoncer sans qu'il existe cote magasin serait mentir.
const TRIAL_DAYS = 3;
const ANNUAL_EUR = 44.99;
const WEEKLY_EUR = 4.99;
// 52 semaines, pas 12 mois : c'est la comparaison honnete face a un
// hebdomadaire, et c'est elle qui rend l'annuel evident.
const SAVING = Math.round((1 - ANNUAL_EUR / (WEEKLY_EUR * 52)) * 100);

/** Ce que chaque cote donne. `free` a null quand la ligne est refusee. */
const ROWS: { label: string; free: string | null; pro: string | null }[] = [
  { label: 'Instagram sans Reels', free: '', pro: '' },
  { label: 'TikTok, X et YouTube filtrés', free: null, pro: '' },
  { label: 'Blocage des apps d’origine', free: null, pro: '' },
  { label: 'Règles horaires', free: null, pro: '' },
  { label: 'Réglages app par app', free: null, pro: '' },
  { label: 'Historique', free: '7 j', pro: 'Illimité' },
];

const COL = 74;

/**
 * Le paywall.
 *
 * Epure : un titre, un tableau, deux forfaits. Pas de graphe ni de liste a
 * puces — le tableau dit la meme chose et se lit d'un coup d'oeil. Trois
 * regles tenues : le prix est dit en entier, la croix est toujours la, et
 * les deux sorties menent a l'app.
 */
export function Paywall({ onDone }: { onDone: () => void }) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
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
  const weekly = find('$rc_weekly');
  const chosen = plan === 'annual' ? annual : weekly;
  const price = (p?: PurchasesPackage, f?: string) => p?.product.priceString ?? f ?? '';

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
      // L'essai n'existe que sur l'annuel : promettre « gratuit » sur
      // l'hebdomadaire serait faux, et Apple facturerait aussitot.
      cta={busy ? 'Un instant…' : plan === 'annual'
        ? `Commencer mes ${TRIAL_DAYS} jours gratuits`
        : 'Continuer'}
      onPress={() => { void go(); }}
      disabled={busy}
      secondary="Plus tard"
      onSecondary={onDone}
      hue="warm"
    >
      <View style={st.head}>
        <Image source={LOCKUP} style={st.lockup} contentFit="contain" />
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => { haptics.tap(); onDone(); }} hitSlop={16} style={st.close}>
          <X size={19} strokeWidth={2.2} color={withAlpha(c.mist, 0.55)} />
        </Pressable>
      </View>

      <Text variant="displayM" style={st.title}>
        {name ? `${name}, essaie ` : 'Essaie '}
        <Text variant="displayM" color={c.accent}>{TRIAL_DAYS} jours</Text>
        {' gratuitement.'}
      </Text>
      <Text variant="lead" tone="secondary" style={[st.title, st.sub]}>
        Tout est débloqué tout de suite. Tu ne paies rien avant la fin des
        {` ${TRIAL_DAYS} jours, et tu peux arrêter avant.`}
      </Text>

      <Animated.View entering={FadeIn.delay(160).duration(480)} style={st.table}>
        {/* La colonne Pro est une bande continue, posee sous les lignes :
            c'est elle qui porte le regard jusqu'en bas. */}
        <LinearGradient
          colors={[withAlpha(c.accent, 0.16), withAlpha(c.accentWarm, 0.06)]}
          style={st.proBand}
          pointerEvents="none"
        />

        <View style={st.row}>
          <View style={{ flex: 1 }} />
          <Text variant="label" tone="tertiary" style={st.cell}>SANS</Text>
          <Text variant="label" color={c.accent} style={st.cell}>AVEC</Text>
        </View>

        {ROWS.map((r, i) => (
          <View key={r.label} style={[st.row, i > 0 && st.line]}>
            <Text variant="body" style={{ flex: 1 }} numberOfLines={2}>{r.label}</Text>
            <View style={st.cell}><Mark value={r.free} /></View>
            <View style={st.cell}><Mark value={r.pro} pro /></View>
          </View>
        ))}
      </Animated.View>

      <View style={st.plans}>
        <PlanCard
          label="Annuel"
          price={price(annual, FALLBACK.annual)}
          note={`${TRIAL_DAYS} jours offerts, puis ${(ANNUAL_EUR / 365).toFixed(2).replace('.', ',')} € par jour`}
          badge={`−${SAVING} %`}
          on={plan === 'annual'}
          onPress={() => { haptics.tick(); setPlan('annual'); }}
        />
        <PlanCard
          label="Hebdomadaire"
          price={price(weekly, FALLBACK.weekly)}
          note="Sans engagement, annule quand tu veux"
          on={plan === 'weekly'}
          onPress={() => { haptics.tick(); setPlan('weekly'); }}
        />
      </View>

      <Text variant="label" tone="tertiary" style={st.terms}>
        {plan === 'annual'
          ? `${TRIAL_DAYS} jours gratuits, puis ${price(annual, FALLBACK.annual)} par an, renouvelé automatiquement.`
          : `${price(weekly, FALLBACK.weekly)} par semaine, renouvelé automatiquement.`}
        {' Annule quand tu veux.'}
      </Text>

      <Pressable onPress={() => { haptics.tap(); void restorePro(); }} style={st.restore}>
        <Text variant="label" tone="tertiary">
          {PURCHASES_ENABLED ? 'Restaurer mes achats' : 'Gratuit pendant la bêta'}
        </Text>
      </Pressable>
    </Screen>
  );
}

/** Une case : coche, tiret, ou une valeur courte. */
function Mark({ value, pro }: { value: string | null; pro?: boolean }) {
  const c = useColors();
  if (value === null) {
    return <Minus size={15} strokeWidth={2.4} color={withAlpha(c.mist, 0.22)} />;
  }
  if (value === '') {
    return (
      <Check
        size={16}
        strokeWidth={2.8}
        color={pro ? c.accent : withAlpha(c.mist, 0.45)}
      />
    );
  }
  return (
    <Text variant="label" color={pro ? c.accent : withAlpha(c.mist, 0.45)}>
      {value}
    </Text>
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
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  return (
    <Pressable
      onPress={onPress}
      style={[st.plan, on && st.planOn]}
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
    >
      {on && (
        <LinearGradient
          colors={[withAlpha(c.accent, 0.16), withAlpha(c.accentWarm, 0.06)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}

      <View style={[st.tick, on && st.tickOn]}>
        {on && <Check size={13} strokeWidth={3} color={c.night} />}
      </View>

      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="body">{label}</Text>
        <Text variant="label" tone="tertiary">{note}</Text>
      </View>

      <Text variant="title">{price}</Text>

      {badge && (
        <View style={st.badge}>
          <Text variant="label" color={c.night}>{badge}</Text>
        </View>
      )}
    </Pressable>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: space.xl },
  lockup: { width: 100, height: 38 },
  close: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth, borderColor: withAlpha(c.mist, 0.18),
  },
  sub: { marginTop: space.md },
  title: { textAlign: 'center' },

  table: {
    marginTop: space.xxl, borderRadius: 22, overflow: 'hidden',
    paddingHorizontal: space.lg,
    borderWidth: StyleSheet.hairlineWidth, borderColor: withAlpha(c.mist, 0.14),
    backgroundColor: withAlpha(c.mist, 0.03),
  },
  proBand: { position: 'absolute', top: 0, bottom: 0, right: 0, width: COL + space.lg },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13 },
  line: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: withAlpha(c.mist, 0.1) },
  cell: { width: COL, alignItems: 'center', textAlign: 'center' },

  plans: { marginTop: space.xl, gap: space.sm },
  plan: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    paddingHorizontal: space.lg, paddingVertical: 16,
    borderRadius: 20, overflow: 'hidden',
    borderWidth: 1, borderColor: withAlpha(c.mist, 0.12),
  },
  planOn: { borderColor: withAlpha(c.accent, 0.6) },
  tick: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: withAlpha(c.mist, 0.26),
  },
  tickOn: { backgroundColor: c.accent, borderColor: c.accent },
  badge: {
    position: 'absolute', top: -1, right: 74,
    paddingHorizontal: 8, paddingVertical: 3,
    borderBottomLeftRadius: 8, borderBottomRightRadius: 8,
    backgroundColor: c.accent,
  },
  terms: { textAlign: 'center', marginTop: space.lg, lineHeight: 17 },
  restore: { alignSelf: 'center', marginTop: space.sm, paddingVertical: space.sm },
});
