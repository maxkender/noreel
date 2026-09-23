import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { ClientId } from '@/features/client/blockers';
import { APP_TOGGLES } from './toggles';


type State = {
  settings: Record<string, boolean>;
  hasHydrated: boolean;
  toggle: (app: ClientId, key: string, value: boolean) => void;
  isOn: (app: ClientId, key: string) => boolean;
};

export { APP_TOGGLES };
export type { AppToggle } from './toggles';

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
