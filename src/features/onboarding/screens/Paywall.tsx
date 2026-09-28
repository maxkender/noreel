import { useMemo, useEffect, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Bell, Check, CreditCard, Lock, Unlock, X } from 'lucide-react-native';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { space } from '@/theme/spacing';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/type/Text';
import { haptics } from '@/lib/haptics';
import { formatHours } from '@/lib/format';
import { useOnboardingStore } from '@/store/onboarding';
import { useProStore } from '@/store/pro';
import { PURCHASES_ENABLED, buy, currentOffering, redeemCode } from '@/services/purchases';
import { scheduleTrialReminder } from '@/services/trial';
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

// La croix n'apparait qu'apres dix secondes : le temps de lire ce qu'on
// propose. Elle finit TOUJOURS par venir — un paywall dont on ne sort pas
// est un piege, et l'App Store le refuse.
const EXIT_AFTER = 10000;

/*
 * Au-dela, on n'attend plus le magasin.
 *
 * getOfferings() n'a pas de delai maximum : sur un reseau lent, ou quand
 * RevenueCat n'a pas fini de se configurer, il peut ne jamais repondre. Le
 * bouton restait alors sur « Un instant… » pour toujours, a la derniere etape
 * du parcours — personne ne pouvait plus ni payer ni entrer dans l'app.
 *
 * Etre bloque est PIRE que vendre mal : passe ce delai, l'ecran fonctionne
 * avec ce qu'il a, et s'il n'a rien le bouton mene a l'app.
 */
const STORE_TIMEOUT = 6000;

/*
 * Les deux liens qu'Apple exige sur un ecran d'abonnement (3.1.2).
 *
 * Les deux textes vivent sur la meme page du studio, en deux onglets. Une
 * premiere lecture automatique n'avait vu que l'onglet ouvert par defaut et
 * m'avait fait croire les conditions absentes : elles sont bien la, verifie
 * en ouvrant le second onglet. On pointe donc sur les conditions DU STUDIO
 * plutot que sur l'EULA standard d'Apple.
 *
 * La page n'a qu'une adresse pour les deux onglets ; le libelle du lien dit
 * lequel chercher.
 */
const PRIVACY = 'https://vikstudios.com/unswipe';
const TERMS = 'https://vikstudios.com/unswipe';

/**
 * Le paywall.
 *
 * L'ordre repond aux trois questions qu'on se pose devant un prix, dans
 * l'ordre ou elles viennent : qu'est-ce que ca me coute de ne rien faire
 * (son propre chiffre, rappele en haut), qu'est-ce qui va m'etre preleve et
 * quand (la frise de l'essai, avant les prix), et qu'est-ce que j'achete (la
 * liste, apres). La liste etait en premier : elle repond a la question qu'on
 * se pose en DERNIER.
 *
 * Trois regles tenues : le prix est dit en entier, la croix est toujours la,
 * et toutes les sorties menent a l'app.
 */
