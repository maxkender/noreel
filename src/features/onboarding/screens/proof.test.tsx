/**
 * La sequence de la preuve, temps par temps.
 *
 * Elle est la raison d'etre de l'ecran : on regarde un fil ORDINAIRE, les
 * Reels tombent, puis on vient voir la barre du bas de pres et l'onglet s'en
 * va. Monter l'ecran ne prouve que le premier temps — et la version d'avant se
 * montait tres bien en n'ayant jamais eu les deux autres.
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

  // 1. Un fil ordinaire. Filtre tout de suite, il n'y aurait rien a comparer.
  expect(screen.getByText(dict.proof.raw)).toBeTruthy();
  expect(screen.queryByText(dict.proof.fall)).toBeNull();

  // 2. Les Reels tombent.
  tick(2300);
  expect(screen.getByText(dict.proof.fall)).toBeTruthy();

  /*
    3. La barre du bas, grossie, AVEC son onglet Reels encore la.
    C'est l'ordre qui prouve quelque chose : une barre deja amputee ne dit
    rien, on ne sait pas ce qu'il y avait avant. Il faut voir la porte, puis
    la voir partir.
  */
  tick(1600);
  expect(screen.getByTestId('proof-loupe')).toBeTruthy();
  expect(screen.getByText(dict.proof.fall)).toBeTruthy();

  /*
    4. L'onglet s'en va, et la phrase ne le dit qu'a ce moment-la. Annoncee
    plus tot, elle decrivait un bouton qu'on avait encore sous les yeux.

    Il s'ecoule une seconde et demie entre les deux : c'est le temps qu'il
    faut pour compter cinq boutons. La sequence durait trois secondes et
    demie en tout — on voyait qu'il se passait quelque chose sans avoir le
    temps de voir QUOI, alors que tout l'ecran tient dans ce detail-la.
  */
  tick(1700);
  expect(screen.getByText(dict.proof.tab)).toBeTruthy();
});

it('ne laisse rien tourner apres coup', () => {
  // Un compte a rebours qui survit a l'ecran remet l'etat d'un composant
  // demonte : React le signale, et on l'a deja paye ailleurs.
  const r = render(<Proof onNext={() => {}} />);
  r.unmount();
  expect(() => tick(6000)).not.toThrow();
});
