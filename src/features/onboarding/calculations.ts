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

export const ACTIVITIES = [
  { id: 'books', costHours: 6 },
  { id: 'language', costHours: 550 },
  { id: 'instrument', costHours: 200 },
  { id: 'marathon', costHours: 100 },
  { id: 'code', costHours: 450 },
] as const;

export type ActivityId = (typeof ACTIVITIES)[number]['id'];

/** ≥ 1 → Math.floor à l'affichage ; < 1 → pourcentage du chemin. */
export function activityCount(hoursPerYear: number, costHours: number): number {
  return hoursPerYear / costHours;
}

export function friendEveningsPerWeek(hoursPerWeek: number): number {
  return Math.min(Math.floor(hoursPerWeek / 4), 7);
}
