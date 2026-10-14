import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { ClientId } from './blockers';

/*
  v2 sur Android : jusqu'a la version 11, l'ecran plantait a sa premiere
  ouverture, APRES avoir deja note « on est venu ». Les testeurs Android ne
  sont donc jamais passes par la connexion ; on leur repropose, une fois.
*/
const KEY = Platform.OS === 'android' ? 'unswipe.seen-client.v2' : 'unswipe.seen-client.v1';

/*
 * La toute premiere ouverture d'une app.
 *
 * On arrivait sur le fil, qui renvoie une page vide tant qu'on n'est pas
 * connecte : rien n'indiquait qu'il fallait se connecter, ni ou. Le premier
 * passage mene donc directement a la page de connexion du site, et les
 * suivants a l'endroit habituel.
 *
 * Le drapeau dit « on est deja venu », pas « on est connecte » : l'app ne
 * voit pas les cookies du site et n'a aucun moyen honnete de savoir si la
 * session tient toujours. Se tromper une fois coute un aller-retour ; pretendre
 * le savoir couterait la confiance.
 */
export async function firstRunUrl(id: ClientId, login?: string): Promise<string | null> {
  if (!login) return null;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const seen: string[] = raw ? JSON.parse(raw) : [];
    return seen.includes(id) ? null : login;
  } catch {
    return null;
  }
}

/**
 * La page de connexion s'est VRAIMENT affichee.
 *
 * On ne le note qu'ici, et plus a l'ouverture de l'ecran : un ecran qui
 * plante ou qu'on ferme avant le chargement ne doit pas faire croire qu'on
 * est deja passe par la connexion.
 */
export async function markFirstRunDone(id: ClientId): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const seen: string[] = raw ? JSON.parse(raw) : [];
    if (!seen.includes(id)) await AsyncStorage.setItem(KEY, JSON.stringify([...seen, id]));
  } catch { /* le disque, pas nous */ }
}

/**
 * Oublier qu'on est deja venu.
 *
 * Recommencer le parcours doit ramener a la page de connexion, comme la
 * premiere fois : le drapeau vivait plus longtemps que l'onboarding, et
 * apres une remise a zero on retombait sur un fil vide sans explication.
 */
export async function resetFirstRun(): Promise<void> {
  try { await AsyncStorage.removeItem(KEY); } catch { /* le disque, pas nous */ }
}

/** Pour les tests : le disque garde le drapeau, pas cette fonction. */
export const FIRST_RUN_KEY = KEY;
