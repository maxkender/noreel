import { useMemo, useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Check, X } from 'lucide-react-native';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { space } from '@/theme/spacing';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/type/Text';
import { haptics } from '@/lib/haptics';
import { useOnboardingStore } from '@/store/onboarding';
import { useProStore } from '@/store/pro';
import { PURCHASES_ENABLED, buy, currentOffering } from '@/services/purchases';
import { WinBack, markWinbackSeen, winbackSeen } from './WinBack';
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

/**
 * Ce qu'on obtient — et rien sur ce qu'on n'a pas.
 *
 * Il y avait ici un tableau a deux colonnes, gratuit contre payant, avec une
 * croix sur chaque ligne refusee. On vendait donc d'abord un manque : l'oeil
 * compte les croix avant de lire les titres. Une liste ne dit que ce qu'on
 * recoit.
 */
const ROWS = [
  'TikTok, X et YouTube, filtrés comme Instagram',
  'Réglages app par app, appliqués tout de suite',
  'Blocage des apps d’origine, avec mode strict',
  'Ton temps mesuré, jour après jour',
];

// La croix n'apparait qu'apres cinq secondes : le temps de lire ce qu'on
// propose. Elle finit TOUJOURS par venir — un paywall dont on ne sort pas
// est un piege, et l'App Store le refuse.
const EXIT_AFTER = 7000;

/*
 * Les deux liens qu'Apple exige sur un ecran d'abonnement (3.1.2).
 *
 * La confidentialite pointe sur la page du studio. Les conditions pointent
 * sur l'EULA STANDARD d'Apple : la page du studio annonce des conditions
 * qu'elle ne contient pas, et un lien qui promet un texte absent vaut moins
 * que pas de lien — c'est justement ce que le relecteur ouvre. L'EULA
 * standard est la solution prevue par Apple quand on n'a pas la sienne.
 */
const PRIVACY = 'https://vikstudios.com/unswipe';
const TERMS = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

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
  const [canExit, setCanExit] = useState(false);
  const [winback, setWinback] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setCanExit(true), EXIT_AFTER);
    return () => clearTimeout(t);
  }, []);
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
    /*
      Renoncement : l'offre de rattrapage, UNE fois dans la vie de l'app.
      Refermer la feuille d'Apple est le moment ou le prix vient d'etre juge
      trop cher — c'est la, ou nulle part. Le fait de l'avoir montree est
      garde sur le disque et non dans l'etat de l'ecran : sinon elle
      revenait a chaque reouverture du paywall, et une remise qu'on peut
      faire revenir apprend surtout a attendre le rabais.
    */
    if (r === 'cancelled') {
      if (!winbackSeen()) { markWinbackSeen(); setWinback(true); }
      return;
    }
    onDone();                        // un echec ne doit pas l'enfermer ici
  };

  return (
    <Screen
      // L'essai n'existe que sur l'annuel : promettre « gratuit » sur
      // l'hebdomadaire serait faux, et Apple facturerait aussitot.
      cta={busy ? 'Un instant…' : 'Reprendre contrôle de mon temps'}
      onPress={() => { void go(); }}
      disabled={busy}
      hue="warm"
    >
      <View style={st.head}>
        <Image source={LOCKUP} style={st.lockup} contentFit="contain" />
        <View style={{ flex: 1 }} />
        {canExit && (
          <Animated.View entering={FadeIn.duration(420)}>
            <Pressable onPress={() => { haptics.tap(); onDone(); }} hitSlop={16} style={st.close}>
              <X size={19} strokeWidth={2.2} color={withAlpha(c.mist, 0.55)} />
            </Pressable>
          </Animated.View>
        )}
      </View>

      <Text variant="displayM" style={st.title}>
        {name ? `${name}, reprends ` : 'Reprends '}
        <Text variant="displayM" color={c.accent}>le contrôle</Text>
        {' de ton temps.'}
      </Text>
      <Text variant="lead" tone="secondary" style={[st.title, st.sub]}>
        Reprends enfin contrôle de ton temps. Sans perdre contact.
      </Text>

      {/* La banniere ne parle que de l'annuel : c'est le seul forfait qui
          porte l'essai, et laisser croire le contraire ferait decouvrir le
          prelevement le jour meme. */}
      <Animated.View entering={FadeIn.delay(120).duration(420)} style={st.banner}>
        <LinearGradient
          colors={[withAlpha(c.accent, 0.3), withAlpha(c.accentWarm, 0.18)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Text variant="button" numberOfLines={1} adjustsFontSizeToFit>
          {TRIAL_DAYS} jours d’essai gratuit sur l’annuel
        </Text>
      </Animated.View>

      <Animated.View entering={FadeIn.delay(160).duration(480)} style={st.list}>
        {ROWS.map((label, i) => (
          <Animated.View
            key={label}
            entering={FadeIn.delay(260 + i * 90).duration(420)}
            style={st.line}
          >
            <Check size={15} strokeWidth={3} color={c.accent} />
            <Text variant="body" style={{ flex: 1 }}>{label}</Text>
          </Animated.View>
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
          note="Sans essai gratuit. Sans engagement."
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

      <View style={st.legal}>
        <Pressable onPress={() => { haptics.tap(); void Linking.openURL(TERMS); }} hitSlop={8}>
          <Text variant="label" tone="tertiary">Conditions d’utilisation</Text>
        </Pressable>
        <Text variant="label" tone="tertiary">·</Text>
        <Pressable onPress={() => { haptics.tap(); void Linking.openURL(PRIVACY); }} hitSlop={8}>
          <Text variant="label" tone="tertiary">Confidentialité</Text>
        </Pressable>
      </View>

      <WinBack visible={winback} onClose={() => setWinback(false)} />

      <Pressable onPress={() => { haptics.tap(); void restorePro(); }} style={st.restore}>
        <Text variant="label" tone="tertiary">
          {PURCHASES_ENABLED ? 'Restaurer mes achats' : 'Gratuit pendant la bêta'}
        </Text>
      </Pressable>
    </Screen>
  );
}

/** Une case : coche, tiret, ou une valeur courte. */
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
  banner: {
    marginTop: space.xl, height: 46, borderRadius: 23, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg,
    borderWidth: StyleSheet.hairlineWidth, borderColor: withAlpha(c.accent, 0.4),
  },
  list: { marginTop: space.xl, gap: space.md },
  line: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  title: { textAlign: 'center' },
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
  legal: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: space.sm, marginTop: space.md,
  },
  restore: { alignSelf: 'center', marginTop: space.sm, paddingVertical: space.sm },
});
