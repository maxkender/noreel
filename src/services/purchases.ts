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

/** Le droit d'acces qu'un achat debloque, cote RevenueCat. */
export const ENTITLEMENT = 'pro';

export const PURCHASES_ENABLED = !!KEY;

let started = false;

export async function initPurchases(): Promise<void> {
  if (started || !KEY) return;
  started = true;
  try {
    if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.WARN);
    // Pas d'identifiant utilisateur : RevenueCat en genere un anonyme et le
    // rattache au compte Apple. L'app n'a pas de comptes, donc rien a lier.
    await Purchases.configure({ apiKey: KEY });
  } catch {
    started = false;
  }
}

export function isPro(info: CustomerInfo | null): boolean {
  return !!info?.entitlements.active[ENTITLEMENT];
}

/** L'offre courante, telle que configuree dans le tableau de bord. */
export async function currentOffering(): Promise<PurchasesOffering | null> {
  if (!KEY) return null;
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current ?? null;
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

export async function restore(): Promise<boolean> {
  if (!KEY) return false;
  try {
    return isPro(await Purchases.restorePurchases());
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
