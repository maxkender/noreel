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

/*
 * L'ordre du milieu du parcours, verrouille.
 *
 * Estimation, permission Temps d'ecran, comparaison, analyse, age : c'est la
 * sequence qui fait que le vrai chiffre existe AVANT qu'on s'en serve, et
 * elle a bouge trois fois en deux jours. Un ecran deplace d'un cran et la
 * comparaison se joue avant que la permission soit demandee — sans qu'aucun
 * montage ne leve.
 */
// Sans les types Node : le projet ne les charge pas, et un test n'est pas
// une raison de les ajouter. Jest sait ou il est ; on lit a cote de lui.
const fs = require('fs') as { readFileSync(p: string, e: string): string };
const path = require('path') as { dirname(p: string): string; join(...p: string[]): string };

it('demande le temps dans le bon ordre', () => {
  const here = path.dirname(expect.getState().testPath ?? '');
  const src = fs.readFileSync(path.join(here, 'OnboardingFlow.tsx'), 'utf8');
  const keys = [...src.matchAll(/key="([a-z0-9]+)"/g)].map((m) => m[1]);
  const at = (k: string) => { const i = keys.indexOf(k); expect(i).toBeGreaterThanOrEqual(0); return i; };
  expect(at('guess')).toBeLessThan(at('perm'));
  expect(at('perm')).toBeLessThan(at('cmp'));
  // L'age vient apres la comparaison, et les annees qu'il reste juste apres.
  expect(at('cmp')).toBeLessThan(at('age'));
  expect(at('age')).toBeLessThan(at('life'));
  expect(at('life')).toBeLessThan(at('act'));
  // Et l'engagement vient apres les annees, avant la demo.
  expect(at('life')).toBeLessThan(at('ready'));
  expect(at('ready')).toBeLessThan(at('proof'));
  expect(keys[keys.length - 1]).toBe('pw');
});
