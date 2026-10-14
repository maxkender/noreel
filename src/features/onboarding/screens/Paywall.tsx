import { useMemo, useEffect, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Bell, Check, CreditCard, Unlock, X } from 'lucide-react-native';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { space } from '@/theme/spacing';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/type/Text';
import { haptics } from '@/lib/haptics';
import { useT } from '@/i18n';
import { useProStore } from '@/store/pro';
import { CodeSheet } from '@/features/onboarding/CodeSheet';
import {
  PURCHASES_ENABLED, appUserId, buy, currentOffering, redeemCode,
} from '@/services/purchases';
import { scheduleTrialReminder } from '@/services/trial';
import { WinBack, markWinbackSeen, winbackSeen } from './WinBack';
import type { PurchasesPackage } from 'react-native-purchases';

const LOCKUP = require('@/assets/brand/lockup.png');

type Plan = 'annual' | 'monthly';

// Prix de secours, affiches tant que le magasin n'a pas repondu. Ils
// doivent coller a ceux d'App Store Connect, sinon l'ecran ment pendant la
// seconde de chargement.
const FALLBACK = { annual: '29,99 €', monthly: '7,99 €' };
// L'essai existe sur les DEUX forfaits, et il est porte par les magasins :
// c'est Apple qui l'applique a l'achat, pas nous. On l'ANNONCE ici, on ne le
// fabrique pas — l'annoncer sans qu'il existe cote magasin serait mentir.
export const TRIAL_DAYS = 3;
// Le prix reel du magasin, releve au tableau de bord : la valeur de
// secours servait 44,99 alors que la fiche dit 49,99, et c'est elle qu'on
// affiche tant que le magasin ne repond pas.
const ANNUAL_EUR = 29.99;

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
const MONTHLY_EUR = 7.99;
// Douze mensualites face a un an : la comparaison honnete, et c'est elle qui
// rend l'annuel evident.
const SAVING = Math.round((1 - ANNUAL_EUR / (MONTHLY_EUR * 12)) * 100);

/**
 * Ce qu'on obtient — et rien sur ce qu'on n'a pas.
 *
 * Il y avait ici un tableau a deux colonnes, gratuit contre payant, avec une
 * croix sur chaque ligne refusee. On vendait donc d'abord un manque : l'oeil
 * compte les croix avant de lire les titres. Une liste ne dit que ce qu'on
 * recoit.
 */

