import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';

const KEY = 'unswipe.review.v1';

/*
 * La feuille de note d'Apple, demandee UNE fois par occasion.
 *
 * Apple la plafonne a trois apparitions par an et ne dit jamais si elle
 * s'est montree ; sur TestFlight elle ne se montre pas du tout. On retient
 * donc seulement qu'on l'a demandee, par occasion — « first-close », la
 * premiere fois qu'on ferme Instagram ; « day7 », au badge de la semaine —
 * et on ne redemande jamais la meme.
 */
export async function requestReviewOnce(occasion: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const done: string[] = raw ? JSON.parse(raw) : [];
    if (done.includes(occasion)) return;
    await AsyncStorage.setItem(KEY, JSON.stringify([...done, occasion]));
    if (await StoreReview.hasAction()) await StoreReview.requestReview();
  } catch { /* un avis n'est pas une etape a franchir */ }
}
