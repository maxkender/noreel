import { canStart, windowEnd } from './postmode';

jest.mock('react-native-device-activity', () => ({}));

it('respecte la limite du jour, et zero veut dire sans limite', () => {
  expect(canStart(0, 3)).toBe(true);
  expect(canStart(2, 3)).toBe(true);
  expect(canStart(3, 3)).toBe(false);
  expect(canStart(40, 0)).toBe(true);
});

it('borne la fenetre a minuit', () => {
  expect(windowEnd(new Date(2026, 8, 29, 10, 5), 60)).toEqual({ hour: 11, minute: 5 });
  expect(windowEnd(new Date(2026, 8, 29, 23, 30), 60)).toEqual({ hour: 23, minute: 59 });
});
