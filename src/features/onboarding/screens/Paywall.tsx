import { useMemo, useEffect, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ArrowRight, X } from 'lucide-react-native';
import { CortiRig } from '@/components/CortiRig';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { space } from '@/theme/spacing';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/type/Text';
import { haptics } from '@/lib/haptics';
import { formatHours } from '@/lib/format';
import { useT } from '@/i18n';
import { effectiveMinutes, useOnboardingStore } from '@/store/onboarding';
import { useProStore } from '@/store/pro';
import {
  PURCHASES_ENABLED, appUserId, buy, currentOffering, redeemCode,
} from '@/services/purchases';
import { scheduleTrialReminder } from '@/services/trial';
import { WinBack, markWinbackSeen, winbackSeen } from './WinBack';
import type { PurchasesPackage } from 'react-native-purchases';

type Plan = 'annual' | 'weekly';

// Prix de secours, affiches tant que le magasin n'a pas repondu. Ils
// doivent coller a ceux d'App Store Connect, sinon l'ecran ment pendant la
// seconde de chargement.
const FALLBACK = { annual: '49,99 €', weekly: '4,99 €' };
// L'essai n'existe que sur l'annuel, et il est porte par App Store Connect :
// c'est Apple qui l'applique a l'achat, pas nous. On l'ANNONCE ici, on ne le
// fabrique pas — l'annoncer sans qu'il existe cote magasin serait mentir.
const TRIAL_DAYS = 3;
// Le prix reel du magasin, releve au tableau de bord : la valeur de
// secours servait 44,99 alors que la fiche dit 49,99, et c'est elle qu'on
// affiche tant que le magasin ne repond pas.
const ANNUAL_EUR = 49.99;

/**
 * Le montant d'un forfait, en nombre.
 *
 * On le tire du LIBELLE du magasin quand il y en a un, et non de la constante
 * de secours : le prix change d'un pays a l'autre, et une mensualite calculee
 * sur un prix francais affichee sous un prix canadien serait fausse pour tout
 * le monde sauf nous.
 */
function euros(p: PurchasesPackage | undefined, fallback: number): number {
  const n = p?.product.price;
  return typeof n === 'number' && n > 0 ? n : fallback;
}

/** Deux decimales, virgule francaise, symbole du magasin quand on l'a. */
function money(n: number, symbol = '€'): string {
  return `${n.toFixed(2).replace('.', ',')} ${symbol}`;
}
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

