/**
 * Source de vérité UNIQUE des chiffres de l'onboarding.
 * Les carreaux allumés de l'écran 6 et le texte affiché sortent d'ici tous les deux :
 * c'est ce qui garantit qu'ils ne divergent jamais d'un mois.
 */
export const LIFE_YEARS = 80;
export const WAKING_HOURS = 16;
export const MONTHS_PER_YEAR = 12;

export type LifeStats = {
  totalMonths: number;
  livedMonths: number;
  remainingMonths: number;
  lostMonths: number;
  hoursPerYear: number;
  hoursPerWeek: number;
  wakingShare: number;
};

/**
 * Part du temps EVEILLE passee sur un ecran, et son equivalent en annees de vie.
 * On raisonne sur 16 h eveillees : dire « 12 % de ta journee » quand on dort
 * un tiers du temps sous-estime ce que ca represente vraiment.
 */
export function wakingShare(minutesPerDay: number): number {
  return Math.min(1, minutesPerDay / 60 / WAKING_HOURS);
}

/** Annees de vie eveillee passees sur un ecran, sur une vie de 80 ans. */
export function screenYears(minutesPerDay: number): number {
  return (minutesPerDay / 60) * 365 * LIFE_YEARS / (WAKING_HOURS * 365);
}

export function lifeStats(minutesPerDay: number, age: number): LifeStats {
  const hoursPerDay = minutesPerDay / 60;
  const totalMonths = LIFE_YEARS * MONTHS_PER_YEAR;
  // On garde au moins 12 mois devant : une grille entièrement vécue n'a rien à dire.
  const livedMonths = Math.min(Math.round(age * MONTHS_PER_YEAR), totalMonths - MONTHS_PER_YEAR);
  const remainingMonths = totalMonths - livedMonths;
  // « jour et nuit, sans pause » : on divise par 24, pas par les heures éveillées.
  const lostMonths = Math.round((remainingMonths * hoursPerDay) / 24);
  return {
    totalMonths,
    livedMonths,
    remainingMonths,
    lostMonths,
    hoursPerYear: hoursPerDay * 365,
    hoursPerWeek: hoursPerDay * 7,
    wakingShare: hoursPerDay / WAKING_HOURS,
  };
}

/*
 * Ce qu'une annee de telephone aurait pu contenir.
 *
 * Des choses qu'on se represente, pas des heures : une langue (avec son
 * drapeau), un instrument, un sommet, un brevet de pilote. Le cout est un
 * ordre de grandeur, et il est ecrit sur l'ecran pour qu'on puisse refaire le
 * calcul. Les langues sont a part : on en montre UNE, tiree selon le chiffre,
 * pour ne pas toujours parler chinois.
 */
export const ACTIVITIES = [
  { id: 'spanish', kind: 'language', costHours: 600 },
  { id: 'japanese', kind: 'language', costHours: 1000 },
  { id: 'italian', kind: 'language', costHours: 500 },
  { id: 'chinese', kind: 'language', costHours: 1000 },
  { id: 'guitar', kind: 'other', costHours: 200 },
  { id: 'piano', kind: 'other', costHours: 300 },
  { id: 'marathon', kind: 'other', costHours: 100 },
  { id: 'surf', kind: 'other', costHours: 60 },
  { id: 'summit', kind: 'other', costHours: 150 },
  { id: 'cook', kind: 'other', costHours: 200 },
  { id: 'code', kind: 'other', costHours: 450 },
  { id: 'books', kind: 'other', costHours: 6 },
  { id: 'draw', kind: 'other', costHours: 300 },
  { id: 'pilot', kind: 'other', costHours: 45 },
  { id: 'blackbelt', kind: 'other', costHours: 1500 },
  { id: 'bike', kind: 'other', costHours: 120 },
] as const;

export type ActivityId = (typeof ACTIVITIES)[number]['id'];

/** ≥ 1 → Math.floor à l'affichage ; < 1 → pourcentage du chemin. */
export function activityCount(hoursPerYear: number, costHours: number): number {
  return hoursPerYear / costHours;
}

export function friendEveningsPerWeek(hoursPerWeek: number): number {
  return Math.min(Math.floor(hoursPerWeek / 4), 7);
}

export type GuessVerdict = 'less' | 'more' | 'same';

/**
 * L'ecart entre ce qu'on croyait et ce que le telephone dit.
 *
 * En pourcentage DE L'ESTIMATION : « 30 % de plus que ce que tu pensais »
 * se comprend, « 45 minutes de plus » demande de refaire le calcul. Sous dix
 * pour cent on ne tranche pas — dire « plus que tu ne pensais » pour six
 * minutes d'ecart serait chercher la faute.
 */
export function compareGuess(guess: number, real: number): { pct: number; verdict: GuessVerdict } {
  const pct = Math.round((Math.abs(real - guess) / Math.max(1, guess)) * 100);
  if (pct < 10) return { pct, verdict: 'same' };
  return { pct, verdict: real < guess ? 'less' : 'more' };
}

/**
 * Les annees eveillees passees sur un ecran, sur les annees qu'il RESTE.
 *
 * L'age etait demande puis oublie : le verdict comptait sur quatre-vingts
 * ans pour tout le monde, et une question dont la reponse ne sert a rien est
 * une question de trop. Compte sur ce qui reste, le chiffre est a la fois
 * plus juste et plus personnel — et a vingt ans il fait plus mal, ce qui est
 * le but.
 */
export function yearsOnScreen(minutesPerDay: number, yearsLeft: number): number {
  return ((minutesPerDay / 60) / WAKING_HOURS) * Math.max(0, yearsLeft);
}

/** L'age ou l'on cesse de travailler, pour compter les annees de travail. */
export const RETIRE_AGE = 65;

export type LifeYears = {
  remaining: number; sleep: number; work: number; eat: number; free: number; phone: number; left: number;
};

/**
 * Les annees qu'il reste, et a qui elles vont.
 *
 * Huit heures de sommeil, huit heures de travail cinq jours sur sept
 * jusqu'a la retraite, une heure et demie a table — puis ce qui reste est le
 * temps libre, et le telephone mord dedans a raison du temps d'ecran
 * quotidien. Tout est en annees entieres, arrondies : ce sont des cases qu'on
 * regarde, pas des decimales.
 */
export function lifeYears(age: number, minutesPerDay: number): LifeYears {
  const remaining = Math.max(1, LIFE_YEARS - age);
  const sleep = Math.round((remaining * 8) / 24);
  const work = Math.round((Math.max(0, RETIRE_AGE - age) * ((8 * 5) / 7)) / 24);
  let eat = Math.max(1, Math.round((remaining * 1.5) / 24));
  // Sur une fin de vie tres courte, les cases ne suffisent pas a tout loger.
  if (sleep + work + eat > remaining) eat = Math.max(0, remaining - sleep - work);
  const free = Math.max(0, remaining - sleep - work - eat);
  const phone = Math.min(free, Math.round((remaining * (minutesPerDay / 60)) / 24));
  return { remaining, sleep, work, eat, free, phone, left: free - phone };
}
