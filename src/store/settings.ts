import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { setHapticsEnabled } from '@/lib/haptics';
import type { ThemeName } from '@/theme/palettes';
import type { Valve } from '@/features/client/blockers';

type State = {
  haptics: boolean;
  reduceMotion: boolean;
  goalMinutes: number;
  strictMode: boolean;
  /**
   * Mode strict : rendre le blocage demande de traverser une porte.
   * Distinct de `strictMode`, qui ne fait qu'afficher un mur sur un reel.
   */
  hardMode: boolean;
  /** L'offre de rattrapage a deja ete montree. Elle ne revient pas. */
  winbackSeen: boolean;
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
  /** Clair, sombre, ou celui du telephone. */
  theme: ThemeName;
  /**
   * La soupape : une fenetre annoncee ou le format court est autorise.
   *
   * Eteinte par defaut, et elle ne s'allume que si on la demande. Elle a l'air
   * de contredire l'app, et c'est pourtant ce qui fait tenir le blocage :
   * l'interdiction totale se contourne en desinstallant, la fenetre du samedi
   * soir se respecte. Mieux vaut un blocage garde six mois avec une heure
   * ouverte qu'un blocage parfait garde neuf jours.
   */
  valve: Valve;
  /**
   * Fin du laissez-passer minute, en horodatage. 0 quand il n'y en a pas.
   *
   * Une echeance et non un booleen : le temps la perime tout seul, sans
   * minuterie a tenir ni etat a rattraper si l'app est fermee entre-temps.
   */
  reelsUntil: number;
  /** Le mode publication : minutes accordees, et pauses par jour (zero : sans limite). */
  postMinutes: number;
  postLimit: number;
  /** Les apps ont ete posees sur l'ecran d'accueil : le badge de l'accueil disparait. */
  homeShortcutsDone: boolean;
  set: <K extends keyof State>(key: K, value: State[K]) => void;
};

export const useSettings = create<State>()(
  persist(
    (set) => ({
      haptics: true,
      reduceMotion: false,
      goalMinutes: 120,
      strictMode: false,
      hardMode: false,
      winbackSeen: false,
      blocking: false,
      selection: null,
      appleUser: null,
      // Sombre par defaut : c'est la matiere de l'app. Le clair existe pour
      // qui le demande, dans les reglages.
      theme: 'dark',
      // Samedi 20 h - 21 h : une heure, le soir ou personne n'a de raison de
      // se lever tot. Le jour et les heures se changent dans les reglages.
      valve: { on: false, day: 6, from: 20, to: 21 },
      reelsUntil: 0,
      postMinutes: 5,
      postLimit: 3,
      homeShortcutsDone: false,
      set: (key, value) => {
        set({ [key]: value } as Partial<State>);
        // L'haptique est un module global : on la synchronise tout de suite.
        if (key === 'haptics') setHapticsEnabled(value as boolean);
      },
    }),
    {
      name: 'noreel.settings',
      storage: createJSONStorage(() => AsyncStorage),
      // Le theme par defaut a change deux fois. Le changer dans l'etat
      // initial ne suffit pas : un telephone qui a deja lance l'app garde SA
      // valeur enregistree. Chaque montee de version la remet une fois, sans
      // toucher au reste ; ensuite le choix de l'utilisateur tient.
      version: 2,
      migrate: (state, from) => {
        const s = state as Partial<State> | undefined;
        if (!s) return s;
        if (from < 2) return { ...s, theme: 'dark' as ThemeName };
        return s;
      },
      partialize: ({ haptics, reduceMotion, goalMinutes, strictMode, hardMode, winbackSeen, blocking, selection, appleUser, theme, valve, reelsUntil }) =>
        ({ haptics, reduceMotion, goalMinutes, strictMode, hardMode, winbackSeen, blocking, selection, appleUser, theme, valve, reelsUntil }),
      onRehydrateStorage: () => (s) => {
        if (s) setHapticsEnabled(s.haptics);
      },
    }
  )
);
