import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ClientId } from './blockers';

const KEY = 'unswipe.tuto-client.v1';

/*
 * Le tutoriel d'une app, vu ou pas.
 *
 * Il se montre a la toute premiere ouverture et jamais plus : une story
 * qu'on a deja lue est une story qu'on passe en tapant, et on n'apprend a
 * personne a taper pour passer ce qu'on lui montre.
 */
export async function tutorialSeen(id: ClientId): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const seen: string[] = raw ? JSON.parse(raw) : [];
    return seen.includes(id);
  } catch {
    return true;
  }
}

export async function markTutorialSeen(id: ClientId): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const seen: string[] = raw ? JSON.parse(raw) : [];
    if (!seen.includes(id)) await AsyncStorage.setItem(KEY, JSON.stringify([...seen, id]));
  } catch { /* le disque, pas nous */ }
}

/** Recommencer le parcours le remontre : c'est la premiere fois, a nouveau. */
export async function resetTutorial(): Promise<void> {
  try { await AsyncStorage.removeItem(KEY); } catch { /* idem */ }
}
