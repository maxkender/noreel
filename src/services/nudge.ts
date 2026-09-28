import { dict, interpolate } from '@/i18n';
import { formatHours } from '@/lib/format';
import type { Stats } from './protect';

/*
 * Le rappel du jour.
 *
 * Une phrase, une seule, qui change chaque matin. Elle part du temps qu'on a
 * VRAIMENT repris et le projette : a ce rythme, voila ce que trois mois
 * contiennent. Ce n'est pas une citation motivante — de celles-la on se lasse
 * en trois jours — c'est son propre chiffre, tourne autrement.
 *
 * La variete vient de la TOURNURE, pas seulement de l'objectif. Premiere
 * version : le jour ne choisissait que l'activite atteignable, si bien que
 * quelqu'un qui reprend un quart d'heure par jour lisait la meme phrase toute
 * la semaine — il n'en atteint qu'une. Sept tournures tournent maintenant en
 * plus, et deux personnes au meme rythme ne lisent pas la meme chose le meme
 * jour de la semaine.
 *
 * Le tirage est DETERMINISTE : la meme journee donne toujours la meme phrase.
 * Tire au hasard, elle changerait a chaque ouverture de l'app, et une phrase
 * qui bouge pendant qu'on la lit ne se lit pas.
 */

/** Trois mois : le plus court horizon ou un apprentissage veut dire quelque chose. */
const HORIZON_DAYS = 90;

/**
 * Ce qu'on peut atteindre, et en combien d'heures.
 *
 * Les couts sont ceux du parcours, une seule table pour les deux : voir
 * « apprendre le chinois » a l'accueil puis une autre estimation dans
 * l'onboarding ferait douter des deux.
 */
const REACH = [
  { key: 'books', hours: 6 },
  { key: 'chinese', hours: 1000 },
  { key: 'instrument', hours: 200 },
  { key: 'marathon', hours: 100 },
  { key: 'code', hours: 450 },
] as const;

/** Les tournures, quand l'objectif est atteint. */
const FULL = ['l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'l7'] as const;
/** Celles qui disent une part du chemin. */
const PART = ['p1', 'p2', 'p3'] as const;
/** Celles qui ne promettent rien, quand le temps repris est encore mince. */
const PLAIN = ['plain1', 'plain2'] as const;

/** Le jour, en nombre : c'est lui qui choisit tout. */
function dayNumber(d = new Date()): number {
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);
}

export type Nudge = { title: string; body: string };

/**
 * La phrase du jour.
 *
 * Les premiers jours, le rythme mesure ne veut encore rien dire : on dit alors
 * ce qui est vrai — il faut un peu de temps pour avoir un chiffre. Projeter sur
 * deux journees d'usage ferait un rappel qu'on cesse de croire des la premiere
 * verification.
 */
export function nudgeOfTheDay(s: Stats | null, day = dayNumber()): Nudge {
  const d = dict.nudge;
  if (!s || s.days < 2 || s.minutes < 10) return { title: d.title, body: d.early };

  const perDay = s.minutes / Math.max(1, s.days);
  const hours = (perDay * HORIZON_DAYS) / 60;
  const h = formatHours(Math.round(hours * 60));

  /*
    On ne propose que ce qui est ATTEIGNABLE.
    Annoncer « tu aurais appris le chinois » a quelqu'un qui reprend dix
    minutes par jour est faux, et il le sait — c'est le genre de phrase qui
    fait fermer l'app pour de bon.
  */
  const reachable = REACH.filter((r) => hours >= r.hours);
  if (reachable.length) {
    const r = reachable[day % reachable.length];
    const n = Math.floor(hours / r.hours);
    const line = FULL[day % FULL.length];
    // Deux tournures ne nomment aucune activite : elles n'ont pas besoin du
    // compte, et c'est ce qui les rend lisibles meme a une fois.
    return {
      title: d.title,
      body: interpolate(d[line], { h, n, what: d[r.key] }),
    };
  }

  const r = REACH[day % REACH.length];
  const part = Math.round((hours / r.hours) * 100);
  if (part >= 5) {
    return {
      title: d.title,
      body: interpolate(d[PART[day % PART.length]], { h, p: part, what: d[r.key] }),
    };
  }
  return { title: d.title, body: interpolate(d[PLAIN[day % PLAIN.length]], { h }) };
}
