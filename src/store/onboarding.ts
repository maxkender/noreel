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
  firstName: string;
  /** Apps que l'utilisateur declare comme ses distractions. */
  distractions: string[];
  /** Regles horaires retenues a l'onboarding. */
  rules: string[];
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
  setFirstName: (name: string) => void;
  toggleDistraction: (id: string) => void;
  toggleRule: (id: string) => void;
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
  firstName: '',
  distractions: ['instagram', 'tiktok'],
  rules: ['night'],
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
      // La majuscule est posee ici, pas a l'affichage : sinon chaque ecran
      // doit y penser, et un seul oubli se voit.
      setFirstName: (n) => set({
        firstName: n.trim().replace(/^./, (x) => x.toLocaleUpperCase('fr')),
      }),
      toggleDistraction: (id) => set((s) => ({
        distractions: s.distractions.includes(id)
          ? s.distractions.filter((x) => x !== id)
          : [...s.distractions, id],
      })),
      toggleRule: (id) => set((s) => ({
        rules: s.rules.includes(id)
          ? s.rules.filter((x) => x !== id)
          : [...s.rules, id],
      })),
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
