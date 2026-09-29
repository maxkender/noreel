import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** Un objectif cree par la personne : un nom, un emoji, ses points. */
export type Goal = { id: string; title: string; emoji: string; points: number };

/** Les emojis proposes a la creation : de quoi reconnaitre l'objectif d'un coup d'oeil. */
export const GOAL_EMOJIS = ['🎯', '📚', '🏃', '🎹', '🧘', '💪', '✍️', '🌿', '💤', '🚿', '🎨', '🥦'] as const;
/** Les points qu'un objectif peut valoir. */
export const GOAL_POINTS = [10, 15, 20] as const;

type State = {
  goals: Goal[];
  add: (title: string, emoji: string, points: number) => Goal | null;
  remove: (id: string) => void;
};

/**
 * Les objectifs de la personne, a cote des gestes fournis.
 *
 * Ils comptent comme les autres : trois par jour au plus, et leurs points
 * sont ecrits dans le registre au moment ou on les coche — supprimer un
 * objectif ne retire donc rien de ce qu'il a deja rapporte.
 */
export const useGoals = create<State>()(
  persist(
    (set, get) => ({
      goals: [],
      add: (title, emoji, points) => {
        const name = title.trim().slice(0, 48);
        if (!name) return null;
        const goal: Goal = { id: `g${Date.now().toString(36)}`, title: name, emoji, points };
        set({ goals: [...get().goals, goal] });
        return goal;
      },
      remove: (id) => set({ goals: get().goals.filter((g) => g.id !== id) }),
    }),
    { name: 'unswipe.goals.v1', storage: createJSONStorage(() => AsyncStorage) }
  )
);
