import { CARE_IDS, type CareId } from './protect';

/*
 * Les gestes qui reparent, et POURQUOI.
 *
 * La premiere liste — boire de l'eau, bouger, lire — etait une liste de
 * bonnes resolutions : rien ne disait ce que chaque geste faisait au
 * cerveau, donc rien ne donnait envie de le faire plutot qu'un autre. Ces
 * neuf-la sont choisis pour ce qu'on sait de la dopamine et de l'attention,
 * et chacun porte sa raison en une ligne. On ne demande pas de croire ; on
 * dit ce que ca change, et la personne juge.
 *
 * Trois familles, parce que reparer n'est pas un seul mouvement :
 *   reset — remonter la ligne de base : le matin sans ecran, l'ennui tolere,
 *           le sommeil (c'est pendant le sommeil profond que les recepteurs
 *           se reparent) ;
 *   train — reentrainer l'attention : un bloc sans interruption, dix pages
 *           tenues jusqu'au bout, un delai avant d'ouvrir un reseau ;
 *   fuel  — chercher la dopamine ailleurs, la lente : la lumiere du jour,
 *           l'effort, l'eau froide.
 */
export type CareGroup = 'reset' | 'train' | 'fuel';

export type Care = { id: CareId; group: CareGroup };

export const CARE: Care[] = [
  { id: 'morning', group: 'reset' },
  { id: 'bored', group: 'reset' },
  { id: 'sleep', group: 'reset' },
  { id: 'focus', group: 'train' },
  { id: 'read', group: 'train' },
  { id: 'delay', group: 'train' },
  { id: 'sun', group: 'fuel' },
  { id: 'move', group: 'fuel' },
  { id: 'cold', group: 'fuel' },
];

export const CARE_GROUPS: CareGroup[] = ['reset', 'train', 'fuel'];

/**
 * Le geste du jour.
 *
 * Neuf cases a cocher, c'est un formulaire ; UN geste mis en avant, c'est
 * une proposition. Il tourne avec la date, deterministe — le meme toute la
 * journee, un autre demain — et les huit autres restent a portee en dessous.
 */
export function careOfTheDay(d = new Date()): CareId {
  const day = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);
  return CARE_IDS[day % CARE_IDS.length];
}
