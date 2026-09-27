/**
 * Le parcours entier, monte une fois.
 *
 * Il assemble vingt-deux ecrans, dont cinq nouveaux : une erreur dans l'un
 * d'eux emporte le montage de tout le reste, et sans simulateur sur cette
 * machine ca ne se verrait qu'apres la construction.
 *
 * Ce qu'il ne verifie PAS : qu'on arrive au bout. Le paywall a deja disparu
 * deux fois du parcours parce qu'un compte d'ecrans tenu a la main avait
 * derive d'un cran. Ce defaut-la est desormais impossible par construction —
 * le nombre d'ecrans est LU sur la liste et plus recopie — mais rien ici ne
 * remplace un parcours joue du premier au dernier ecran. Le faire demanderait
 * de simuler les reponses de chaque ecran, une par une : une monture qui
 * casserait a chaque changement de libelle, pour garder un defaut qu'on a
 * supprime autrement.
 */
import { render } from '@testing-library/react-native';
import { OnboardingFlow } from './OnboardingFlow';

jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: { configure: jest.fn(), setLogLevel: jest.fn() },
  LOG_LEVEL: { WARN: 'WARN' },
}));
jest.mock('react-native-device-activity', () => ({}));
jest.mock('expo-store-review', () => ({
  hasAction: () => Promise.resolve(false),
  requestReview: () => Promise.resolve(),
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn() }),
}));

it('le parcours se monte sans lever', () => {
  const r = render(<OnboardingFlow />);
  expect(r.toJSON()).toBeTruthy();
});
