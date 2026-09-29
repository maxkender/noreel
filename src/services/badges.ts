import AsyncStorage from '@react-native-async-storage/async-storage';

/*
 * Les badges : dix jalons qu'on peut montrer.
 *
 * L'indice de recuperation etait juste et illisible : un pourcentage qui
 * bouge de 2,4 par jour ne se raconte pas. Un badge, si — « une semaine »,
 * « mille Reels evites » — et il reste. Ils se calculent depuis le registre
 * (jours proteges, Reels refermes, gestes declares) : rien n'est stocke que
 * la liste de ceux qu'on a deja fetes, pour ne feter chacun qu'une fois.
 */
export type BadgeKind = 'days' | 'reels' | 'cares' | 'careDay';
export type Badge = { id: string; kind: BadgeKind; at: number };

export const BADGES: Badge[] = [
  { id: 'day1', kind: 'days', at: 1 },
  { id: 'day7', kind: 'days', at: 7 },
  { id: 'day30', kind: 'days', at: 30 },
  { id: 'day100', kind: 'days', at: 100 },
  { id: 'reels100', kind: 'reels', at: 100 },
  { id: 'reels1000', kind: 'reels', at: 1000 },
  { id: 'reels10000', kind: 'reels', at: 10000 },
  { id: 'care1', kind: 'cares', at: 1 },
  { id: 'care10', kind: 'cares', at: 10 },
  { id: 'care3', kind: 'careDay', at: 3 },
];

export type BadgeInput = { days: number; blocked: number; careTotal: number; careToday: string[] };

const value = (kind: BadgeKind, s: BadgeInput): number => (
  kind === 'days' ? s.days
    : kind === 'reels' ? s.blocked
      : kind === 'cares' ? s.careTotal
        : s.careToday.length
);

/** Ceux qu'on a, dans l'ordre de la liste. */
export function unlockedBadges(s: BadgeInput): string[] {
  return BADGES.filter((b) => value(b.kind, s) >= b.at).map((b) => b.id);
}

/** Ce qu'il manque pour l'avoir : zero quand on l'a. */
export function badgeGap(b: Badge, s: BadgeInput): number {
  return Math.max(0, b.at - value(b.kind, s));
}

const KEY = 'unswipe.badges.v1';

/**
 * Les badges gagnes qu'on n'a pas encore fetes — et on les marque fetes.
 *
 * Rendus dans l'ordre de la liste : apres une longue absence, on fete le
 * plus petit d'abord, puis les suivants, un a la fois.
 */
export async function claimBadges(s: BadgeInput): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const seen: string[] = raw ? JSON.parse(raw) : [];
    const fresh = unlockedBadges(s).filter((id) => !seen.includes(id));
    if (fresh.length) await AsyncStorage.setItem(KEY, JSON.stringify([...seen, ...fresh]));
    return fresh;
  } catch {
    return [];
  }
}

export async function resetBadges(): Promise<void> {
  try { await AsyncStorage.removeItem(KEY); } catch { /* le disque, pas nous */ }
}
