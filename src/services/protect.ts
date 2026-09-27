import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ClientId } from '@/features/client/blockers';
import { dayKey } from './usage';

const KEY = 'unswipe.protect.v1';

/**
 * Le registre de la protection.
 *
 * Il tient les seuls chiffres qu'on ait le droit de montrer : ceux qu'on a
 * OBSERVES. Le temps passe dans l'Instagram d'origine ne nous est pas
 * accessible, donc il n'apparait nulle part. Ce qu'on voit, c'est : un fil
 * court referme, une journee ou la protection a servi, une journee ou le
 * mode brut a servi, et la derniere fois qu'une regle a mordu sur une page.
 * Tout le reste en decoule.
 */
type Ledger = {
  /** Reels refermes, au total. Le numero affiche sur le mur. */
  blocked: number;
  /** Entrees dans le fil court, dedupliquees : une par demi-heure. */
  avoided: number;
  /** Horodatage de la derniere entree comptee, pour la deduplication. */
  lastAvoid: number;
  /** Jours ou la protection a servi. Une pause GELE ce compte. */
  days: Record<string, 1>;
  /** Jours ou le mode brut a servi : le seul recul qu'on puisse constater. */
  raw: Record<string, 1>;
  /** Paliers deja annonces, sous la forme « days:30 ». */
  seen: string[];
  /** Derniere fois qu'une regle a mordu, par app. */
  ok: Partial<Record<ClientId, number>>;
  /** Chargements d'affilee sans qu'aucune regle ne morde, par app. */
  miss: Partial<Record<ClientId, number>>;
};

const EMPTY: Ledger = {
  blocked: 0, avoided: 0, lastAvoid: 0,
  days: {}, raw: {}, seen: [], ok: {}, miss: {},
};

/**
 * Une entree dans le fil court vaut une seance evitee — au plus une par
 * demi-heure.
 *
 * Compter chaque demi-tour separement gonflait le chiffre sans rien
 * mesurer : le detecteur peut repartir trois fois sur une meme page, ce qui
 * aurait fait trente-six minutes « gagnees » pour un seul reel ouvert. Une
 * demi-heure de silence separe deux vraies seances.
 */
const DEDUPE_MS = 30 * 60_000;

/**
 * Douze minutes par seance evitee.
 *
 * C'est une ESTIMATION, et l'ecran qui l'affiche le dit mot pour mot. On ne
 * voit pas combien de temps la personne aurait regarde — personne ne le
 * voit. Douze minutes est l'ordre de grandeur d'une seance de format court ;
 * le chiffre est affiche a cote du compte d'entrees refermees pour qu'on
 * puisse refaire le calcul soi-meme.
 */
export const MINUTES_PER_SESSION = 12;

/** Les paliers. Ni trop rapproches ni hors d'atteinte. */
export const MILESTONES: { id: string; kind: 'days' | 'reels'; at: number }[] = [
  { id: 'days:7', kind: 'days', at: 7 },
  { id: 'days:30', kind: 'days', at: 30 },
  { id: 'days:100', kind: 'days', at: 100 },
  { id: 'reels:1000', kind: 'reels', at: 1000 },
];

let cache: Ledger | null = null;

async function load(): Promise<Ledger> {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    // On fusionne avec le modele vide : une version plus ancienne du registre
    // n'a pas tous les champs, et un `undefined.length` plus loin ferait
    // tomber l'accueil.
    cache = raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<Ledger>) } : { ...EMPTY };
  } catch {
    cache = { ...EMPTY };
  }
  return cache;
}

async function save(l: Ledger): Promise<void> {
  cache = l;
  try { await AsyncStorage.setItem(KEY, JSON.stringify(l)); } catch { /* disque plein */ }
}

/** Aujourd'hui compte comme un jour protege. Appele a l'ouverture d'un client. */
export async function markDay(): Promise<void> {
  const l = await load();
  const k = dayKey();
  if (l.days[k]) return;
  l.days[k] = 1;
  await save(l);
}

/** Le mode brut a servi aujourd'hui : c'est le seul recul observable. */
export async function markRaw(): Promise<void> {
  const l = await load();
  const k = dayKey();
  if (l.raw[k]) return;
  l.raw[k] = 1;
  await save(l);
}

/**
 * Un fil court vient d'etre referme.
 *
 * Renvoie le numero du reel referme : c'est lui qu'on ecrit sur le mur, pour
 * que le blocage soit un compteur qui monte et non un rappel a l'ordre.
 */
