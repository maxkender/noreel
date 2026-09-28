import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type PainFrequency = 'daily' | 'weekly' | 'lostCount';
export type SocialApp = 'instagram' | 'tiktok';

type OnboardingState = {
  completed: boolean;
  step: number;
  /** L'estimation, donnee au doigt. */
  minutesPerDay: number;
  /**
   * Le vrai chiffre, recopie depuis Reglages > Temps d'ecran.
   *
   * Apple ne le donne a aucune app : le rapport vit dans une extension
   * isolee et ses nombres ne traversent jamais. Il est donc SAISI, et tant
   * qu'il ne l'est pas, tout le parcours raisonne sur l'estimation.
   */
  realMinutes?: number;
  /** Prises en main par jour, recopiees au meme endroit. */
  pickups?: number;
  age: number;
  firstName: string;
  /** Apps que l'utilisateur declare comme ses distractions. */
  distractions: string[];
  /** Regles horaires retenues a l'onboarding. */
  rules: string[];
  painFrequency?: PainFrequency;
  source?: string;
  demoPlatform: SocialApp;
  startedAt?: number;
  /** Faux tant que le disque n'a pas répondu : évite de rediriger trop tôt. */
  hasHydrated: boolean;
};

type OnboardingActions = {
  setStep: (step: number) => void;
  setMinutesPerDay: (minutes: number) => void;
  setReal: (minutes: number, pickups: number) => void;
  setAge: (age: number) => void;
  setFirstName: (name: string) => void;
  toggleDistraction: (id: string) => void;
  toggleRule: (id: string) => void;
  setPainFrequency: (f: PainFrequency) => void;
  /** Ou la personne a entendu parler de l'app. Declaratif, donc approximatif. */
  setSource: (s: string) => void;
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
      setReal: (realMinutes, pickups) => set({ realMinutes, pickups }),
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
      setSource: (source) => set({ source }),
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

/**
 * Le temps sur lequel le parcours raisonne : le vrai s'il a ete saisi, sinon
 * l'estimation. UN seul endroit le decide — chaque ecran qui choisirait
 * lui-meme finirait par montrer deux chiffres differents pour la meme personne.
 */
export const effectiveMinutes = (s: { minutesPerDay: number; realMinutes?: number }) =>
  s.realMinutes ?? s.minutesPerDay;
