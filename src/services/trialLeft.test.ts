/**
 * La fin de l'essai se lit dans les reglages, sans notification : le texte
 * doit dire juste a chaque moment des 3 jours.
 */
import { trialLeft } from './trial';
import { subStatus } from './purchases';

jest.mock('expo-notifications', () => ({}));
jest.mock('react-native-purchases', () => ({ __esModule: true, default: {}, LOG_LEVEL: {} }));

const H = 3600 * 1000;
const now = new Date('2026-10-14T12:00:00Z');
const at = (h: number) => new Date(now.getTime() + h * H);

describe("le temps qui reste a l'essai", () => {
  it('compte en jours au debut : un essai neuf de 3 jours dit 3', () => {
    expect(trialLeft(at(72 - 0.01), now)).toEqual({ kind: 'days', n: 3 });
    expect(trialLeft(at(48), now)).toEqual({ kind: 'days', n: 2 });
  });
  it('dit « 1 jour » le dernier jour', () => {
    expect(trialLeft(at(30), now)).toEqual({ kind: 'day' });
    expect(trialLeft(at(20), now)).toEqual({ kind: 'day' });
  });
  it('passe aux heures a la toute fin, jamais a zero', () => {
    expect(trialLeft(at(5), now)).toEqual({ kind: 'hours', h: 5 });
    expect(trialLeft(at(-1), now)).toEqual({ kind: 'hours', h: 1 });
  });
});

describe("l'abonnement lu pour les reglages", () => {
  const info = (periodType: string) => ({
    entitlements: { active: { unswap_pro: { periodType, expirationDate: '2026-10-17T12:00:00Z' } } },
    managementURL: 'https://apps.apple.com/account/subscriptions',
  }) as never;

  it("reconnait l'essai et sa date de fin", () => {
    const s = subStatus(info('TRIAL'));
    expect(s?.trial).toBe(true);
    expect(s?.expires?.toISOString()).toBe('2026-10-17T12:00:00.000Z');
  });
  it('ne prend pas un abonnement paye pour un essai', () => {
    expect(subStatus(info('NORMAL'))?.trial).toBe(false);
  });
  it("ne montre rien sans abonnement", () => {
    expect(subStatus({ entitlements: { active: {} } } as never)).toBeNull();
    expect(subStatus(null)).toBeNull();
  });
});