export function Paywall(
  { onDone, exitDelay = EXIT_AFTER }: { onDone: () => void; exitDelay?: number }
) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const minutes = useOnboardingStore((x) => x.minutesPerDay);
  const [plan, setPlan] = useState<Plan>('annual');
  const [canExit, setCanExit] = useState(exitDelay === 0);
  const [winback, setWinback] = useState(false);

  useEffect(() => {
    if (exitDelay === 0) return;
    const t = setTimeout(() => setCanExit(true), exitDelay);
    return () => clearTimeout(t);
  }, [exitDelay]);
  const [packs, setPacks] = useState<PurchasesPackage[]>([]);
  const [busy, setBusy] = useState(false);
  /*
    Le magasin n'a pas encore repondu.

    Sans cet etat, appuyer sur le bouton pendant la seconde de chargement
    tombait dans la branche « aucun forfait » : le paywall se refermait en
    silence, sans rien acheter. Vu depuis un mur de blocage, ca donne un
    bouton « debloquer » qui ne debloque rien — le defaut le plus couteux
    possible, puisqu'il frappe au moment ou quelqu'un voulait payer.
  */
  const [loading, setLoading] = useState(PURCHASES_ENABLED);
  const setPro = useProStore((x) => x.setPro);
  const restorePro = useProStore((x) => x.restore);

  useEffect(() => {
    if (!PURCHASES_ENABLED) return;
    let alive = true;
    // Le compte a rebours court en PARALLELE de la requete, et non apres :
    // c'est lui qui garantit que l'attente finit, quoi que fasse le magasin.
    const bell = setTimeout(() => { if (alive) setLoading(false); }, STORE_TIMEOUT);
    void currentOffering()
      .then((o) => { if (alive && o) setPacks(o.availablePackages); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; clearTimeout(bell); };
  }, []);

  // On vise le forfait par son identifiant, jamais par sa position :
  // l'ordre se change au tableau de bord sans prevenir.
  const find = (k: string) => packs.find((x) => x.identifier === k);
  const annual = find('$rc_annual');
  const weekly = find('$rc_weekly');
  const chosen = plan === 'annual' ? annual : weekly;
  const price = (p?: PurchasesPackage, f?: string) => p?.product.priceString ?? f ?? '';

  // Son temps a lui, en jours pleins par an. C'est le seul chiffre de cet
  // ecran qu'il a donne lui-meme, et c'est pour ca qu'il porte.
  const daysLost = Math.round((minutes * 365) / 60 / 24);

  const go = async () => {
    // Le magasin repond encore : on attend plutot que de refermer l'ecran
    // sans rien vendre. C'est borne par STORE_TIMEOUT.
    if (loading) return;
    /*
      Rien a vendre : le bouton mene a l'app.
      Soit aucune boutique n'est configuree (mode beta), soit elle n'a rendu
      aucun forfait. Dans les deux cas on ne PEUT pas encaisser, et un bouton
      desactive a la derniere etape du parcours enfermerait la personne
      dehors.
    */
    if (!PURCHASES_ENABLED || !chosen) { onDone(); return; }
    setBusy(true);
    const r = await buy(chosen);
    setBusy(false);
    if (r === 'bought') {
      setPro(true);
      // La frise promet « jour 2 : on te previent ». C'est ici qu'on tient la
      // promesse, et seulement sur le forfait qui a un essai.
      if (plan === 'annual') void scheduleTrialReminder();
      onDone();
      return;
    }
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

  /*
    Le code promo vit ICI, et non sur son propre ecran juste avant.
    Demander « tu as un code ? » avant d'avoir montre le prix apprend a
    chercher un code : on quitte l'app, on fouille, on ne revient pas. Apres
    le prix, c'est un lien pour ceux qui en ont un — et un ecran de moins
    entre la promesse et la decision.
  */
  const promo = async () => {
    haptics.tap();
    await redeemCode();
    // La feuille d'Apple ne dit pas ce qu'elle a fait : c'est le statut
    // d'abonnement qui tranche, et il arrive par son propre canal.
    await useProStore.getState().refresh();
  };

  return (
    <Screen
      // Le libelle ne parle pas de prix : il nomme ce qu'on vient chercher.
      cta={
        busy || loading
          ? 'Un instant…'
          // Sans forfait a vendre, le libelle ne promet pas un achat.
          : chosen || !PURCHASES_ENABLED
            ? 'Reprendre contrôle de mon temps'
            : 'Continuer'
      }
      onPress={() => { void go(); }}
      disabled={busy || loading}
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

      {/*
        Sans prenom ici : l'ecran juste avant en porte un, et deux ecrans de
        suite qui vous appellent par votre nom cessent d'etre attentionnes
        pour devenir insistants. On le garde a deux moments dans tout le
        parcours — la rencontre, ou l'on vient de le donner, et la promesse
        chiffree, ou il engage.
      */}
      <Text variant="displayM" style={st.center}>
        Reprends <Text variant="displayM" color={c.accent}>le contrôle</Text>
        {' de ton temps.'}
      </Text>
      <Text variant="lead" tone="secondary" style={[st.center, st.sub]}>
        Sans perdre contact.
      </Text>

      {/* Son chiffre, rappele une fois. Il n'est pas la pour convaincre mais
          pour rappeler ce que coute le statu quo, juste avant de lire un prix. */}
      {minutes > 0 && (
        <Animated.View entering={FadeIn.delay(100).duration(480)} style={st.wound}>
          <Text variant="label" color={c.ember}>
            {formatHours(minutes)} par jour · {daysLost} jours par an
          </Text>
        </Animated.View>
      )}

      <Trial plan={plan} />

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

      <Text variant="label" tone="tertiary" style={st.terms}>
        {plan === 'annual'
          ? `${TRIAL_DAYS} jours gratuits, puis ${price(annual, FALLBACK.annual)} par an, renouvelé automatiquement.`
          : `${price(weekly, FALLBACK.weekly)} par semaine, renouvelé automatiquement.`}
        {' Annule quand tu veux.'}
      </Text>

      {/* Ce qui rassure vraiment n'est pas une promesse mais un fait
          verifiable : c'est Apple qui encaisse, et c'est Apple qui annule. */}
      <View style={st.trust}>
        <Lock size={12} strokeWidth={2.4} color={withAlpha(c.mist, c.textTertiary)} />
        <Text variant="label" tone="tertiary">
          Paiement par Apple · Annulation en deux taps
        </Text>
      </View>

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

      <View style={st.tail}>
        <Pressable onPress={() => { haptics.tap(); void restorePro(); }} hitSlop={8}>
          <Text variant="label" tone="tertiary">
            {PURCHASES_ENABLED ? 'Restaurer mes achats' : 'Gratuit pendant la bêta'}
          </Text>
        </Pressable>
        {PURCHASES_ENABLED && Platform.OS === 'ios' && (
          <>
            <Text variant="label" tone="tertiary">·</Text>
            <Pressable onPress={() => { void promo(); }} hitSlop={8}>
              <Text variant="label" tone="tertiary">J’ai un code</Text>
            </Pressable>
          </>
        )}
      </View>
    </Screen>
  );
}

/**
 * La frise de l'essai : ce qui sera preleve, et quand.
 *
 * Elle est AVANT les prix, parce que « quand est-ce qu'on me prend de
 * l'argent » est la question qui bloque la main au-dessus du bouton. La dire
 * avant le prix desarme la question ; la dire apres, en petit, la laisse
 * entiere.
 *
 * Elle sert aussi de banniere : son titre porte le « essai gratuit sur
 * l'annuel », plutot qu'un bandeau de plus qui redirait la meme chose deux
 * centimetres au-dessus.
 */
function Trial({ plan }: { plan: Plan }) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);

  // L'hebdomadaire n'a pas d'essai. Le taire serait laisser croire qu'il en a
  // un, et le prelevement se decouvrirait le jour meme.
  if (plan === 'weekly') {
    return (
      <View style={[st.trial, st.trialFlat]}>
        <Text variant="label" color={c.ember}>Hebdomadaire · sans essai gratuit</Text>
        <Text variant="body" tone="secondary" style={{ marginTop: space.sm }}>
          Prélevé aujourd’hui, puis chaque semaine. Annulable à tout moment,
          sans frais.
        </Text>
      </View>
    );
  }

  const steps: [typeof Bell, string, string, boolean][] = [
    [Unlock, 'Aujourd’hui', 'Tout se débloque. Tu ne paies rien.', true],
    [Bell, 'Jour 2', 'On te prévient : il te reste 24 h.', true],
    [CreditCard, `Jour ${TRIAL_DAYS}`, 'L’abonnement commence, sauf si tu as annulé.', false],
  ];

  return (
    <View style={st.trial}>
      <LinearGradient
        colors={[withAlpha(c.accent, 0.14), withAlpha(c.accentWarm, 0.04)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Text variant="label" color={c.accent}>
        {TRIAL_DAYS} jours d’essai gratuit sur l’annuel
      </Text>

      <View style={st.steps}>
        {steps.map(([Icon, when, what, lit], i) => (
          <View key={when} style={st.step}>
            {/* Le fil relie les pastilles : sans lui, trois lignes empilees ne
                se lisent pas comme un calendrier. */}
            <View style={st.rail}>
              <View style={[st.bullet, lit && st.bulletOn]}>
                <Icon
                  size={12}
                  strokeWidth={2.4}
                  color={lit ? c.accent : withAlpha(c.mist, c.textTertiary)}
                />
              </View>
              {i < steps.length - 1 && <View style={st.wire} />}
            </View>
            <View style={st.stepText}>
              <Text variant="button">{when}</Text>
              <Text variant="body" tone="secondary">{what}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
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
        <View style={st.planTop}>
          <Text variant="body">{label}</Text>
          {/*
            La remise est posee DANS la ligne, a cote du nom.
            Elle etait placee en absolu a 74 points du bord droit — une mesure
            calee sur la largeur de « 44,99 € » qui aurait chevauche le prix
            des la premiere devise plus longue, et il y en a 174 autres.
          */}
          {badge && (
            <View style={st.badge}>
              <Text variant="label" color={c.night}>{badge}</Text>
            </View>
          )}
        </View>
        <Text variant="label" tone="tertiary">{note}</Text>
      </View>

      <Text variant="title">{price}</Text>
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
  center: { textAlign: 'center' },
  sub: { marginTop: space.md },
  wound: {
    alignSelf: 'center', marginTop: space.lg,
    paddingHorizontal: space.md, paddingVertical: 6, borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth, borderColor: withAlpha(c.ember, 0.4),
    backgroundColor: withAlpha(c.ember, 0.1),
  },
  trial: {
    marginTop: space.xl, borderRadius: 22, overflow: 'hidden',
    paddingHorizontal: space.lg, paddingVertical: space.lg,
    borderWidth: StyleSheet.hairlineWidth, borderColor: withAlpha(c.accent, 0.4),
  },
  trialFlat: { borderColor: withAlpha(c.ember, 0.4) },
  steps: { marginTop: space.md },
  step: { flexDirection: 'row', gap: space.md },
  rail: { alignItems: 'center', width: 22 },
  bullet: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: withAlpha(c.mist, 0.2),
  },
  bulletOn: { borderColor: withAlpha(c.accent, 0.65), backgroundColor: withAlpha(c.accent, 0.12) },
  wire: { flex: 1, width: 1.5, backgroundColor: withAlpha(c.accent, 0.28) },
  stepText: { flex: 1, paddingBottom: space.md, gap: 1 },
  list: { marginTop: space.xl, gap: space.md },
  line: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  plans: { marginTop: space.lg, gap: space.sm },
  plan: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    paddingHorizontal: space.lg, paddingVertical: 16,
    borderRadius: 20, overflow: 'hidden',
    borderWidth: 1, borderColor: withAlpha(c.mist, 0.12),
  },
  planOn: { borderColor: withAlpha(c.accent, 0.6) },
  planTop: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  tick: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: withAlpha(c.mist, 0.26),
  },
  tickOn: { backgroundColor: c.accent, borderColor: c.accent },
  badge: {
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7,
    backgroundColor: c.accent,
  },
  terms: { textAlign: 'center', marginTop: space.lg, lineHeight: 17 },
  trust: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 6, marginTop: space.md,
  },
  legal: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: space.sm, marginTop: space.md,
  },
  tail: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: space.sm, marginTop: space.md, paddingVertical: space.sm,
  },
});
