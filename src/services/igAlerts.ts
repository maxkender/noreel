import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';

/*
 * LES ALERTES INSTAGRAM, SUR LE TELEPHONE.
 *
 * L'app Instagram n'est plus la pour prevenir : on verifie a sa place les
 * deux compteurs qu'affiche instagram.com — messages non lus et activite
 * (j'aime, commentaires, abonnements, identifications) — avec la session
 * deja ouverte dans UnSwipe, et on previent quand ils montent.
 *
 * Aucun serveur : la session ne quitte jamais le telephone. Le prix, c'est
 * que iOS choisit seul quand nous reveiller (BGTaskScheduler) — parfois
 * vite, parfois des heures plus tard, souvent en charge. On le dit a
 * l'ecran plutot que de promettre du temps reel.
 *
 * iOS seulement pour l'instant.
 */

export const IG_ALERTS_TASK = 'unswipe-instagram-alerts';
const KEY = 'unswipe.igalerts.v1';

const ORIGIN = 'https://www.instagram.com';
/** L'identifiant que le site web d'Instagram envoie avec ses propres requetes. */
const APP_ID = '936619743392459';
const UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) ' +
  'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

/** Ce qu'on garde : l'etat, les derniers compteurs vus, et les mots des notifications. */
type State = {
  on: boolean;
  dm: number;
  act: number;
  /** Les textes dans la langue de l'app, figes a l'activation : la tache tourne sans interface. */
  words: { title: string; dm: string; act: string };
};

const EMPTY: State = { on: false, dm: 0, act: 0, words: { title: 'Instagram', dm: '{n}', act: '{n}' } };

async function load(): Promise<State> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

async function save(s: State): Promise<void> {
  try { await AsyncStorage.setItem(KEY, JSON.stringify(s)); } catch { /* le disque, pas nous */ }
}

export type Counts = { dm: number; act: number };

/** Le compte d'activite qui merite une alerte : ce qui vient des autres. */
export function activityOf(counts: Record<string, number> | undefined): number {
  if (!counts) return 0;
  const keys = ['likes', 'comments', 'comment_likes', 'relationships', 'usertags', 'requests', 'photos_of_you'];
  return keys.reduce((n, k) => n + (typeof counts[k] === 'number' ? counts[k] : 0), 0);
}

async function get(path: string): Promise<Record<string, unknown> | null> {
  const r = await fetch(ORIGIN + path, {
    credentials: 'include',
    headers: { 'x-ig-app-id': APP_ID, 'x-requested-with': 'XMLHttpRequest', 'user-agent': UA, accept: '*/*' },
  });
  if (!r.ok) return null;
  const j = (await r.json()) as Record<string, unknown>;
  return j && j.status === 'ok' ? j : null;
}

/**
 * Les deux compteurs, maintenant. Null si la session ne passe pas
 * (deconnecte, ou Instagram qui refuse) : on ne previent jamais sur un doute.
 */
export async function readCounts(): Promise<Counts | null> {
  try {
    const badge = await get('/api/v1/direct_v2/get_badge_count/?no_raven=1');
    if (!badge || typeof badge.badge_count !== 'number') return null;
    const news = await get('/api/v1/news/inbox/');
    return { dm: badge.badge_count, act: activityOf(news?.counts as Record<string, number> | undefined) };
  } catch {
    return null;
  }
}

/** Ce qui a monte depuis la derniere fois, en phrases. Vide si rien de neuf. */
export function newsLines(prev: Counts, now: Counts, words: State['words']): string[] {
  const lines: string[] = [];
  if (now.dm > prev.dm) lines.push(words.dm.replace('{n}', String(now.dm)));
  if (now.act > prev.act) lines.push(words.act.replace('{n}', String(now.act)));
  return lines;
}

/** Une verification : compare, previent si ca monte, retient les compteurs. */
export async function checkOnce(notify = true): Promise<'news' | 'quiet' | 'off' | 'failed'> {
  const s = await load();
  if (!s.on) return 'off';
  const now = await readCounts();
  if (!now) return 'failed';
  const lines = newsLines(s, now, s.words);
  if (notify && lines.length) {
    await Notifications.scheduleNotificationAsync({
      content: { title: s.words.title, body: lines.join(' · '), data: { url: '/client/instagram' } },
      trigger: null,
    });
  }
  await save({ ...s, dm: now.dm, act: now.act });
  return lines.length ? 'news' : 'quiet';
}

/*
 * La tache, declaree au CHARGEMENT du module : iOS peut relancer l'app en
 * arriere-plan sans aucun ecran, et elle doit exister avant tout rendu.
 * Ce fichier est donc importe par la racine de l'app.
 */
if (Platform.OS === 'ios') {
  TaskManager.defineTask(IG_ALERTS_TASK, async () => {
    try {
      const r = await checkOnce(true);
      return r === 'failed' ? BackgroundTask.BackgroundTaskResult.Failed : BackgroundTask.BackgroundTaskResult.Success;
    } catch {
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  });
}

export async function alertsOn(): Promise<boolean> {
  return (await load()).on;
}

export type EnableResult = 'on' | 'login' | 'denied' | 'unavailable';

/**
 * Active les alertes : permission, session verifiee, premiers compteurs
 * retenus SANS prevenir (on ne signale pas ce qui etait deja la), puis
 * la tache de fond.
 */
export async function enableAlerts(words: State['words']): Promise<EnableResult> {
  if (Platform.OS !== 'ios') return 'unavailable';
  const status = await BackgroundTask.getStatusAsync();
  if (status === BackgroundTask.BackgroundTaskStatus.Restricted) return 'unavailable';
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) {
    if (!perm.canAskAgain) return 'denied';
    const ask = await Notifications.requestPermissionsAsync();
    if (!ask.granted) return 'denied';
  }
  const now = await readCounts();
  if (!now) return 'login';
  await save({ on: true, dm: now.dm, act: now.act, words });
  await BackgroundTask.registerTaskAsync(IG_ALERTS_TASK, { minimumInterval: 15 });
  return 'on';
}

export async function disableAlerts(): Promise<void> {
  const s = await load();
  await save({ ...s, on: false });
  try { await BackgroundTask.unregisterTaskAsync(IG_ALERTS_TASK); } catch { /* deja retiree */ }
}

/** Les mots des notifications suivent la langue de l'app : on les remet a jour au lancement. */
export async function refreshWords(words: State['words']): Promise<void> {
  const s = await load();
  if (s.on) await save({ ...s, words });
}
