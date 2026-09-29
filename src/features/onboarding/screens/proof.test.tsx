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

it('deroule les temps dans l’ordre, sans un mot de plus', () => {
  render(<Proof onNext={() => {}} />);

  // Le titre, et rien d'autre a lire : la phrase qui suivait chaque temps est
  // partie, l'image suffit.
  expect(screen.getByText(dict.proof.title)).toBeTruthy();

  /*
    Dans la premiere seconde : les Reels tombent ET la barre du bas sort du
    cadre, grossie, AVEC son onglet Reels encore la. C'est l'ordre qui prouve
    quelque chose : une barre deja amputee ne dit rien.
  */
  tick(400);
  expect(screen.getByTestId('proof-loupe')).toBeTruthy();
  tick(1000);
  expect(screen.getByText(dict.proof.title)).toBeTruthy();
});

it('ne laisse rien tourner apres coup', () => {
  // Un compte a rebours qui survit a l'ecran remet l'etat d'un composant
  // demonte : React le signale, et on l'a deja paye ailleurs.
  const r = render(<Proof onNext={() => {}} />);
  r.unmount();
  expect(() => tick(6000)).not.toThrow();
});
