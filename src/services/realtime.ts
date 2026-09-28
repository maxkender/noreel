import * as DA from 'react-native-device-activity';
import { FAMILY_CONTROLS_ENABLED } from './shield.real';

/*
 * Le VRAI temps passe dans les vraies apps.
 *
 * Apple ne le donne pas. C'est une frontiere de vie privee voulue, et non un
 * manque : le rapport de Temps d'ecran s'affiche dans une extension isolee, et
 * les nombres ne traversent jamais vers l'app hote. Aucune app tierce ne lit
 * « tu as passe 47 minutes sur Instagram ». Celles qui pretendent le faire
 * demandent en realite de recopier le chiffre a la main.
 *
 * Ce qu'Apple donne, c'est un REVEIL : on declare a l'avance des seuils, et
 * iOS previent quand l'un est franchi. On en pose donc toute une echelle. Si
 * le seuil de trente minutes a sonne aujourd'hui et pas celui de quarante-cinq,
 * on sait avec certitude — et sans rien inventer — qu'il y a eu entre trente
 * et quarante-cinq minutes. C'est grossier, et c'est vrai.
 *
 * On ne rend donc jamais un nombre exact : on rend un PLANCHER, et l'ecran
 * doit l'ecrire comme tel. « Au moins 30 min » est une phrase qu'on peut
 * tenir ; « 34 min » serait une phrase inventee, sur le seul chiffre que les
 * gens viennent verifier.
 */

/** Le nom de la surveillance. Un seul, sinon les seuils se dupliquent. */
const ACTIVITY = 'unswipe.watch';

/**
 * L'echelle des seuils, en minutes.
 *
 * Serree au debut, large ensuite : la difference entre dix et vingt minutes
 * change la phrase qu'on affiche, celle entre quatre et cinq heures ne change
 * plus rien. Chaque seuil coute une inscription aupres du systeme, et Apple
 * en limite le nombre — d'ou une echelle courte plutot qu'une minute par
 * minute.
 */
const LADDER = [5, 10, 15, 30, 45, 60, 90, 120, 180, 240, 300] as const;

const NAME = (m: number) => `m${m}`;

/** Minuit a minuit, tous les jours : le seuil se remet a zero avec la journee. */
const DAILY = {
  intervalStart: { hour: 0, minute: 0 },
  intervalEnd: { hour: 23, minute: 59 },
  repeats: true,
};

/**
 * Poser les reveils sur la selection d'apps.
 *
 * A rappeler quand la selection change : les seuils portent sur ELLE, et une
 * surveillance posee sur l'ancienne selection compterait les mauvaises apps.
 * Relancer la meme surveillance la remplace, c'est ce qu'on veut.
 */
export async function watchReal(selection: string | null): Promise<boolean> {
  if (!FAMILY_CONTROLS_ENABLED || !selection) return false;
  try {
    await DA.startMonitoring(
      ACTIVITY,
      DAILY,
      LADDER.map((m) => ({
        eventName: NAME(m),
        familyActivitySelection: selection,
        threshold: { minute: m },
        // Le temps deja passe AVANT qu'on pose le reveil compte aussi : sans
        // ca, quelqu'un qui arme le blocage a midi repartirait de zero et
        // verrait « 0 min » apres une matinee entiere.
        includesPastActivity: true,
      }))
    );
    return true;
  } catch {
    // Pas d'autorisation, pas de selection valide, trop de seuils : rien de
    // tout cela ne doit empecher le reste de l'app de fonctionner.
    return false;
  }
}

/** Ne plus surveiller : la selection est vide, ou le blocage est desarme. */
export function stopWatching(): void {
  if (!FAMILY_CONTROLS_ENABLED) return;
  try { DA.stopMonitoring([ACTIVITY]); } catch { /* deja arrete */ }
}

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear()
  && a.getMonth() === b.getMonth()
  && a.getDate() === b.getDate();

/**
 * Le plancher du jour, en minutes — ou nul si on ne sait rien.
 *
 * Nul et zero ne veulent pas dire la meme chose. Zero, c'est « aucun seuil
 * n'a sonne, donc moins de cinq minutes ». Nul, c'est « on n'a pas le droit
 * de savoir » — pas d'autorisation, pas de selection, ou l'app tourne sans
 * l'entitlement. L'ecran doit dire deux choses differentes, et il ne le peut
 * que si les deux cas se distinguent.
 */
export function realFloorToday(): number | null {
  if (!FAMILY_CONTROLS_ENABLED) return null;
  try {
    const now = new Date();
    const fired = DA.getEvents(ACTIVITY)
      .filter((e) => e.callbackName === 'eventDidReachThreshold')
      .filter((e) => e.lastCalledAt && sameDay(new Date(e.lastCalledAt), now))
      .map((e) => LADDER.find((m) => NAME(m) === e.eventName) ?? 0);
    return fired.length ? Math.max(...fired) : 0;
  } catch {
    return null;
  }
}

export type Combined = {
  /** Ce qu'on a mesure nous-memes, a la minute. */
  filtered: number;
  /** Le plancher venu d'iOS, ou nul quand on ne sait pas. */
  realFloor: number | null;
  /** Le total a afficher. */
  total: number;
  /** Vrai quand le total est un plancher : l'ecran doit ecrire « au moins ». */
  atLeast: boolean;
};

/**
 * Les deux temps, mis bout a bout.
 *
 * Le notre est exact — c'est notre propre ecran, on le chronometre. Celui des
 * vraies apps est un plancher. Additionner un chiffre exact et un plancher
 * donne un plancher : d'ou le drapeau, pour que l'ecran n'affiche jamais un
 * total precis qu'il ne peut pas tenir.
 */
export function combine(filtered: number, realFloor: number | null): Combined {
  if (realFloor === null) {
    return { filtered, realFloor: null, total: filtered, atLeast: false };
  }
  return {
    filtered,
    realFloor,
    total: filtered + realFloor,
    // Un plancher a zero n'en est pas un : personne n'a franchi le premier
    // seuil, et « au moins 12 min » quand on en a mesure 12 se lit comme une
    // precaution inutile.
    atLeast: realFloor > 0,
  };
}
