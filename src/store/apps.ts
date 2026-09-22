import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { ClientId } from '@/features/client/blockers';

/** Reglages par app. Les entrees `locked` sont toujours actives. */
export type AppToggle = { key: string; label: string; locked?: boolean };

export const APP_TOGGLES: Record<ClientId, AppToggle[]> = {
  instagram: [
    { key: 'reels', label: 'Bloquer les Reels', locked: true },
    { key: 'explore', label: 'Bloquer Explorer', locked: true },
    { key: 'stories', label: 'Bloquer les stories' },
    { key: 'feed', label: 'Bloquer le fil' },
    { key: 'dmsOnly', label: 'Messages uniquement' },
  ],
  tiktok: [
    { key: 'foryou', label: 'Bloquer le fil Pour toi', locked: true },
    { key: 'dmsOnly', label: 'Messages uniquement' },
    { key: 'grayscale', label: 'Noir et blanc' },
  ],
  youtube: [
    { key: 'shorts', label: 'Bloquer les Shorts', locked: true },
    { key: 'home', label: 'Bloquer la page d’accueil' },
    { key: 'comments', label: 'Bloquer les commentaires' },
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
        const locked = APP_TOGGLES[app].find((t) => t.key === key)?.locked;
        if (locked) return true;
        return get().settings[`${app}.${key}`] ?? false;
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
