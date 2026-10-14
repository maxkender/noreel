import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

/*
 * La fin de l'essai : une MENTION dans les reglages, jamais une notification.
 *
 * Le fondateur ne veut pas de push pour l'essai. Les reglages affichent le
 * temps qui reste (« se termine dans 1 jour »), lu sur l'abonnement lui-meme.
 * Les versions precedentes programmaient une notification a 48 h : on
 * l'annule au demarrage chez ceux qui l'ont encore.
 */

const KEY = 'trial.reminder';

/**
 * Le gestionnaire d'affichage, a poser une fois au demarrage.
 *
 * Sans lui, une notification qui arrive pendant que l'app est ouverte est
 * avalee en silence : c'est justement le cas ou la personne est en train de
 * se demander si elle garde l'abonnement.
 */
export function startNotifications(): void {
  // Android range chaque notification dans un canal : sans lui, rien ne s'affiche.
  if (Platform.OS === 'android') {
    void Notifications.setNotificationChannelAsync('default', {
      name: 'UnSwipe', importance: Notifications.AndroidImportance.DEFAULT,
    }).catch(() => {});
  }
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
  // Plus de push pour l'essai : on retire celui qu'une ancienne version a pu poser.
  void cancelTrialReminder().catch(() => {});
}

/** Annule le rappel pose par une ancienne version, s'il est encore la. */
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

/** Le temps qui reste, sous la forme qu'on affiche. */
export type TrialLeft = { kind: 'days'; n: number } | { kind: 'day' } | { kind: 'hours'; h: number };

/**
 * « dans 3 jours », « dans 1 jour », « dans 5 h ».
 *
 * Arrondi au plus proche au-dela de 36 h, pour qu'un essai tout neuf de
 * 3 jours moins une minute dise 3 et non 2. Sous 20 h, on compte en heures :
 * « dans 1 jour » a 3 h de la fin serait un mensonge par arrondi.
 */
export function trialLeft(expires: Date, now: Date = new Date()): TrialLeft {
  const ms = Math.max(0, expires.getTime() - now.getTime());
  const H = 3600 * 1000;
  if (ms >= 36 * H) return { kind: 'days', n: Math.max(2, Math.round(ms / (24 * H))) };
  if (ms >= 20 * H) return { kind: 'day' };
  return { kind: 'hours', h: Math.max(1, Math.ceil(ms / H)) };
}
