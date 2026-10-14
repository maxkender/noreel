import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import {
  PURCHASES_ENABLED, customerInfo, initPurchases, isPro, onCustomerInfo, restore, syncOwned,
} from '@/services/purchases';

type ProState = {
  pro: boolean;
  /** Faux tant que RevenueCat n'a pas repondu : evite de degrader l'app. */
  checked: boolean;
  start: () => Promise<void>;
  setPro: (v: boolean) => void;
  restore: () => Promise<boolean>;
  /** Relit le statut apres un achat fait hors de l'app (code promo). */
  refresh: () => Promise<void>;
  /** Vrai une fois le code d'acces des examinateurs saisi sur cet appareil. */
  review: boolean;
  /** Verifie le code d'acces des examinateurs ; vrai s'il ouvre Pro. */
  unlockReview: (code: string) => Promise<boolean>;
};

/*
  L'acces des examinateurs.

  Google exige que ses examinateurs voient TOUTE l'app, fonctions payantes
  comprises, sans payer et sans essai gratuit. Ils ne peuvent pas acheter :
  on leur donne un code, saisi via « J'ai un code » sur le paywall, qui ouvre
  Pro sur CET appareil seulement. Le code vit dans la configuration de build
  (EXPO_PUBLIC_REVIEW_CODE) ; sans lui, rien ne s'ouvre.
*/
const REVIEW_CODE = (process.env.EXPO_PUBLIC_REVIEW_CODE ?? '').trim().toUpperCase();
const REVIEW_KEY = 'unswipe.review.v1';
const norm = (code: string) => code.trim().toUpperCase().replace(/\s+/g, '');

/**
 * L'etat Pro, en un seul endroit.
 *
 * Sans cle RevenueCat, `pro` reste faux et `checked` passe a vrai tout de
 * suite : l'app n'attend rien et se comporte comme aujourd'hui.
 */
export const useProStore = create<ProState>()((set, get) => ({
  pro: false,
  checked: !PURCHASES_ENABLED,
  review: false,
  setPro: (pro) => set({ pro: pro || get().review }),
  start: async () => {
    const review = REVIEW_CODE !== ''
      && (await AsyncStorage.getItem(REVIEW_KEY).catch(() => null)) === REVIEW_CODE;
    if (review) set({ review: true, pro: true });
    if (!PURCHASES_ENABLED) { set({ checked: true }); return; }
    await initPurchases();
    let pro = isPro(await customerInfo());
    // Pas d'abonnement sur ce profil ? On demande a Apple ce que le telephone
    // detient avant de conclure : un profil neuf ne sait rien de l'ancien.
    if (!pro) pro = await syncOwned();
    set({ pro: pro || get().review, checked: true });
    // Un achat fait ailleurs (autre appareil, renouvellement) arrive ici.
    onCustomerInfo((pro) => set({ pro: pro || get().review }));
  },
  refresh: async () => {
    if (!PURCHASES_ENABLED) return;
    set({ pro: isPro(await customerInfo()) || get().review });
  },
  unlockReview: async (code) => {
    if (REVIEW_CODE === '' || norm(code) !== norm(REVIEW_CODE)) return false;
    await AsyncStorage.setItem(REVIEW_KEY, REVIEW_CODE).catch(() => {});
    set({ review: true, pro: true, checked: true });
    return true;
  },
  restore: async () => {
    const ok = await restore();
    if (ok) set({ pro: true });
    return ok;
  },
}));
