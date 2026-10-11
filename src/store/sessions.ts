import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Cookies } from '@react-native-cookies/cookies';
import type { ClientId } from '@/features/client/blockers';

/** Un compte enregistre : son identifiant chez le site, son pseudo, sa photo, et sa session. */
export type Session = {
  /** L'identifiant du compte chez le site, lu dans la session. C'est LUI qui distingue deux comptes. */
  uid: string;
  user: string;
  avatar?: string;
  cookies: Cookies;
  savedAt: number;
};

type State = {
  /** Les comptes enregistres, par app. */
  sessions: Record<ClientId, Session[]>;
  /** L'identifiant du compte en cours, par app. */
  current: Partial<Record<ClientId, string>>;
  upsert: (id: ClientId, s: Session) => void;
  remove: (id: ClientId, uid: string) => void;
  setCurrent: (id: ClientId, uid: string | null) => void;
  setAvatar: (id: ClientId, uid: string, avatar: string) => void;
};

const EMPTY: Record<ClientId, Session[]> = { instagram: [], tiktok: [], twitter: [], youtube: [] };

/** L'identifiant d'un compte, d'apres sa session. Instagram l'ecrit dans « ds_user_id ». */
export function uidOf(cookies: Cookies): string | null {
  const v = cookies.ds_user_id?.value;
  return v ? String(v) : null;
}

/*
 * Les comptes, tenus par NOUS — et distingues par leur IDENTIFIANT.
 *
 * Ils etaient ranges sous le pseudo lu sur la page. Quand la lecture se
 * trompait — un lien de profil qui n'etait pas le sien — la session en cours
 * etait rangee sous un autre nom, et deux « comptes » portaient en fait la
 * meme session : en choisir un ramenait sur le meme. L'identifiant du
 * compte, lui, vient de la session elle-meme et ne se devine pas. Le pseudo
 * et la photo ne sont que l'etiquette.
 */
export const useSessions = create<State>()(
  persist(
    (set) => ({
      sessions: EMPTY,
      current: {},
      upsert: (id, s) => set((st) => {
        const list = st.sessions[id] ?? [];
        const i = list.findIndex((x) => x.uid === s.uid);
        const next = i >= 0
          ? list.map((x, k) => (k === i ? { ...x, ...s, user: s.user || x.user, avatar: s.avatar ?? x.avatar } : x))
          : [...list, s];
        return { sessions: { ...st.sessions, [id]: next }, current: { ...st.current, [id]: s.uid } };
      }),
      remove: (id, uid) => set((st) => ({
        sessions: { ...st.sessions, [id]: (st.sessions[id] ?? []).filter((x) => x.uid !== uid) },
        current: st.current[id] === uid ? { ...st.current, [id]: undefined } : st.current,
      })),
      setCurrent: (id, uid) => set((st) => ({ current: { ...st.current, [id]: uid ?? undefined } })),
      setAvatar: (id, uid, avatar) => set((st) => ({
        sessions: { ...st.sessions, [id]: (st.sessions[id] ?? []).map((x) => (x.uid === uid ? { ...x, avatar } : x)) },
      })),
    }),
    {
      name: 'unswipe.sessions.v1',
      storage: createJSONStorage(() => AsyncStorage),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>;
        return { ...current, ...p, sessions: migrate({ ...EMPTY, ...(p.sessions ?? {}) }), current: migrateCurrent(p) };
      },
    }
  )
);

/*
 * Les comptes gardes avant l'identifiant : on le lit dans leur session, et
 * deux entrees qui portent la meme session ne font plus qu'un compte — le
 * plus recent garde le nom.
 */
export function migrate(all: Record<ClientId, Session[]>): Record<ClientId, Session[]> {
  const out = { ...EMPTY };
  for (const id of Object.keys(all) as ClientId[]) {
    const byUid = new Map<string, Session>();
    for (const s of [...(all[id] ?? [])].sort((a, b) => a.savedAt - b.savedAt)) {
      const uid = s.uid || uidOf(s.cookies ?? {}) || s.user;
      if (!uid) continue;
      const prev = byUid.get(uid);
      byUid.set(uid, { ...prev, ...s, uid, avatar: s.avatar ?? prev?.avatar });
    }
    out[id] = [...byUid.values()];
  }
  return out;
}

function migrateCurrent(p: Partial<State>): Partial<Record<ClientId, string>> {
  const cur = { ...(p.current ?? {}) };
  const all = p.sessions ?? EMPTY;
  for (const id of Object.keys(cur) as ClientId[]) {
    const v = cur[id];
    if (!v) continue;
    // L'ancienne valeur etait un pseudo : on retrouve l'identifiant du compte.
    const hit = (all[id] ?? []).find((s) => s.uid === v || s.user === v);
    cur[id] = hit ? (hit.uid || uidOf(hit.cookies ?? {}) || hit.user) : undefined;
  }
  return cur;
}
