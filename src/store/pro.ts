import { create } from 'zustand';
import {
  PURCHASES_ENABLED, customerInfo, initPurchases, isPro, onCustomerInfo, restore,
} from '@/services/purchases';

type ProState = {
  pro: boolean;
  /** Faux tant que RevenueCat n'a pas repondu : evite de degrader l'app. */
  checked: boolean;
  start: () => Promise<void>;
  setPro: (v: boolean) => void;
  restore: () => Promise<boolean>;
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
    set({ pro: isPro(await customerInfo()), checked: true });
    // Un achat fait ailleurs (autre appareil, renouvellement) arrive ici.
    onCustomerInfo((pro) => set({ pro }));
  },
  restore: async () => {
    const ok = await restore();
    if (ok) set({ pro: true });
    return ok;
  },
}));