// La croix n'apparait qu'apres dix secondes : le temps de lire ce qu'on
// propose. Elle finit TOUJOURS par venir — un paywall dont on ne sort pas
// est un piege, et l'App Store le refuse.
// Sept secondes : le temps de lire le titre et le prix, pas celui de douter.
const EXIT_AFTER = 7000;

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
  const { d, t } = useT();
  const minutes = useOnboardingStore(effectiveMinutes);
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
  // Le magasin n'a rien rendu : constate au premier appui, dit au second.
  const [storeDown, setStoreDown] = useState(false);
  const [fail, setFail] = useState<string | null>(null);
  const [who, setWho] = useState<string | null>(null);
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
      .then((r) => {
        if (!alive) return;
        if (r.offering) setPacks(r.offering.availablePackages);
        // La RAISON est gardee : c'est elle qu'on affiche si le bouton ne
        // peut rien vendre, au lieu d'un « ca ne marche pas » sans suite.
        setFail(r.fail);
        if (r.fail) void appUserId().then((u) => { if (alive) setWho(u); });
      })
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
    /*
      Rien a vendre. On le DIT, on ne referme pas.

      Le bouton menait droit a l'accueil : vu de l'exterieur, « Continuer »
      ne faisait rien — pas de feuille de paiement, pas de message, juste la
      page d'accueil. Impossible de distinguer un bug d'un refus, et c'est le
      seul ecran de l'app ou une seconde de doute coute un abonnement.

      La cause est rarement dans le code : un produit encore en revue chez
      Apple n'est pas servi par StoreKit, donc l'offre revient vide. Le dire
      permet au moins de savoir qu'il faut regarder la-bas.

      La sortie reste ouverte — la croix est la, et le second appui passe.
    */
    if (!PURCHASES_ENABLED || !chosen) {
      if (!storeDown) { setStoreDown(true); haptics.stop(); return; }
      onDone();
      return;
    }
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
      /*
        Un fond a lui, et pas de poussiere lumineuse.
        Le degrade violet-bleu dit qu'on a change de piece ; les points qui
        flottaient en fond passaient derriere les forfaits.
      */
      backdrop={
        <LinearGradient
          colors={['#2A1E63', '#151A46', '#0A0C1C']}
          locations={[0, 0.45, 1]}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      }
      stars={false}
      cta={
        busy || loading
          ? d.pay.wait
          : storeDown
            ? d.pay.storeSkip
            : d.pay.cta
      }
      note={
        !storeDown ? (
          /*
            Sous le bouton, en tout petit : « annule quand tu veux » et les
            quatre liens. Le prix, lui, est juste AU-DESSUS du bouton, la ou
            l'oeil est quand la main se pose.
          */
          <View style={st.foot}>
            <Text style={[st.tiny, { color: withAlpha(c.mist, 0.55) }]}>{d.pay.cancelAny}</Text>
            <View style={st.legal}>
              <Pressable onPress={() => { haptics.tap(); void Linking.openURL(TERMS); }} hitSlop={8}>
                <Text style={[st.tiny, { color: withAlpha(c.mist, 0.42) }]}>{d.pay.terms}</Text>
              </Pressable>
              <Text style={[st.tiny, { color: withAlpha(c.mist, 0.42) }]}>·</Text>
              <Pressable onPress={() => { haptics.tap(); void Linking.openURL(PRIVACY); }} hitSlop={8}>
                <Text style={[st.tiny, { color: withAlpha(c.mist, 0.42) }]}>{d.pay.privacy}</Text>
              </Pressable>
              <Text style={[st.tiny, { color: withAlpha(c.mist, 0.42) }]}>·</Text>
              <Pressable onPress={() => { haptics.tap(); void restorePro(); }} hitSlop={8}>
                <Text style={[st.tiny, { color: withAlpha(c.mist, 0.42) }]}>{PURCHASES_ENABLED ? d.pay.restore : d.pay.beta}</Text>
              </Pressable>
              {PURCHASES_ENABLED && Platform.OS === 'ios' && (
                <>
                  <Text style={[st.tiny, { color: withAlpha(c.mist, 0.42) }]}>·</Text>
                  <Pressable onPress={() => { void promo(); }} hitSlop={8}>
                    <Text style={[st.tiny, { color: withAlpha(c.mist, 0.42) }]}>{d.pay.promo}</Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        ) : (
          <Animated.View entering={FadeIn.duration(320)}>
            <Text variant="label" color={c.ember} style={st.center}>
              {d.pay.storeDown}
            </Text>
            {fail && (
              <Text variant="label" tone="tertiary" style={st.center}>{fail}</Text>
            )}
            {who && (
              <Text variant="label" tone="tertiary" style={st.center}>{who}</Text>
            )}
          </Animated.View>
        )
      }
      onPress={() => { void go(); }}
      disabled={busy || loading}
      hue="warm"
    >
      {/* La croix seule, en haut a droite, apres sept secondes. */}
      <View style={st.head}>
        {canExit && (
          <Animated.View entering={FadeIn.duration(420)}>
            <Pressable onPress={() => { haptics.tap(); onDone(); }} hitSlop={16} style={st.close} accessibilityRole="button" accessibilityLabel={d.misc.close} testID="paywall-close">
              <X size={19} strokeWidth={2.2} color={withAlpha(c.mist, 0.55)} />
            </Pressable>
          </Animated.View>
        )}
      </View>

      {/* Corti en haut, petit, comme la mascotte de reference : un visage,
          pas une scene. */}
      <Animated.View entering={FadeIn.duration(500)} style={st.mascot}>
        <CortiRig level={3} size={112} expression="ravi" />
      </Animated.View>

      <Text variant="displayM" style={st.center}>
        {t(d.pay.title, { accent: '\u0000' }).split('\u0000')[0]}
        <Text variant="displayM" color={c.accent}>{d.pay.titleAccent}</Text>
        {t(d.pay.title, { accent: '\u0000' }).split('\u0000')[1]}
      </Text>
      <Text variant="lead" tone="secondary" style={[st.center, st.sub]}>
        {d.pay.sub}
      </Text>

      {/* Son chiffre, et la cible : la moitie, sur SON temps a lui. */}
      {minutes > 0 && <Goal minutes={minutes} />}

      {/* Deux lignes, le prix a la semaine des deux cotes : on compare d'un
          coup d'oeil, et l'annuel se choisit tout seul. */}
      <View style={st.plans}>
        <PlanRow
          label={d.pay.annual}
          price={t(d.pay.perWeek, { p: money(euros(annual, ANNUAL_EUR) / 52) })}
          badge={`−${SAVING} %`}
          on={plan === 'annual'}
          onPress={() => { haptics.tick(); setPlan('annual'); }}
        />
        <PlanRow
          label={d.pay.weekly}
          price={t(d.pay.perWeek, { p: price(weekly, FALLBACK.weekly) })}
          on={plan === 'weekly'}
          onPress={() => { haptics.tick(); setPlan('weekly'); }}
        />
      </View>

      {/* Ce qui sera preleve, en une ligne, juste au-dessus du bouton — et
          c'est le SEUL endroit ou l'essai est ecrit. */}
      <Text style={[st.billed, { color: withAlpha(c.mist, 0.6) }]}>
        {plan === 'annual'
          ? t(d.pay.priceLine, { n: TRIAL_DAYS, y: price(annual, FALLBACK.annual) })
          : t(d.pay.priceWeek, { p: price(weekly, FALLBACK.weekly) })}
      </Text>

      <WinBack visible={winback} onClose={() => { setWinback(false); onDone(); }} />
    </Screen>
  );
}

