import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL, type CustomerInfo, type PurchasesOffering, type PurchasesPackage,
} from 'react-native-purchases';

/**
 * Couche d'achat.
 *
 * La cle publique RevenueCat vit dans une variable d'environnement : tant
 * qu'elle est absente, TOUT ici est inerte et l'app se comporte comme avant
 * — paywall affiche, rien a acheter, aucun plantage. C'est ce qui permet de
 * livrer le code avant que le compte marchand soit pret.
 *
 * La cle publique n'est pas un secret : elle est faite pour vivre dans le
 * binaire. Le secret, c'est la cle SECRETE, qui ne doit jamais y entrer.
 */
const KEY = Platform.select({
  ios: process.env.EXPO_PUBLIC_RC_IOS_KEY,
  android: process.env.EXPO_PUBLIC_RC_ANDROID_KEY,
});

/** Le droit d'acces qu'un achat debloque, tel qu'il est nomme au tableau
 *  de bord. Le changer ici sans le changer la-bas coupe tous les abonnes. */
export const ENTITLEMENT = 'unswap_pro';

export const PURCHASES_ENABLED = !!KEY;

/*
 * Le demarrage, en UN seul exemplaire.
 *
 * Il tenait dans un booleen : parti une fois, jamais rejoue, y compris quand
 * la configuration avait echoue — l'app restait alors sans magasin jusqu'au
 * prochain lancement, sans que rien ne le dise. En gardant la PROMESSE, tout
 * le monde attend la meme configuration, et un echec la remet a zero pour
 * qu'une seconde tentative soit possible.
 */
let ready: Promise<void> | null = null;

export function initPurchases(): Promise<void> {
  if (!KEY) return Promise.resolve();
  if (!ready) {
    ready = (async () => {
      if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.WARN);
      // Pas d'identifiant utilisateur : RevenueCat en genere un anonyme et le
      // rattache au compte Apple. L'app n'a pas de comptes, donc rien a lier.
      Purchases.configure({ apiKey: KEY });
    })();
    ready.catch(() => { ready = null; });
  }
  return ready;
}

export function isPro(info: CustomerInfo | null): boolean {
  return !!info?.entitlements.active[ENTITLEMENT];
}

/**
 * Pourquoi il n'y a rien a vendre.
 *
 * Chaque cause demande une action DIFFERENTE, et aucune ne se devine depuis
 * l'ecran : pas de cle, c'est la construction ; le magasin qui refuse, c'est
 * Apple ; une offre vide, c'est le tableau de bord. Rendre null pour les trois
 * revenait a dire « ca ne marche pas » a quelqu'un qui demandait pourquoi —
 * moi compris, qui ai cherche du cote d'Apple ce qui pouvait venir d'ici.
 */
export type OfferingFail =
  | 'no-key' | 'no-current' | 'empty' | string;

export type OfferingResult = {
  offering: PurchasesOffering | null;
  /** Nul quand tout va bien. Sinon, de quoi savoir ou regarder. */
  fail: OfferingFail | null;
};

/** L'offre courante, telle que configuree dans le tableau de bord. */
export async function currentOffering(): Promise<OfferingResult> {
  if (!KEY) return { offering: null, fail: 'no-key' };
  try {
    // On ATTEND la configuration. Sans ca, la premiere requete d'un demarrage
    // rapide part avant elle et leve.
    await initPurchases();
    const offerings = await Purchases.getOfferings();
    const cur = offerings.current;
    if (!cur) return { offering: null, fail: 'no-current' };
    if (!cur.availablePackages.length) return { offering: null, fail: 'empty' };
    return { offering: cur, fail: null };
  } catch (e) {
    // Le message du SDK dit souvent exactement ce qui manque — un contrat non
    // signe, un produit introuvable, un appareil sans compte de test.
    return { offering: null, fail: String((e as Error)?.message ?? e).slice(0, 180) };
  }
}

/**
 * L'offre de rattrapage, si elle existe.
 *
 * Elle vit dans une offre RevenueCat nommee « winback ». Quand elle n'est
 * pas configuree, cette fonction rend null et l'ecran ne s'affiche PAS :
 * mieux vaut ne rien proposer qu'annoncer un prix sur lequel l'achat
 * echouerait.
 */
export async function winbackOffering(): Promise<PurchasesOffering | null> {
  if (!KEY) return null;
  try {
    const all = await Purchases.getOfferings();
    return all.all.winback ?? null;
  } catch {
    return null;
  }
}

export async function customerInfo(): Promise<CustomerInfo | null> {
  if (!KEY) return null;
  try {
    return await Purchases.getCustomerInfo();
  } catch {
    return null;
  }
}

export type BuyResult = 'bought' | 'cancelled' | 'failed' | 'unavailable';

export async function buy(pack: PurchasesPackage): Promise<BuyResult> {
  if (!KEY) return 'unavailable';
  try {
    const { customerInfo: info } = await Purchases.purchasePackage(pack);
    return isPro(info) ? 'bought' : 'failed';
  } catch (e) {
    // L'annulation par l'utilisateur n'est pas une erreur : ne rien lui dire.
    const cancelled = !!(e as { userCancelled?: boolean })?.userCancelled;
    return cancelled ? 'cancelled' : 'failed';
  }
}

/**
 * Ouvre la feuille de codes d'Apple.
 *
 * Un code promo d'abonnement n'est PAS une chaine qu'on verifie soi-meme :
 * c'est Apple qui le detient, l'echange contre un droit, et previent
 * RevenueCat. Un champ de texte maison ne pourrait rien valider — il
 * donnerait l'illusion d'un code accepte sans qu'aucun abonnement n'existe.
 * On ouvre donc la feuille du systeme, et le statut revient par le canal
 * habituel.
 */
export async function redeemCode(): Promise<boolean> {
  if (!KEY || Platform.OS !== 'ios') return false;
  try {
    await Purchases.presentCodeRedemptionSheet();
    return true;
  } catch {
    return false;
  }
}

export async function restore(): Promise<boolean> {
  if (!KEY) return false;
  try {
    return isPro(await Purchases.restorePurchases());
  } catch {
    return false;
  }
}

/**
 * Rattache les achats a un identifiant stable.
 *
 * Sans ca, RevenueCat suit un identifiant anonyme lie a l'installation :
 * changer de telephone, et l'abonnement ne suit pas. L'identifiant Apple
 * est opaque et propre a cette app — il n'identifie la personne nulle part
 * ailleurs.
 */
export async function linkAccount(userId: string): Promise<boolean> {
  if (!KEY) return false;
  try {
    const { customerInfo: info } = await Purchases.logIn(userId);
    return isPro(info);
  } catch {
    return false;
  }
}

/** Previent a chaque changement d'abonnement, y compris hors de l'app. */
export function onCustomerInfo(fn: (pro: boolean) => void): () => void {
  if (!KEY) return () => {};
  const listener = (info: CustomerInfo) => fn(isPro(info));
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => Purchases.removeCustomerInfoUpdateListener(listener);
}
