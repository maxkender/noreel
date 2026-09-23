import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { setHapticsEnabled } from '@/lib/haptics';

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
      set: (key, value) => {
        set({ [key]: value } as Partial<State>);
        // L'haptique est un module global : on la synchronise tout de suite.
        if (key === 'haptics') setHapticsEnabled(value as boolean);
      },
    }),
    {
      name: 'noreel.settings',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ haptics, reduceMotion, goalMinutes, strictMode, blocking }) =>
        ({ haptics, reduceMotion, goalMinutes, strictMode, blocking }),
      onRehydrateStorage: () => (s) => {
        if (s) setHapticsEnabled(s.haptics);
      },
    }
  )
);
