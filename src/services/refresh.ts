import * as Updates from 'expo-updates';

/*
 * La fiabilite est une fonctionnalite.
 *
 * La panne qui coute le plus d'abonnements n'est pas un plantage : c'est
 * Instagram qui remanie sa structure, une regle qui ne trouve plus rien, et
 * un reel qui passe. La personne en conclut que l'app est cassee et annule,
 * sans jamais nous ecrire.
 *
 * Nos regles vivent dans le paquet JavaScript, et expo-updates sait le
 * remplacer sans passer par la revue de l'App Store : un selecteur corrige
 * part en quelques minutes au lieu de quelques jours. On ne telecharge donc
 * AUCUN code par un canal a nous — ce serait l'interdiction 2.5.2 — on se
 * sert du canal prevu pour ca.
 */

export type Pull = 'none' | 'ready' | 'off' | 'failed';

/**
 * Cherche une mise a jour et la telecharge, sans redemarrer.
 *
 * Appele au retour au premier plan. On ne redemarre PAS de notre propre chef :
 * l'app relancee sous les doigts de quelqu'un qui lisait ses messages est une
 * panne de plus, pas un correctif. Le paquet telecharge prend la main au
 * prochain lancement, ce qu'expo-updates fait tout seul.
 */
export async function pullUpdate(): Promise<Pull> {
  // En developpement le module est inactif : l'appeler y leve une exception.
  if (!Updates.isEnabled) return 'off';
  try {
    const found = await Updates.checkForUpdateAsync();
    if (!found.isAvailable) return 'none';
    await Updates.fetchUpdateAsync();
    return 'ready';
  } catch {
    // Hors ligne, ou serveur muet : ce n'est pas une erreur a montrer.
    return 'failed';
  }
}

/**
 * Cherche, telecharge, et redemarre tout de suite.
 *
 * Reserve au geste explicite : on arrive ici parce que la personne a touche
 * « verifier » sur un filtre qui semble casse. La, le redemarrage est ce
 * qu'elle demande.
 */
export async function pullAndRestart(): Promise<Pull> {
  const r = await pullUpdate();
  if (r === 'ready') {
    await Updates.reloadAsync();
  }
  return r;
}
