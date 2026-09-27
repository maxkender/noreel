import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

/*
 * Le rappel avant la fin de l'essai.
 *
 * Le paywall annonce « jour 2 : on te previent, il reste 24 h ». Cette
 * phrase est la raison d'etre de ce fichier : une promesse ecrite sur un
 * ecran de vente doit avoir du code derriere elle, sinon c'est une phrase
 * qui vend et qui mente. Un essai dont on decouvre la fin par le
 * prelevement, c'est un remboursement demande et un avis a une etoile.
 *
 * Apple envoie parfois son propre courriel, parfois non, et jamais a une
 * heure qu'on choisit. On programme donc le notre.
 */

const KEY = 'trial.reminder';
/** L'essai dure 3 jours ; on previent 24 h avant la fin. */
const WARN_AFTER_H = 48;

/**
 * Le gestionnaire d'affichage, a poser une fois au demarrage.
 *
 * Sans lui, une notification qui arrive pendant que l'app est ouverte est
 * avalee en silence : c'est justement le cas ou la personne est en train de
 * se demander si elle garde l'abonnement.
 */
export function startNotifications(): void {
  Notifications.setNotificationHandler({
    // Les noms ont change : `shouldShowAlert` n'existe plus, il se remplace
    // par la banniere et la liste. L'ancien nom ne provoque aucune erreur,
    // il ne fait simplement plus rien — donc rien ne s'affichait.
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Programme le rappel, au moment ou l'essai demarre.
 *
 * Idempotent : deux achats, ou un achat puis une restauration, ne doivent
 * pas empiler deux rappels. On garde l'identifiant sur le disque et on
 * annule l'ancien avant d'en poser un nouveau.
 */
export async function scheduleTrialReminder(): Promise<void> {
  try {
    await cancelTrialReminder();

    // Si la personne a refuse les notifications en s'inscrivant, iOS repond
    // « refuse » sans rien afficher : on n'insiste pas, et on ne casse rien.
    const { granted, canAskAgain } = await Notifications.getPermissionsAsync();
    if (!granted) {
      if (!canAskAgain) return;
      const ask = await Notifications.requestPermissionsAsync();
      if (!ask.granted) return;
    }

    const date = new Date(Date.now() + WARN_AFTER_H * 3600 * 1000);
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Il te reste 24 h d’essai',
        body: 'Si UnSwipe ne te sert pas, annule maintenant : tu ne paieras rien.',
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
    });
    await AsyncStorage.setItem(KEY, id);
  } catch {
    /* Un rappel qu'on n'a pas pu poser ne doit pas faire echouer un achat. */
  }
}

/** Annule le rappel : l'abonnement a ete rendu, ou un nouveau va le remplacer. */
export async function cancelTrialReminder(): Promise<void> {
  const id = await AsyncStorage.getItem(KEY);
  if (!id) return;
  await AsyncStorage.removeItem(KEY);
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    /* deja parti, ou jamais pose */
  }
}
