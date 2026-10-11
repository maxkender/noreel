/**
 * Deux comptes sont deux identifiants, jamais deux pseudos.
 * Une lecture de pseudo qui se trompe ne doit pas ranger la session en
 * cours sous un autre nom : c'est ce qui faisait « changer de compte »
 * pour retomber sur le meme.
 */
import { migrate, uidOf, useSessions, type Session } from './sessions';

const mk = (uid: string, user: string, at = 1): Session => ({
  uid, user, savedAt: at,
  cookies: { ds_user_id: { name: 'ds_user_id', value: uid }, sessionid: { name: 'sessionid', value: `s-${uid}` } },
});

beforeEach(() => { useSessions.setState({ sessions: { instagram: [], tiktok: [], twitter: [], youtube: [] }, current: {} }); });

it('lit l’identifiant dans la session', () => {
  expect(uidOf(mk('42', 'max').cookies)).toBe('42');
  expect(uidOf({})).toBeNull();
});

it('range un compte par identifiant, et le renomme sans le dedoubler', () => {
  const { upsert } = useSessions.getState();
  upsert('instagram', mk('42', 'max'));
  upsert('instagram', mk('42', 'maxime', 2));
  const list = useSessions.getState().sessions.instagram;
  expect(list).toHaveLength(1);
  expect(list[0].user).toBe('maxime');
  expect(useSessions.getState().current.instagram).toBe('42');
});

it('garde deux comptes distincts meme sous un pseudo mal lu', () => {
  const { upsert } = useSessions.getState();
  upsert('instagram', mk('42', 'max'));
  upsert('instagram', mk('7', 'max', 2));
  expect(useSessions.getState().sessions.instagram.map((s) => s.uid).sort()).toEqual(['42', '7']);
});

it('fusionne les anciens comptes qui portaient la meme session', () => {
  const old = [
    { ...mk('', 'max'), uid: '' },
    { ...mk('', 'pote', 2), uid: '' },
  ] as Session[];
  // Les deux portaient le compte 42 : une seule entree, le dernier nom lu.
  old[0].cookies = mk('42', 'max').cookies;
  old[1].cookies = mk('42', 'pote').cookies;
  const out = migrate({ instagram: old, tiktok: [], twitter: [], youtube: [] });
  expect(out.instagram).toHaveLength(1);
  expect(out.instagram[0].uid).toBe('42');
  expect(out.instagram[0].user).toBe('pote');
});
