import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ClientId } from '@/features/client/blockers';

const KEY = 'unswipe.usage.v1';

/** Minutes passees dans la version filtree, par jour puis par app. */
type Log = Record<string, Partial<Record<ClientId, number>>>;

/** Le jour local, pas UTC : une seance de 23 h ne doit pas compter demain. */
export function dayKey(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

let cache: Log | null = null;

async function load(): Promise<Log> {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as Log) : {};
  } catch {
    cache = {};
  }
  return cache;
}

async function save(log: Log): Promise<void> {
  cache = log;
  try { await AsyncStorage.setItem(KEY, JSON.stringify(log)); } catch { /* disque plein */ }
}

/**
 * Enregistre une seance.
 *
 * On ne compte QUE ce qu'on peut observer : le temps passe dans nos propres
 * ecrans filtres. Le temps passe dans l'Instagram d'origine ne nous est pas
 * accessible — Temps d'ecran ne le rend pas lisible a une app tierce — et
 * l'inventer serait mentir sur le seul chiffre que la personne vient
 * verifier.
 */
export async function record(app: ClientId, ms: number): Promise<void> {
  // Sous dix secondes, c'est une ouverture par erreur, pas une seance.
  if (ms < 10_000) return;
  const log = await load();
  const k = dayKey();
  const day = log[k] ?? {};
  day[app] = (day[app] ?? 0) + ms / 60_000;
  log[k] = day;
  // Un an d'historique suffit, et borne ce que le disque garde.
  const cutoff = dayKey(new Date(Date.now() - 366 * 864e5));
  for (const d of Object.keys(log)) if (d < cutoff) delete log[d];
  await save(log);
}

export type Today = { total: number; perApp: Record<ClientId, number> };

export async function today(): Promise<Today> {
  const day = (await load())[dayKey()] ?? {};
  const perApp = {
    instagram: Math.round(day.instagram ?? 0),
    tiktok: Math.round(day.tiktok ?? 0),
    twitter: Math.round(day.twitter ?? 0),
    youtube: Math.round(day.youtube ?? 0),
  };
  return { total: Object.values(perApp).reduce((a, b) => a + b, 0), perApp };
}

/**
 * La serie : les jours d'affilee ou l'app filtree a servi.
 *
 * Elle part d'aujourd'hui, ou d'hier si rien n'a encore ete fait
 * aujourd'hui — sinon la serie paraitrait cassee chaque matin au reveil.
 */
export async function streak(): Promise<number> {
  const log = await load();
  const used = (d: Date) => {
    const day = log[dayKey(d)];
    return !!day && Object.values(day).some((m) => (m ?? 0) > 0);
  };
  const now = new Date();
  let start = 0;
  if (!used(now)) {
    const y = new Date(now.getTime() - 864e5);
    if (!used(y)) return 0;
    start = 1;
  }
  let n = 0;
  for (let i = start; i < 400; i += 1) {
    if (!used(new Date(now.getTime() - i * 864e5))) break;
    n += 1;
  }
  return n;
}

/** Les sept derniers jours, du plus ancien au plus recent. */
export async function week(): Promise<number[]> {
  const log = await load();
  const now = Date.now();
  return Array.from({ length: 7 }, (_, i) => {
    const day = log[dayKey(new Date(now - (6 - i) * 864e5))] ?? {};
    return Math.round(Object.values(day).reduce((a, b) => a + (b ?? 0), 0));
  });
}