/**
 * Aujourd'hui, et l'objectif : deux barres, la seconde moitie moins haute.
 *
 * Son temps d'aujourd'hui, et la moitie, en heures. La cible est la moitie
 * de SON chiffre, arrondie au quart d'heure, jamais une moyenne. Pas de
 * phrase dessous : les deux chiffres se lisent seuls.
 */
function Goal({ minutes }: { minutes: number }) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const { d } = useT();
  const target = Math.max(15, Math.round(minutes / 2 / 15) * 15);
  return (
    <Animated.View entering={FadeIn.delay(100).duration(480)} style={st.goal}>
      <View style={st.goalRow}>
        <GoalBar label={d.pay.today} value={formatHours(minutes)} h={1} tone={c.danger} />
        <ArrowRight size={18} strokeWidth={2.4} color={withAlpha(c.mist, 0.5)} style={{ marginBottom: 30 }} />
        <GoalBar label={d.pay.goal} value={formatHours(target)} h={target / Math.max(minutes, 1)} tone={c.accent} />
      </View>
    </Animated.View>
  );
}

function GoalBar({
  label, value, h, tone,
}: { label: string; value: string; h: number; tone: string }) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  return (
    <View style={st.goalCol}>
      <Text variant="button" color={tone}>{value}</Text>
      <View style={st.goalTrack}>
        <View style={[st.goalFill, { height: Math.max(8, 64 * h), backgroundColor: withAlpha(tone, 0.35), borderTopColor: tone }]} />
      </View>
      <Text variant="label" tone="tertiary" style={st.center}>{label}</Text>
    </View>
  );
}

/** Un forfait, sur une ligne : le nom a gauche, le prix a la semaine a droite. */
function PlanRow({
  label, price, badge, on, onPress,
}: {
  label: string;
  price: string;
  badge?: string;
  on: boolean;
  onPress: () => void;
}) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  return (
    <Pressable
      onPress={onPress}
      style={[st.plan, on ? st.planOn : st.planOff]}
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
    >
      <View style={st.planLeft}>
        <Text variant="button" color={on ? c.mist : withAlpha(c.mist, 0.55)}>{label}</Text>
        {badge && (
          <View style={[st.badge, !on && { backgroundColor: withAlpha(c.mist, 0.16) }]}>
            <Text variant="label" color={on ? c.night : withAlpha(c.mist, 0.7)}>{badge}</Text>
          </View>
        )}
      </View>
      <Text variant="button" color={on ? c.mist : withAlpha(c.mist, 0.55)}>{price}</Text>
    </Pressable>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', minHeight: 34, marginBottom: space.xs },
  close: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth, borderColor: withAlpha(c.mist, 0.18),
  },
  mascot: { alignItems: 'center', marginBottom: space.md },
  center: { textAlign: 'center' },
  sub: { marginTop: space.sm },
  goal: { alignSelf: 'stretch', alignItems: 'center', marginTop: space.lg },
  goalRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space.xl },
  goalCol: { alignItems: 'center', gap: 6, width: 104 },
  goalTrack: { height: 64, justifyContent: 'flex-end', alignSelf: 'stretch' },
  goalFill: { borderRadius: 8, borderTopWidth: 3 },
  plans: { marginTop: space.xl, gap: space.sm },
  plan: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md,
    paddingHorizontal: space.lg, height: 58, borderRadius: 29, borderWidth: 1.5,
  },
  /* Le choisi est clair et lumineux ; l'autre s'efface : un seul regard suffit. */
  planOn: {
    borderColor: withAlpha(c.mist, 0.9), backgroundColor: withAlpha(c.mist, 0.14),
    shadowColor: c.mist, shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 4 },
  },
  planOff: { borderColor: withAlpha(c.mist, 0.18), backgroundColor: withAlpha(c.mist, 0.04) },
  planLeft: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexShrink: 1 },
  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7, backgroundColor: c.accent },
  billed: { textAlign: 'center', marginTop: space.md, fontSize: 12, lineHeight: 16, fontFamily: 'SansMedium' },
  foot: { alignItems: 'center', gap: 4 },
  tiny: { fontSize: 11, lineHeight: 14, fontFamily: 'SansMedium', textAlign: 'center' },
  legal: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 6 },
});