// La croix n'apparait qu'apres douze secondes : le temps de lire ce qu'on
// propose. Elle finit TOUJOURS par venir — un paywall dont on ne sort pas
// est un piege, et l'App Store le refuse. Sept secondes paraissaient encore
// vite.
const EXIT_AFTER = 12000;

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
  const monthly = find('$rc_monthly');
  const chosen = plan === 'annual' ? annual : monthly;
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
    if (!PURCHASES_ENABLED) {
      if (!storeDown) { setStoreDown(true); haptics.stop(); return; }
      onDone();
      return;
    }
    /*
      Pas de forfait sous la main : on REDEMANDE au magasin, en attendant
      cette fois jusqu'a quinze secondes. Le premier appel etait borne a six
      secondes, et sur un reseau lent le bouton disait « pas encore ouvert »
      alors que le magasin n'avait simplement pas fini de repondre.
    */
    let pack = chosen;
    if (!pack) {
      setBusy(true);
      const r = await Promise.race([
        currentOffering(),
        new Promise<{ offering: null; fail: string }>((res) => setTimeout(() => res({ offering: null, fail: 'timeout' }), 15000)),
      ]);
      setBusy(false);
      if (r.offering?.availablePackages.length) {
        setPacks(r.offering.availablePackages);
        setStoreDown(false);
        setFail(null);
        pack = r.offering.availablePackages.find((x) => x.identifier === (plan === 'annual' ? '$rc_annual' : '$rc_monthly'));
      } else {
        setFail(r.fail);
        void appUserId().then(setWho);
        setStoreDown(true);
        haptics.stop();
        return;
      }
      if (!pack) { setStoreDown(true); return; }
    }
    setBusy(true);
    const r = await buy(pack);
    setBusy(false);
    if (r === 'bought') {
      setPro(true);
      // La frise promet « jour 2 : on te previent ». C'est ici qu'on tient la
      // promesse, et seulement sur le forfait qui a un essai.
      void scheduleTrialReminder();
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
  const [codeOpen, setCodeOpen] = useState(false);
  const promo = async () => {
    haptics.tap();
    // Android : pas de feuille de code comme chez Apple, on ouvre la notre.
    if (Platform.OS !== 'ios') { setCodeOpen(true); return; }
    await redeemCode();
    // La feuille d'Apple ne dit pas ce qu'elle a fait : c'est le statut
    // d'abonnement qui tranche, et il arrive par son propre canal.
    await useProStore.getState().refresh();
  };

  return (
    <Screen
      /*
        Un fond a lui, et pas de poussiere lumineuse.

        Tous les ecrans partagent le meme noir — c'est ce qui fait qu'on est
        dans la meme app. Mais on n'arrive pas sur le paywall pour lire une
        etape de plus, et un ecran de vente identique au precedent ne donne
        envie de rien. Le degrade violet-bleu dit qu'on a change de piece.
        Les points qui flottent en fond, eux, passaient DERRIERE les cartes de
        forfait et on ne savait plus ce qu'on regardait.
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
      // Le libelle ne parle pas de prix : il nomme ce qu'on vient chercher.
      cta={
        busy || loading
          ? d.pay.wait
          : storeDown
            ? d.pay.retry
            : d.pay.cta
      }
      note={
        !storeDown ? (
          /*
            Le prix, sous le bouton, en toutes lettres — et c'est le SEUL
            endroit ou l'essai est annonce. Il l'etait aussi dans une frise,
            dans une carte et dans les conditions : quatre fois la meme phrase
            sur un ecran, et le prix se noyait dedans.
          */
          <Text variant="label" tone="tertiary" style={st.center}>
            {plan === 'annual'
              ? t(d.pay.priceLine, {
                n: TRIAL_DAYS,
                m: money(euros(annual, ANNUAL_EUR) / 12),
                y: price(annual, FALLBACK.annual),
              })
              : t(d.pay.priceMonthly, { n: TRIAL_DAYS, p: price(monthly, FALLBACK.monthly) })}
          </Text>
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
            {/* La sortie reste ouverte : un lien, sous le message, mene a l'app. */}
            <Pressable onPress={() => { haptics.tap(); onDone(); }} hitSlop={8} style={{ marginTop: 6 }}>
              <Text variant="label" color={c.accent} style={st.center}>{d.pay.storeSkip}</Text>
            </Pressable>
          </Animated.View>
        )
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
            <Pressable onPress={() => { haptics.tap(); onDone(); }} hitSlop={16} style={st.close} accessibilityRole="button" accessibilityLabel={d.misc.close} testID="paywall-close">
              <X size={19} strokeWidth={2.2} color={withAlpha(c.mist, 0.55)} />
            </Pressable>
          </Animated.View>
        )}
      </View>

      <Text variant="label" color={c.accent} style={[st.center, { marginBottom: space.sm }]}>
        {d.pay.ready}
      </Text>
      <Text variant="displayM" style={st.center}>
        {t(d.pay.title, { accent: '\u0000' }).split('\u0000')[0]}
        <Text variant="displayM" color={c.accent}>{d.pay.titleAccent}</Text>
        {t(d.pay.title, { accent: '\u0000' }).split('\u0000')[1]}
      </Text>

      {/* Ce qui sera preleve, et quand — AVANT les prix : c'est la question
          qui bloque la main au-dessus du bouton. */}
      <Trial plan={plan} />

      {/* Deux lignes, l'une sous l'autre : le nom a gauche, le prix a droite. */}
      <View style={st.plans}>
        <PlanRow
          label={d.pay.annual}
          price={t(d.pay.perMonth, { p: money(euros(annual, ANNUAL_EUR) / 12) })}
          sub={t(d.pay.billedYear, { y: price(annual, FALLBACK.annual) })}
          badge={`−${SAVING} %`}
          on={plan === 'annual'}
          onPress={() => { haptics.tick(); setPlan('annual'); }}
        />
        <PlanRow
          label={d.pay.monthly}
          price={t(d.pay.perMonth, { p: price(monthly, FALLBACK.monthly) })}
          sub={d.pay.weeklyNote}
          on={plan === 'monthly'}
          onPress={() => { haptics.tick(); setPlan('monthly'); }}
        />
      </View>

      <WinBack visible={winback} onClose={() => { setWinback(false); onDone(); }} />
      <CodeSheet
        visible={codeOpen}
        onClose={() => setCodeOpen(false)}
        onUnlocked={() => { setCodeOpen(false); onDone(); }}
      />

      {/* Le pied de page : une seule ligne fine, ses quatre liens separes
          par des points. Il vivait sur trois rangees de tailles differentes. */}
      <View style={st.legal}>
        <Pressable onPress={() => { haptics.tap(); void Linking.openURL(TERMS); }} hitSlop={8}>
          <Text variant="label" tone="tertiary">{d.pay.terms}</Text>
        </Pressable>
        <Text variant="label" tone="tertiary">·</Text>
        <Pressable onPress={() => { haptics.tap(); void Linking.openURL(PRIVACY); }} hitSlop={8}>
          <Text variant="label" tone="tertiary">{d.pay.privacy}</Text>
        </Pressable>
        <Text variant="label" tone="tertiary">·</Text>
        <Pressable onPress={() => { haptics.tap(); void restorePro(); }} hitSlop={8}>
          <Text variant="label" tone="tertiary">{PURCHASES_ENABLED ? d.pay.restore : d.pay.beta}</Text>
        </Pressable>
        {(Platform.OS !== 'ios' || PURCHASES_ENABLED) && (
          <>
            <Text variant="label" tone="tertiary">·</Text>
            <Pressable onPress={() => { void promo(); }} hitSlop={8}>
              <Text variant="label" tone="tertiary">{d.pay.promo}</Text>
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
  const { d, t } = useT();

  /*
    L'hebdomadaire garde la MEME frise.

    Il avait droit a un pave a lui, plus court : changer de forfait faisait
    donc sauter tout le bas de la page, et on perdait l'endroit ou l'on
    regardait au moment precis ou l'on compare deux prix. Trois etapes des
    deux cotes, meme hauteur, rien ne bouge — seul le contenu change.

    Il n'a pas d'essai, et la frise le dit en toutes lettres : le taire
    laisserait croire le contraire, et le prelevement se decouvrirait le jour
    meme.
  */
  const steps: [typeof Bell, string, string, boolean][] = [
    [Unlock, d.pay.trialToday, d.pay.trialTodayBody, true],
    [Bell, d.pay.trialWarn, d.pay.trialWarnBody, true],
    [CreditCard, t(d.pay.trialCharge, { n: TRIAL_DAYS }), d.pay.trialChargeBody, false],
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
        {t(plan === 'monthly' ? d.pay.trialBannerMonthly : d.pay.trialBanner, { n: TRIAL_DAYS })}
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

/** Un forfait sur une ligne : le nom et sa remise a gauche, le prix a droite. */
function PlanRow({
  label, price, sub, badge, on, onPress,
}: {
  label: string;
  price: string;
  sub: string;
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
      <View style={[st.tick, on && st.tickOn]}>
        {on && <Check size={13} strokeWidth={3} color={c.night} />}
      </View>
      {/*
        Deux colonnes qui se PARTAGENT la largeur : la gauche se replie, la
        droite ne depasse jamais la moitie. En italien, « Fatturato … all'anno »
        poussait le prix sur la pastille « −81 % » et les deux se couvraient.
      */}
      <View style={st.planLeft}>
        <Text variant="button" color={on ? c.mist : withAlpha(c.mist, 0.6)} numberOfLines={1}>{label}</Text>
        {badge && (
          <View style={[st.badge, !on && { backgroundColor: withAlpha(c.mist, 0.16) }]}>
            <Text variant="label" color={on ? c.night : withAlpha(c.mist, 0.7)} numberOfLines={1}>{badge}</Text>
          </View>
        )}
      </View>
      <View style={st.planRight}>
        <Text variant="button" color={on ? c.mist : withAlpha(c.mist, 0.6)} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{price}</Text>
        <Text variant="label" tone="tertiary" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ textAlign: 'right' }}>{sub}</Text>
      </View>
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
  plans: { marginTop: space.lg, gap: space.sm },
  plan: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    paddingHorizontal: space.md, height: 64, borderRadius: 18, borderWidth: 1.5,
  },
  planOn: {
    borderColor: withAlpha(c.accent, 0.9), backgroundColor: withAlpha(c.accent, 0.14),
    shadowColor: c.accent, shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 4 },
  },
  planOff: { borderColor: withAlpha(c.mist, 0.14), backgroundColor: withAlpha(c.mist, 0.04) },
  planLeft: { flex: 1, flexShrink: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm },
  planRight: { alignItems: 'flex-end', flexShrink: 0, maxWidth: '52%' },
  tick: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: withAlpha(c.mist, 0.26),
  },
  trial: {
    /*
      Hauteur FIXE.
      Les deux forfaits n'ont pas le meme contenu — une frise de trois temps
      pour l'annuel, deux lignes pour l'hebdomadaire — et le bloc changeait
      donc de taille en changeant de choix. Tout ce qui suit sautait, y compris
      les deux cartes de forfait, au moment precis ou le doigt les vise.
    */
    minHeight: 196, justifyContent: 'center',
    marginTop: space.xl, borderRadius: 22, overflow: 'hidden',
    paddingHorizontal: space.lg, paddingVertical: space.lg,
    borderWidth: StyleSheet.hairlineWidth, borderColor: withAlpha(c.accent, 0.4),
  },
  trialFlat: { borderColor: withAlpha(c.ember, 0.4) },
  trialInner: { alignSelf: 'stretch' },
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
  list: { marginTop: space.lg, gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 4 },
  rowIcon: {
    width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    backgroundColor: withAlpha(c.accent, 0.12),
  },
  rowText: { flex: 1, lineHeight: 16 },
  tickOn: { backgroundColor: c.accent, borderColor: c.accent },
  badge: {
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7,
    backgroundColor: c.accent,
  },
  legal: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center',
    gap: space.sm, marginTop: space.md, paddingVertical: space.sm,
  },
});
