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

it('garde la frise quel que soit le forfait', () => {
  /*
    Changer de forfait faisait sauter tout le bas de la page : l'hebdomadaire
    avait un pave a lui, plus court. On perd l'endroit ou l'on regardait au
    moment precis ou l'on compare deux prix.
  */
  render(<Paywall onDone={() => {}} exitDelay={0} />);
  const steps = () => [dict.pay.trialTodayBody, dict.pay.weekTodayBody]
    .filter((x) => screen.queryByText(x));

  expect(screen.getByText(dict.pay.trialTodayBody)).toBeTruthy();
  fireEvent.press(screen.getByText(dict.pay.weekly));
  expect(screen.getByText(dict.pay.weekTodayBody)).toBeTruthy();
  // Une frise des deux cotes, jamais zero, jamais deux.
  expect(steps()).toHaveLength(1);
});

it('montre la destination, pas le point de depart', () => {
  /*
    Corti arrivait grille et se reparait sous les yeux : sur la page ou l'on
    sort sa carte, la premiere image etait celle d'un cerveau mort. On vend ce
    qu'on obtient. Le chiffre est celui que l'app affiche ensuite tous les
    jours — la promesse et la jauge doivent dire la meme chose.
  */
  render(<Paywall onDone={() => {}} exitDelay={0} />);
  expect(screen.getByText('90 %')).toBeTruthy();   // brainIndex(30 jours)
  expect(screen.getByText(dict.pay.pctThen)).toBeTruthy();
  expect(screen.queryByText('18 %')).toBeNull();
});
