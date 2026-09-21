import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type PainFrequency = 'daily' | 'weekly' | 'lostCount';
export type SocialApp = 'instagram' | 'tiktok';

type OnboardingState = {
  completed: boolean;
  step: number;
  minutesPerDay: number;
  age: number;
  painFrequency?: PainFrequency;
  demoPlatform: SocialApp;
  startedAt?: number;
  /** Faux tant que le disque n'a pas répondu : évite de rediriger trop tôt. */
  hasHydrated: boolean;
};

type OnboardingActions = {
  setStep: (step: number) => void;
  setMinutesPerDay: (minutes: number) => void;
  setAge: (age: number) => void;
  setPainFrequency: (f: PainFrequency) => void;
  setDemoPlatform: (app: SocialApp) => void;
  start: () => void;
  complete: () => void;
  reset: () => void;
};

const initial: Omit<OnboardingState, 'hasHydrated'> = {
  completed: false,
  step: 0,
  minutesPerDay: 150, // §5.5 : 2 h 30
  age: 24,
  demoPlatform: 'instagram',
};

export const useOnboardingStore = create<OnboardingState & OnboardingActions>()(
  persist(
    (set) => ({
      ...initial,
      hasHydrated: false,
      setStep: (step) => set({ step }),
      setMinutesPerDay: (minutesPerDay) => set({ minutesPerDay }),
      setAge: (age) => set({ age }),
      setPainFrequency: (painFrequency) => set({ painFrequency }),
      setDemoPlatform: (demoPlatform) => set({ demoPlatform }),
      start: () => set((s) => (s.startedAt ? s : { startedAt: Date.now() })),
      complete: () => set({ completed: true }),
      reset: () => set({ ...initial }),
    }),
    {
      name: 'noreel.onboarding',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ hasHydrated, ...rest }) => rest,
      // Appelé une fois le disque lu : c'est le signal que index.tsx attend.
      onRehydrateStorage: () => () => {
        useOnboardingStore.setState({ hasHydrated: true });
      },
    }
  )
);
