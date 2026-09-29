/**
 * La sequence de la preuve, temps par temps.
 *
 * Elle est la raison d'etre de l'ecran : on regarde un fil ORDINAIRE, les
 * Reels tombent pendant que la barre du bas sort du cadre, puis l'onglet
 * s'en va. Monter l'ecran ne prouve que le premier temps — et la version
 * d'avant se montait tres bien en n'ayant jamais eu les autres.
 */
import { act, render, screen } from '@testing-library/react-native';
import { dict } from '@/i18n';
import { Proof } from './extra';

jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: { configure: jest.fn(), setLogLevel: jest.fn() },
  LOG_LEVEL: { WARN: 'WARN' },
}));
jest.mock('expo-store-review', () => ({
  hasAction: () => Promise.resolve(false),
  requestReview: () => Promise.resolve(),
  isAvailableAsync: () => Promise.resolve(false),
}));
jest.mock('react-native-device-activity', () => ({}));

const tick = (ms: number) => act(() => { jest.advanceTimersByTime(ms); });

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

it('deroule les trois temps dans l’ordre', () => {
  render(<Proof onNext={() => {}} />);

  // 1. Un fil ordinaire, le temps d'une image. Filtre tout de suite, il n'y
  // aurait rien a comparer.
  expect(screen.getByText(dict.proof.raw)).toBeTruthy();
  expect(screen.queryByText(dict.proof.fall)).toBeNull();

  /*
    2. Dans la premiere seconde : les Reels tombent ET la barre du bas sort
    du cadre, grossie, AVEC son onglet Reels encore la. C'est l'ordre qui
    prouve quelque chose : une barre deja amputee ne dit rien, on ne sait pas
    ce qu'il y avait avant. Il faut voir la porte, puis la voir partir.
  */
  tick(400);
  expect(screen.getByText(dict.proof.fall)).toBeTruthy();
  expect(screen.getByTestId('proof-loupe')).toBeTruthy();

  /*
    3. L'onglet s'en va, et la phrase ne le dit qu'a ce moment-la. Annoncee
    plus tot, elle decrivait un bouton qu'on avait encore sous les yeux. Une
    seconde entre les deux : le temps de compter cinq boutons.
  */
  tick(1000);
  expect(screen.getByText(dict.proof.tab)).toBeTruthy();
});

it('ne laisse rien tourner apres coup', () => {
  // Un compte a rebours qui survit a l'ecran remet l'etat d'un composant
  // demonte : React le signale, et on l'a deja paye ailleurs.
  const r = render(<Proof onNext={() => {}} />);
  r.unmount();
  expect(() => tick(6000)).not.toThrow();
});
