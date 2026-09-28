import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ClientId } from './blockers';

const KEY = 'unswipe.seen-client.v1';

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
    if (seen.includes(id)) return null;
    await AsyncStorage.setItem(KEY, JSON.stringify([...seen, id]));
    return login;
  } catch {
    return null;
  }
}

/** Pour les tests : le disque garde le drapeau, pas cette fonction. */
export const FIRST_RUN_KEY = KEY;
