/**
 * Le bouton qui encaisse.
 *
 * Il menait droit a l'accueil quand le magasin ne rendait aucun forfait :
 * vu de l'exterieur, « Continuer » ne faisait RIEN — pas de feuille de
 * paiement, pas de message, juste la page d'accueil. C'est le seul ecran de
 * l'app ou une seconde de doute coute un abonnement, et c'est arrive en vrai
 * (les produits etaient encore en revue chez Apple, donc StoreKit ne les
 * servait pas et l'offre revenait vide).
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { dict } from '@/i18n';
import { Paywall } from './Paywall';

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

const press = async (label: string) => {
  await act(async () => { fireEvent.press(screen.getByText(label)); });
};

it('ne referme pas l’ecran en silence quand il n’y a rien a vendre', async () => {
  const onDone = jest.fn();
  render(<Paywall onDone={onDone} exitDelay={0} />);

  // Le libelle nomme ce qu'on vient chercher, pas un simple « Continuer ».
  await press(dict.pay.cta);

  // Le premier appui CONSTATE : il explique, et il ne sort pas.
  expect(onDone).not.toHaveBeenCalled();
  expect(screen.getByText(dict.pay.storeDown)).toBeTruthy();

  // Le second passe : on explique, on n'enferme pas.
  await press(dict.pay.storeSkip);
  expect(onDone).toHaveBeenCalledTimes(1);
});

it('change le prix sous le bouton quand on change de forfait', () => {
  // L'essai est ecrit dans la frise ET sous le bouton ; en mensuel, le prix
  // sous le bouton passe au mois, et l'essai y est toujours annonce.
  render(<Paywall onDone={() => {}} exitDelay={0} />);
  expect(screen.getAllByText(/essai|trial/i).length).toBeGreaterThanOrEqual(1);
  fireEvent.press(screen.getByText(dict.pay.monthly));
  expect(screen.getAllByText(/\/mois|\/month/i).length).toBeGreaterThanOrEqual(1);
  expect(screen.getByText(/essai gratuit, puis|free trial, then/i)).toBeTruthy();
});

it('garde la frise de l’essai, quel que soit le forfait', () => {
  // Les deux forfaits ont un essai : la frise reste la meme, seul son titre
  // dit sur quel forfait il porte.
  render(<Paywall onDone={() => {}} exitDelay={0} />);
  expect(screen.getByText(dict.pay.trialTodayBody)).toBeTruthy();
  fireEvent.press(screen.getByText(dict.pay.monthly));
  expect(screen.getByText(dict.pay.trialTodayBody)).toBeTruthy();
  expect(screen.queryByText(dict.pay.weekTodayBody)).toBeNull();
});

it('la croix arrive apres le delai, jamais avant', () => {
  jest.useFakeTimers();
  render(<Paywall onDone={() => {}} exitDelay={7000} />);
  expect(screen.queryByTestId('paywall-close')).toBeNull();
  act(() => { jest.advanceTimersByTime(6900); });
  expect(screen.queryByTestId('paywall-close')).toBeNull();
  act(() => { jest.advanceTimersByTime(200); });
  expect(screen.getByTestId('paywall-close')).toBeTruthy();
  jest.useRealTimers();
});
