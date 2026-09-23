import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { ClientId } from '@/features/client/blockers';

/** Reglages par app. Les entrees `locked` sont toujours actives. */
export type AppToggle = {
  key: string;
  label: string;
  /** Toujours actif, non debrayable. */
  locked?: boolean;
  /** Actif tant que l'utilisateur n'a rien touche. */
  on?: boolean;
};

export const APP_TOGGLES: Record<ClientId, AppToggle[]> = {
  instagram: [
    { key: 'reels', label: 'Bloquer les Reels', locked: true },
    { key: 'explore', label: 'Bloquer Explorer', locked: true },
    { key: 'ads', label: 'Masquer les publicités', on: true },
    { key: 'suggested', label: 'Masquer les posts suggérés', on: true },
    { key: 'stories', label: 'Bloquer les stories' },
    { key: 'feed', label: 'Bloquer le fil' },
    { key: 'dmsOnly', label: 'Messages uniquement' },
    { key: 'grayscale', label: 'Noir et blanc' },
  ],
  tiktok: [
    { key: 'foryou', label: 'Bloquer le fil Pour toi', locked: true },
    { key: 'explore', label: 'Bloquer la recherche' },
    { key: 'create', label: 'Bloquer la création' },
    { key: 'dmsOnly', label: 'Messages uniquement' },
    { key: 'grayscale', label: 'Noir et blanc' },
  ],
  twitter: [
    { key: 'foryou', label: 'Bloquer « Pour vous »', locked: true },
    { key: 'trends', label: 'Masquer les tendances', locked: true },
    { key: 'explore', label: 'Bloquer Explorer' },
    { key: 'dmsOnly', label: 'Messages uniquement' },
    { key: 'grayscale', label: 'Noir et blanc' },
  ],
  youtube: [
    { key: 'shorts', label: 'Bloquer les Shorts', locked: true },
    { key: 'home', label: 'Bloquer la page d’accueil' },
    { key: 'comments', label: 'Bloquer les commentaires' },
    { key: 'recommended', label: 'Masquer les suggestions' },
    { key: 'grayscale', label: 'Noir et blanc' },
  ],
};

type State = {
  settings: Record<string, boolean>;
  hasHydrated: boolean;
  toggle: (app: ClientId, key: string, value: boolean) => void;
  isOn: (app: ClientId, key: string) => boolean;
};

export const useAppsStore = create<State>()(
  persist(
    (set, get) => ({
      settings: {},
      hasHydrated: false,
      toggle: (app, key, value) =>
        set((s) => ({ settings: { ...s.settings, [`${app}.${key}`]: value } })),
      isOn: (app, key) => {
        const t = APP_TOGGLES[app].find((x) => x.key === key);
        if (t?.locked) return true;
        // `?? t.on` et pas `?? false` : un reglage actif par defaut le reste
        // tant que personne ne l'a touche, et redevient touchable ensuite.
        return get().settings[`${app}.${key}`] ?? !!t?.on;
      },
    }),
    {
      name: 'noreel.apps',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ settings }) => ({ settings }),
      onRehydrateStorage: () => () => {
        useAppsStore.setState({ hasHydrated: true });
      },
    }
  )
);
