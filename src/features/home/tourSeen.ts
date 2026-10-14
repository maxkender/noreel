import AsyncStorage from '@react-native-async-storage/async-storage';

export type TourId = 'home' | 'block';
const KEY = 'unswipe.tours.v1';

/*
 * La story d'un onglet, vue ou pas.
 *
 * Elle se montre a la toute premiere visite et jamais plus — sauf si on la
 * redemande. Une story deja lue est une story qu'on passe en tapant, et on
 * n'apprend a personne a taper pour passer ce qu'on lui montre.
 */
export async function tourSeen(id: TourId): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const seen: string[] = raw ? JSON.parse(raw) : [];
    return seen.includes(id);
  } catch {
    return true;
  }
}

export async function markTourSeen(id: TourId): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const seen: string[] = raw ? JSON.parse(raw) : [];
    if (!seen.includes(id)) await AsyncStorage.setItem(KEY, JSON.stringify([...seen, id]));
  } catch { /* le disque, pas nous */ }
}

/** Recommencer le parcours les remontre toutes. */
export async function resetTours(): Promise<void> {
  try { await AsyncStorage.removeItem(KEY); } catch { /* idem */ }
}
