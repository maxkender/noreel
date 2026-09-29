import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Cookies } from '@react-native-cookies/cookies';
import type { ClientId } from '@/features/client/blockers';

/** Un compte enregistre : son pseudo, sa photo, et sa session (les cookies). */
export type Session = {
  user: string;
  avatar?: string;
  cookies: Cookies;
  savedAt: number;
};

type State = {
  /** Les comptes enregistres, par app. */
  sessions: Record<ClientId, Session[]>;
  /** Le pseudo du compte en cours, par app. */
  current: Partial<Record<ClientId, string>>;
  upsert: (id: ClientId, s: Session) => void;
  remove: (id: ClientId, user: string) => void;
  setCurrent: (id: ClientId, user: string | null) => void;
  setAvatar: (id: ClientId, user: string, avatar: string) => void;
};

const EMPTY: Record<ClientId, Session[]> = { instagram: [], tiktok: [], twitter: [], youtube: [] };

/**
 * Les comptes, tenus par NOUS.
 *
 * Le selecteur d'Instagram etait actionne a l'aveugle, en cliquant dans sa
 * page : quand il bougeait d'une version a l'autre, rien ne se passait. On
 * ne peut pas non plus lire sa liste de comptes. Alors on garde la session
 * de chaque compte — ses cookies — au moment ou l'on sait qui est connecte,
 * et changer de compte, c'est remettre ces cookies et recharger. Pseudo et
 * photo sont lus sur la page, une fois, et gardes avec.
 */
export const useSessions = create<State>()(
  persist(
    (set) => ({
      sessions: EMPTY,
      current: {},
      upsert: (id, s) => set((st) => {
        const list = st.sessions[id] ?? [];
        const i = list.findIndex((x) => x.user === s.user);
        const next = i >= 0
          ? list.map((x, k) => (k === i ? { ...x, ...s, avatar: s.avatar ?? x.avatar } : x))
          : [...list, s];
        return { sessions: { ...st.sessions, [id]: next }, current: { ...st.current, [id]: s.user } };
      }),
      remove: (id, user) => set((st) => ({
        sessions: { ...st.sessions, [id]: (st.sessions[id] ?? []).filter((x) => x.user !== user) },
        current: st.current[id] === user ? { ...st.current, [id]: undefined } : st.current,
      })),
      setCurrent: (id, user) => set((st) => ({ current: { ...st.current, [id]: user ?? undefined } })),
      setAvatar: (id, user, avatar) => set((st) => ({
        sessions: { ...st.sessions, [id]: (st.sessions[id] ?? []).map((x) => (x.user === user ? { ...x, avatar } : x)) },
      })),
    }),
    {
      name: 'unswipe.sessions.v1',
      storage: createJSONStorage(() => AsyncStorage),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>;
        return { ...current, ...p, sessions: { ...EMPTY, ...(p.sessions ?? {}) } };
      },
    }
  )
);
