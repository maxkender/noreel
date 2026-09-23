import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { setHapticsEnabled } from '@/lib/haptics';
import type { ThemeName } from '@/theme/palettes';

type State = {
  haptics: boolean;
  reduceMotion: boolean;
  goalMinutes: number;
  strictMode: boolean;
  /**
   * Le blocage VOULU par l'utilisateur, garde sur le disque.
   *
   * iOS lache les restrictions au redemarrage de l'app ou du telephone :
   * sans cette memoire, le blocage ne revenait jamais tout seul et il
   * fallait le rallumer a la main.
   */
  blocking: boolean;
  /** Selection Temps d'ecran, encodee par Apple. Opaque pour nous. */
  selection: string | null;
  /** Identifiant Apple, opaque et propre a cette app. */
  appleUser: string | null;
  /** Visites guidees deja vues, par cle. */
  toured: Record<string, boolean>;
  /** Clair, sombre, ou celui du telephone. */
  theme: ThemeName;
  set: <K extends keyof State>(key: K, value: State[K]) => void;
};

export const useSettings = create<State>()(
  persist(
    (set) => ({
      haptics: true,
      reduceMotion: false,
      goalMinutes: 120,
      strictMode: false,
      blocking: false,
      selection: null,
      appleUser: null,
      toured: {},
      // Clair par defaut : c'est le theme que l'app montre en premier.
      theme: 'light',
      set: (key, value) => {
        set({ [key]: value } as Partial<State>);
        // L'haptique est un module global : on la synchronise tout de suite.
        if (key === 'haptics') setHapticsEnabled(value as boolean);
      },
    }),
    {
      name: 'noreel.settings',
      storage: createJSONStorage(() => AsyncStorage),
      // Le clair devient le theme par defaut. Le changer dans l'etat initial
      // ne suffit pas : un telephone qui a deja lance l'app garde SA valeur
      // enregistree, et serait reste en sombre pour toujours. Cette montee
      // de version la remet une fois, sans toucher au reste ; ensuite le
      // choix de l'utilisateur tient.
      version: 1,
      migrate: (state, from) => {
        const s = state as Partial<State> | undefined;
        if (from < 1 && s) return { ...s, theme: 'light' as ThemeName };
        return s;
      },
      partialize: ({ haptics, reduceMotion, goalMinutes, strictMode, blocking, selection, appleUser, toured, theme }) =>
        ({ haptics, reduceMotion, goalMinutes, strictMode, blocking, selection, appleUser, toured, theme }),
      onRehydrateStorage: () => (s) => {
        if (s) setHapticsEnabled(s.haptics);
      },
    }
  )
);
