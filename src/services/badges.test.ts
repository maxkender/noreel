import { badgeGap, BADGES, claimBadges, resetBadges, unlockedBadges } from './badges';

const zero = { days: 0, blocked: 0, careTotal: 0, careToday: [] as string[] };

it('ne donne rien au depart, et le premier jour des la premiere journee', () => {
  expect(unlockedBadges(zero)).toEqual([]);
  expect(unlockedBadges({ ...zero, days: 1 })).toEqual(['day1']);
  expect(unlockedBadges({ ...zero, days: 30, blocked: 1000 })).toEqual(['day1', 'day7', 'day30', 'reels100', 'reels1000']);
});

it('dit ce qu’il manque', () => {
  const week = BADGES.find((b) => b.id === 'day7')!;
  expect(badgeGap(week, { ...zero, days: 4 })).toBe(3);
  expect(badgeGap(week, { ...zero, days: 9 })).toBe(0);
});

it('ne fete chaque badge qu’une fois', async () => {
  await resetBadges();
  expect(await claimBadges({ ...zero, days: 1 })).toEqual(['day1']);
  expect(await claimBadges({ ...zero, days: 1 })).toEqual([]);
  expect(await claimBadges({ ...zero, days: 7 })).toEqual(['day7']);
  await resetBadges();
});
