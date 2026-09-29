import { ACTIVITIES, activityCount, freeShare, friendEveningsPerWeek, lifeStats, lifeYears, screenYears, wakingShare, compareGuess } from './calculations';

describe('lifeStats — les six cas de référence du §9', () => {
  const cases = [
    { min: 180, age: 22, lost: 87,  share: 19, hours: 1095 },
    { min: 195, age: 24, lost: 91,  share: 20, hours: 1186 },
    { min: 150, age: 25, lost: 69,  share: 16, hours: 913 },
    { min: 300, age: 18, lost: 155, share: 31, hours: 1825 },
    { min: 15,  age: 70, lost: 1,   share: 2,  hours: 91 },
    { min: 720, age: 13, lost: 402, share: 75, hours: 4380 },
  ];

  for (const c of cases) {
    it(`${c.min} min/jour à ${c.age} ans → ${c.lost} mois perdus`, () => {
      const s = lifeStats(c.min, c.age);
      expect(s.lostMonths).toBe(c.lost);
      expect(Math.round(s.wakingShare * 100)).toBe(c.share);
      expect(Math.round(s.hoursPerYear)).toBe(c.hours);
    });
  }

  it('la grille fait toujours 960 carreaux et les trois états la remplissent', () => {
    for (const c of cases) {
      const s = lifeStats(c.min, c.age);
      expect(s.totalMonths).toBe(960);
      expect(s.livedMonths + s.remainingMonths).toBe(960);
      // Le bloc perdu doit tenir dans ce qui reste, sinon la grille déborde.
      expect(s.lostMonths).toBeLessThanOrEqual(s.remainingMonths);
    }
  });

  it('garde au moins 12 mois devant, même à un âge extrême', () => {
    expect(lifeStats(150, 95).remainingMonths).toBe(12);
  });
});

describe('activités, pour 1 095 h/an', () => {
  const H = 1095;
  const cost = (id: string) => ACTIVITIES.find((a) => a.id === id)!.costHours;

  it.each([
    ['books', 182], ['business', 2], ['gym', 7],
    ['marathon', 10], ['code', 2], ['degree', 0],
  ])('%s → %i', (id, expected) => {
    expect(Math.floor(activityCount(H, cost(id as string)))).toBe(expected);
  });

  it('21 h par semaine → 5 soirées', () => {
    expect(friendEveningsPerWeek(21)).toBe(5);
  });

  it('les soirées sont plafonnées à 7', () => {
    expect(friendEveningsPerWeek(100)).toBe(7);
  });
});

describe('part du temps eveille (16 h/jour)', () => {
  it.each([
    [60, 6],    // 1 h  -> 6 %
    [180, 19],  // 3 h  -> 19 %
    [480, 50],  // 8 h  -> 50 %
    [960, 100], // 16 h -> plafonne a 100 %
  ])('%i min/jour -> %i %% du temps eveille', (min, pct) => {
    expect(Math.round(wakingShare(min) * 100)).toBe(pct);
  });

  it('3 h par jour = 15 ans de vie eveillee sur 80 ans', () => {
    expect(Math.round(screenYears(180))).toBe(15);
  });

  it('4 h par jour = 20 ans', () => {
    expect(Math.round(screenYears(240))).toBe(20);
  });
});

/*
 * L'ecart entre ce qu'on croyait et ce que le telephone dit.
 *
 * En pourcentage de l'ESTIMATION, et sans trancher sous dix pour cent :
 * dire « plus que tu ne pensais » pour six minutes d'ecart serait chercher
 * la faute, sur l'ecran ou l'on demande justement de se regarder en face.
 */
describe('l’estimation face au vrai chiffre', () => {
  it('mesure en part de l’estimation', () => {
    expect(compareGuess(120, 180)).toEqual({ pct: 50, verdict: 'more' });
    expect(compareGuess(200, 150)).toEqual({ pct: 25, verdict: 'less' });
  });

  it('ne tranche pas sous dix pour cent', () => {
    expect(compareGuess(120, 126).verdict).toBe('same');
    expect(compareGuess(120, 114).verdict).toBe('same');
    expect(compareGuess(120, 132).verdict).toBe('more');
  });

  it('survit a une estimation nulle', () => {
    expect(compareGuess(0, 60).verdict).toBe('more');
  });
});

describe('les annees qu\'il reste', () => {
  it('partage les annees, et le telephone mord dans le temps libre', () => {
    const l = lifeYears(24, 150);
    expect(l.remaining).toBe(56);
    expect(l.sleep + l.work + l.eat + l.free).toBe(56);
    expect(l.sleep).toBe(19);
    expect(l.phone).toBe(6);
    expect(l.left).toBe(l.free - l.phone);
  });

  it('tient debout aux ages extremes', () => {
    const old = lifeYears(79, 600);
    expect(old.remaining).toBe(1);
    expect(old.sleep + old.work + old.eat + old.free).toBe(1);
    expect(old.phone).toBeLessThanOrEqual(old.free);
  });
});

describe('la part du temps libre', () => {
  it('a 24 ans et 2 h 30 par jour, environ un quart du libre', () => {
    // 56 ans devant : 18,7 a dormir, 9,8 a travailler, 3,5 a table, 24 de
    // libre ; 5,8 sur le telephone — un quart.
    expect(freeShare(24, 150)).toBe(24);
  });

  it('reste sous cent, meme quand l’ecran deborde du libre', () => {
    expect(freeShare(24, 14 * 60)).toBe(95);
    expect(freeShare(70, 10 * 60)).toBeLessThanOrEqual(95);
  });

  it('ne descend jamais a zero', () => {
    expect(freeShare(24, 5)).toBeGreaterThanOrEqual(1);
  });
});
