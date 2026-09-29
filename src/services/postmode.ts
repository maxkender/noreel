import { useEffect } from 'react';
import { AppState, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DA from 'react-native-device-activity';
import { FAMILY_CONTROLS_ENABLED } from './shield.real';
import { dayKey } from './usage';

/*
 * Le mode publication : lever le blocage le temps de publier, et le
 * remettre tout seul.
 *
 * Instagram limite ce qu'on peut publier depuis sa version web. Qui veut
 * poster doit ouvrir la vraie app — que nous bloquons. On leve donc le
 * blocage pour quelques minutes et on ouvre Instagram. Ce qui compte, c'est
 * le RETOUR du blocage sans qu'on y pense : le systeme surveille la
 * selection, et quand elle a ete utilisee le temps accorde — ou au bout
 * d'une heure quoi qu'il arrive — l'extension de suivi le remet, meme si
 * UnSwipe est ferme. L'app le remet aussi des qu'elle revient au premier
 * plan apres l'echeance : deux ceintures, pas une.
 */

const KEY = 'unswipe.postmode.v1';
const ACTIVITY = 'postMode';
const SELECTION_ID = 'postModeSelection';
/** Quoi qu'il arrive, la fenetre se referme au bout d'une heure. */
const WINDOW_MIN = 60;
export const POST_MIN = 1;
export const POST_MAX = 15;

export type PostLedger = { day: string; used: number; until: number };
export type PostStart = 'unlocked' | 'opened' | 'limited' | 'failed';

async function load(): Promise<PostLedger> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const l: PostLedger = raw ? JSON.parse(raw) : { day: '', used: 0, until: 0 };
    // Une autre journee : le compte repart, l'echeance d'hier ne vaut plus rien.
    return l.day === dayKey() ? l : { day: dayKey(), used: 0, until: l.until };
  } catch {
    return { day: dayKey(), used: 0, until: 0 };
  }
}

async function save(l: PostLedger): Promise<void> {
  try { await AsyncStorage.setItem(KEY, JSON.stringify(l)); } catch { /* le disque, pas nous */ }
}

/** Peut-on lever le blocage encore aujourd'hui ? Zero veut dire sans limite. */
export function canStart(usedToday: number, limit: number): boolean {
  return limit <= 0 || usedToday < limit;
}

/**
 * La fin de la fenetre de surveillance, en heure et minute.
 *
 * Une planification ne connait que des heures dans la journee : une fenetre
 * qui franchit minuit se refermerait a une heure du matin de la veille. On
 * la borne donc a 23 h 59 — elle est plus courte, jamais fausse.
 */
export function windowEnd(now: Date, minutes: number): { hour: number; minute: number } {
  const end = new Date(now.getTime() + minutes * 60_000);
  if (end.getDate() !== now.getDate()) return { hour: 23, minute: 59 };
  return { hour: end.getHours(), minute: end.getMinutes() };
}

export async function postModeStatus(): Promise<{ usedToday: number; until: number }> {
  const l = await load();
  return { usedToday: l.used, until: l.until };
}

/** Ouvrir la vraie app. Le schema d'abord ; le lien universel ensuite. */
async function openApp(): Promise<void> {
  try { await Linking.openURL('instagram://app'); } catch {
    try { await Linking.openURL('https://www.instagram.com/'); } catch { /* rien a ouvrir */ }
  }
}

/**
 * Lever le blocage pour publier.
 *
 * Sans blocage arme ou sans selection, il n'y a rien a lever : on ouvre
 * l'app, point. Sinon on pose la surveillance AVANT de lever, pour que le
 * retour soit garanti meme si la suite echoue.
 */
export async function startPostMode(
  selection: string | null, blocking: boolean, minutes: number, limit: number,
): Promise<PostStart> {
  const l = await load();
  if (!canStart(l.used, limit)) return 'limited';
  if (!FAMILY_CONTROLS_ENABLED || !blocking || !selection) {
    await openApp();
    return 'opened';
  }
  try {
    const now = new Date();
    DA.setFamilyActivitySelectionId({ id: SELECTION_ID, familyActivitySelection: selection });
    // Le retour du blocage : quand le temps accorde a ete utilise…
    DA.configureActions({
      activityName: ACTIVITY, callbackName: 'eventDidReachThreshold', eventName: 'postDone',
      actions: [{ type: 'blockSelection', familyActivitySelectionId: SELECTION_ID }],
    });
    // …et au plus tard a la fin de la fenetre, quoi qu'il arrive.
    DA.configureActions({
      activityName: ACTIVITY, callbackName: 'intervalDidEnd',
      actions: [{ type: 'blockSelection', familyActivitySelectionId: SELECTION_ID }],
    });
    await DA.startMonitoring(
      ACTIVITY,
      {
        intervalStart: { hour: now.getHours(), minute: now.getMinutes() },
        intervalEnd: windowEnd(now, WINDOW_MIN),
        repeats: false,
      },
      [{ eventName: 'postDone', familyActivitySelection: selection, threshold: { minute: minutes } }],
    );
    DA.resetBlocks();
    await save({ day: dayKey(), used: l.used + 1, until: now.getTime() + minutes * 60_000 });
    await openApp();
    return 'unlocked';
  } catch {
    return 'failed';
  }
}

/** Remettre le blocage, et oublier la fenetre. */
export async function endPostMode(selection: string | null): Promise<void> {
  const l = await load();
  await save({ ...l, until: 0 });
  if (!FAMILY_CONTROLS_ENABLED) return;
  try { DA.stopMonitoring([ACTIVITY]); } catch { /* deja arretee */ }
  try { if (selection) DA.blockSelection({ activitySelectionToken: selection }); } catch { /* pas critique */ }
}

/** L'echeance est passee et le blocage est arme : on le remet, ici et maintenant. */
export async function reconcilePostMode(selection: string | null, blocking: boolean): Promise<boolean> {
  const l = await load();
  if (!l.until || Date.now() < l.until) return false;
  if (blocking) await endPostMode(selection);
  else await save({ ...l, until: 0 });
  return true;
}

/** A poser sur les ecrans ou l'on revient : l'app au premier plan verifie l'echeance. */
export function usePostModeReconcile(selection: string | null, blocking: boolean): void {
  useEffect(() => {
    void reconcilePostMode(selection, blocking);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void reconcilePostMode(selection, blocking);
    });
    return () => sub.remove();
  }, [selection, blocking]);
}
