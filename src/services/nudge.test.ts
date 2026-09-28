import { nudgeOfTheDay } from './nudge';
import { dict } from '@/i18n';
import { fr } from '@/i18n/fr';
import { en } from '@/i18n/en';

const stats = (days: number, minutes: number) =>
  ({ days, minutes } as unknown as Parameters<typeof nudgeOfTheDay>[0]);

describe('le rappel du jour', () => {
  it('ne promet rien tant qu’il n’a pas de quoi mesurer', () => {
    expect(nudgeOfTheDay(null, 10).body).toBe(dict.nudge.early);
    expect(nudgeOfTheDay(stats(1, 400), 10).body).toBe(dict.nudge.early);
    expect(nudgeOfTheDay(stats(9, 4), 10).body).toBe(dict.nudge.early);
  });

  it('donne la meme phrase toute la journee', () => {
    // Tiree au hasard, elle changerait a chaque ouverture de l'app — et une
    // phrase qui bouge pendant qu'on la lit ne se lit pas.
    const a = nudgeOfTheDay(stats(30, 900), 4242);
    const b = nudgeOfTheDay(stats(30, 900), 4242);
    expect(a.body).toBe(b.body);
  });

  /*
    La demande etait « un message different chaque jour ».
    La premiere version ne faisait tourner que l'OBJECTIF : quelqu'un qui
    reprend un quart d'heure par jour n'en atteint qu'un seul, et lisait donc
    la meme phrase toute la semaine. Ce test echoue sur cette version-la.
  */
  it('change de phrase d’un jour a l’autre, meme a petit rythme', () => {
    for (const [days, minutes] of [[3, 30], [10, 400], [120, 20000]] as const) {
      const week = new Set(
        Array.from({ length: 7 }, (_, i) => nudgeOfTheDay(stats(days, minutes), 900 + i).body)
      );
      expect(week.size).toBeGreaterThanOrEqual(5);
    }
  });

  it('ne laisse jamais un trou dans la phrase', () => {
    // Une cle absente d'un dictionnaire ne se voit ni au typage ni au rendu :
    // elle sort telle quelle, « {what} », dans l'app.
    for (const d of [fr, en]) {
      for (const [k, v] of Object.entries(d.nudge)) {
        expect(typeof v === 'string' ? v.includes('{{') : false).toBe(false);
        expect(k).not.toMatch(/\s/);
      }
    }
    for (let day = 0; day < 40; day++) {
      for (const [days, minutes] of [[3, 30], [30, 900], [200, 40000]] as const) {
        expect(nudgeOfTheDay(stats(days, minutes), day).body).not.toMatch(/[{}]/);
      }
    }
  });

  it('ne propose que ce qui est atteignable', () => {
    // « tu aurais appris le chinois » a qui reprend dix minutes par jour est
    // faux, et il le sait : c'est la phrase qui fait fermer l'app pour de bon.
    const small = Array.from({ length: 12 }, (_, i) => nudgeOfTheDay(stats(5, 50), i).body);
    for (const body of small) {
      expect(body).not.toContain(dict.nudge.chinese);
      expect(body).not.toContain(dict.nudge.marathon);
    }
    const big = Array.from({ length: 12 }, (_, i) => nudgeOfTheDay(stats(90, 90_000), i).body);
    expect(big.some((b) => b.includes(dict.nudge.chinese))).toBe(true);
  });
});
