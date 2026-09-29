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
};

/**
 * L'etat Pro, en un seul endroit.
 *
 * Sans cle RevenueCat, `pro` reste faux et `checked` passe a vrai tout de
 * suite : l'app n'attend rien et se comporte comme aujourd'hui.
 */
export const useProStore = create<ProState>()((set) => ({
  pro: false,
  checked: !PURCHASES_ENABLED,
  setPro: (pro) => set({ pro }),
  start: async () => {
    if (!PURCHASES_ENABLED) { set({ checked: true }); return; }
    await initPurchases();
    let pro = isPro(await customerInfo());
    // Pas d'abonnement sur ce profil ? On demande a Apple ce que le telephone
    // detient avant de conclure : un profil neuf ne sait rien de l'ancien.
    if (!pro) pro = await syncOwned();
    set({ pro, checked: true });
    // Un achat fait ailleurs (autre appareil, renouvellement) arrive ici.
    onCustomerInfo((pro) => set({ pro }));
  },
  refresh: async () => {
    if (!PURCHASES_ENABLED) return;
    set({ pro: isPro(await customerInfo()) });
  },
  restore: async () => {
    const ok = await restore();
    if (ok) set({ pro: true });
    return ok;
  },
}));
