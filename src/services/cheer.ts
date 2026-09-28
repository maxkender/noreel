import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'unswipe.cheer.v1';

/*
 * Les paliers qui meritent la sequence complete.
 *
 * Le studio est formel : la sequence de six secondes ne se joue pas a chaque
 * changement de niveau — pour ca, le ressort de la mascotte suffit. Elle se
 * joue au septieme jour et au trentieme, une fois chacun. Une celebration
 * qu'on peut revoir en revenant sur l'onglet n'en est plus une ; et six
 * secondes imposees a chaque visite deviendraient une attente.
 */
const CHEER = [2, 3];

/*
 * Les paliers deja reclames pendant cette session.
 *
 * Le disque ne suffit pas a lui seul : lire puis ecrire prend deux tours de
 * boucle, et deux appels lances ensemble lisent tous les deux « rien de
 * celebre » avant que le premier n'ait ecrit. React monte justement les effets
 * DEUX FOIS en developpement. Ce verrou-ci est synchrone, donc il tranche
 * avant la premiere attente.
 */
const claimed = new Set<number>();

/**
 * Ce palier a-t-il droit a sa sequence ?
 *
 * On MARQUE avant de rendre la main, pas apres l'avoir jouee : deux montages
 * rapproches de la carte — un changement d'onglet, un retour d'arriere-plan —
 * poseraient sinon la question deux fois et obtiendraient deux fois oui.
 */
export async function claimCheer(level: number): Promise<boolean> {
  if (!CHEER.includes(level) || claimed.has(level)) return false;
  claimed.add(level);
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const seen: number[] = raw ? JSON.parse(raw) : [];
    if (seen.includes(level)) return false;
    await AsyncStorage.setItem(KEY, JSON.stringify([...seen, level]));
    return true;
  } catch {
    // Un stockage muet ne doit pas faire rater la carte : on se contente de
    // ne rien celebrer.
    return false;
  }
}

/** Pour les tests : le verrou de session ne survit pas a un scenario. */
export function __resetCheer(): void {
  claimed.clear();
}
