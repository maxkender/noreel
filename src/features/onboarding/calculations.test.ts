import {
  ACTIVITIES, activityCount, friendEveningsPerWeek, lifeStats,
  screenYears, wakingShare,
} from './calculations';

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
    ['books', 182], ['language', 1], ['instrument', 5],
    ['marathon', 10], ['code', 2],
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