export async function countBlocked(): Promise<number> {
  const l = await load();
  l.blocked += 1;
  const now = Date.now();
  if (now - l.lastAvoid > DEDUPE_MS) {
    l.avoided += 1;
    l.lastAvoid = now;
  }
  await save(l);
  return l.blocked;
}

/**
 * Une page vient d'etre filtree : est-ce qu'au moins une regle a mordu ?
 *
 * C'est la seule facon de savoir qu'Instagram a change de structure sans
 * attendre qu'un utilisateur nous ecrive. Trois chargements d'affilee sans
 * qu'une seule regle ne trouve quoi que ce soit, et le filtre est a
 * verifier : un seul chargement ne prouve rien, une page peut etre vide.
 */
export async function reportRules(app: ClientId, matched: number): Promise<void> {
  const l = await load();
  if (matched > 0) {
    l.ok[app] = Date.now();
    l.miss[app] = 0;
  } else {
    l.miss[app] = (l.miss[app] ?? 0) + 1;
  }
  await save(l);
}

export type Stats = {
  /** Reels refermes, au total. */
  blocked: number;
  /** Seances de format court evitees. */
  avoided: number;
  /** Minutes reprises, estimees : seances evitees x douze. */
  minutes: number;
  /** Jours ou la protection a servi. Une pause ne les efface pas. */
  days: number;
  /** Indice de recuperation, de 0 a 100. Une estimation, pas un diagnostic. */
  brain: number;
  /** Derniere fois qu'une regle a mordu, toutes apps confondues. */
  checkedAt: number;
  /** Une app dont le filtre semble ne plus rien trouver. */
  shaky: ClientId | null;
};

/**
 * L'indice de recuperation.
 *
 * Il monte avec les jours proteges et descend avec les jours passes en mode
 * brut. Ce sont les deux seules choses qu'on observe, et il ne pretend rien
 * de plus : l'ecran qui l'affiche ecrit qu'il s'agit d'une estimation tiree
 * de ces deux nombres, pas d'une mesure de quoi que ce soit dans la tete de
 * la personne.
 *
 * Il part de 18 et non de 0 : un premier jour n'est pas un cerveau eteint,
 * et un compteur qui demarre a zero se lit comme un verdict.
 *
 * Il compte les jours proteges au TOTAL et non d'affilee, pour qu'une pause
 * gele le chiffre au lieu de l'effacer. Un compteur remis a zero enseigne
 * « c'est perdu de toute facon », et c'est la que les gens desinstallent.
 */
export function brainIndex(days: number, rawDays: number): number {
  return Math.max(0, Math.min(100, Math.round(18 + days * 2.4 - rawDays * 7)));
}

export async function stats(): Promise<Stats> {
  const l = await load();
  const days = Object.keys(l.days).length;
  const rawDays = Object.keys(l.raw).length;
  const times = Object.values(l.ok).filter((n): n is number => typeof n === 'number');
  const shaky = (Object.keys(l.miss) as ClientId[]).find((a) => (l.miss[a] ?? 0) >= 3) ?? null;
  return {
    blocked: l.blocked,
    avoided: l.avoided,
    minutes: l.avoided * MINUTES_PER_SESSION,
    days,
    brain: brainIndex(days, rawDays),
    checkedAt: times.length ? Math.max(...times) : 0,
    shaky,
  };
}

/**
 * Le palier qu'on vient d'atteindre, s'il y en a un — et une seule fois.
 *
 * Il est marque comme vu au moment ou on le rend : appeler deux fois ne
 * fetera pas deux fois. On rend le plus haut atteint et non le premier
 * trouve, pour qu'une longue absence ne fasse pas defiler trois felicitations
 * a la suite.
 */
export async function claimMilestone(): Promise<typeof MILESTONES[number] | null> {
  const l = await load();
  const days = Object.keys(l.days).length;
  const hit = MILESTONES.filter(
    (m) => !l.seen.includes(m.id) && (m.kind === 'days' ? days : l.blocked) >= m.at
  );
  if (!hit.length) return null;
  const top = hit[hit.length - 1];
  // Tous les paliers franchis sont marques, pas seulement celui qu'on montre :
  // sinon les precedents ressortiraient un a un aux ouvertures suivantes.
  l.seen = [...l.seen, ...hit.map((m) => m.id)];
  await save(l);
  return top;
}
