/**
 * L'onglet de Corti : un niveau, des badges, un geste — et une fete a
 * chaque progres, une fois.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { CortiTab } from './CortiTab';
import { dict } from '@/i18n';
import { BADGES } from '@/services/badges';

jest.mock('react-native-device-activity', () => ({}));
jest.mock('expo-router', () => ({ useFocusEffect: (fn: () => void) => fn() }));

const mockClaim = jest.fn((_n: number) => Promise.resolve(false));
jest.mock('@/services/cheer', () => ({ claimCheer: (n: number) => mockClaim(n) }));

const noop = (() => {}) as never;

it('montre le niveau et ce qu’il manque pour le suivant', async () => {
  render(<CortiTab onScroll={noop} />);
  expect(await screen.findByText(dict.stats.reelsAvoided)).toBeTruthy();
  // Jour zero : au sol, et la phrase dit le niveau suivant (« en veilleuse »).
  expect(screen.getByText(dict.corti.off)).toBeTruthy();
  expect(screen.getByText(new RegExp(dict.corti.dim))).toBeTruthy();
});

it('montre les dix badges, verrouilles au depart, et dit comment les avoir', async () => {
  render(<CortiTab onScroll={noop} />);
  await screen.findByText(dict.stats.reelsAvoided);
  expect(screen.getByText(`0 / ${BADGES.length}`)).toBeTruthy();
  fireEvent.press(screen.getByLabelText(dict.cortiTab.bDay7));
  expect(screen.getByText(dict.cortiTab.locked)).toBeTruthy();
  expect(screen.getByText(new RegExp(dict.cortiTab.bDay7H))).toBeTruthy();
});

it('fete le geste du jour, puis le premier badge', async () => {
  render(<CortiTab onScroll={noop} />);
  await screen.findByText(dict.stats.reelsAvoided);
  fireEvent.press(screen.getAllByRole('checkbox')[0]);
  // Le merci d'abord.
  expect(await screen.findByText(dict.cortiTab.careThanks)).toBeTruthy();
  fireEvent.press(screen.getByText(dict.cortiTab.ok));
  // Puis le badge « premier geste », debloque par ce geste.
  expect(await screen.findByText(dict.cortiTab.unlocked)).toBeTruthy();
  expect(screen.getByText(dict.cortiTab.bCare1H)).toBeTruthy();
});

it('demande encore la celebration des paliers', async () => {
  render(<CortiTab onScroll={noop} />);
  await waitFor(() => expect(mockClaim).toHaveBeenCalled());
});

it('garde les chiffres qui justifient l’abonnement', async () => {
  render(<CortiTab onScroll={noop} />);
  expect(await screen.findByText(dict.stats.reelsAvoided)).toBeTruthy();
  expect(screen.getByText(dict.stats.timeBack)).toBeTruthy();
  expect(screen.getByText(dict.stats.daysKept)).toBeTruthy();
});
