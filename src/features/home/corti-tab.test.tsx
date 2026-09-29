/**
 * L'onglet de Corti : ses points de dopamine, des badges, des objectifs —
 * et une fete a chaque progres, une fois.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { CortiTab } from './CortiTab';
import { dict, interpolate } from '@/i18n';
import { BADGES } from '@/services/badges';
import { CARE_POINTS } from '@/services/protect';
import { careOfTheDay } from '@/services/care';

jest.mock('react-native-device-activity', () => ({}));
jest.mock('expo-router', () => ({ useFocusEffect: (fn: () => void) => fn() }));

const mockClaim = jest.fn((_n: number) => Promise.resolve(false));
jest.mock('@/services/cheer', () => ({ claimCheer: (n: number) => mockClaim(n) }));

const noop = (() => {}) as never;

it('montre le niveau et ce qu’il manque pour le suivant', async () => {
  render(<CortiTab onScroll={noop} />);
  expect(await screen.findByText(dict.stats.reelsAvoided)).toBeTruthy();
  // Jour zero : eteint — dans la pastille d'etat ET sur le chemin — et la
  // phrase dit l'etat suivant (« en veilleuse »).
  expect(screen.getAllByText(dict.corti.off).length).toBeGreaterThanOrEqual(2);
  expect(screen.getAllByText(new RegExp(dict.corti.dim)).length).toBeGreaterThanOrEqual(1);
});

it('montre les dix badges, verrouilles au depart, et dit comment les avoir', async () => {
  render(<CortiTab onScroll={noop} />);
  await screen.findByText(dict.stats.reelsAvoided);
  expect(screen.getByText(`0 / ${BADGES.length}`)).toBeTruthy();
  fireEvent.press(screen.getByLabelText(dict.cortiTab.bDay7));
  expect(screen.getByText(dict.cortiTab.locked)).toBeTruthy();
  expect(screen.getByText(new RegExp(dict.cortiTab.bDay7H))).toBeTruthy();
});

it('un geste rapporte des points de dopamine sous les yeux, puis le premier badge', async () => {
  render(<CortiTab onScroll={noop} />);
  await screen.findByText(dict.stats.reelsAvoided);
  fireEvent.press(screen.getAllByRole('checkbox')[0]);
  // Les points d'abord, sans fenetre : le gain se pose sous la jauge, avec
  // les points de l'objectif du jour — pas les memes pour tous.
  const pts = CARE_POINTS[careOfTheDay()];
  expect(await screen.findByText(interpolate(dict.cortiTab.gainTitle, { n: pts }))).toBeTruthy();
  // Puis le badge « premier geste », debloque par ce geste — lui a sa fenetre.
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
