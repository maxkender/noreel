/**
 * La visite d'un onglet : une fois, puis plus jamais — sauf si on la redemande.
 * Elle eclaire les vrais elements ; sans eux (ici, rien n'est monte), elle
 * dit quand meme chaque etape, carte seule, et saute celles qui sont en option.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { dict } from '@/i18n';
import { TabTour } from './Tours';
import { markTourSeen, resetTours, tourSeen } from './tourSeen';

jest.mock('react-native-device-activity', () => ({}));
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
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn() }),
  useFocusEffect: (fn: () => void) => fn(),
}));

it('se joue la premiere fois sur Applis, et se retient', async () => {
  await resetTours();
  const onDone = jest.fn();
  render(<TabTour tab="home" onDone={onDone} />);
  expect(await screen.findByText(dict.tour.h1, {}, { timeout: 3000 })).toBeTruthy();
  fireEvent.press(screen.getByTestId('story-home-next'));
  expect(await screen.findByText(dict.tour.h2, {}, { timeout: 3000 })).toBeTruthy();
  // L'etape du badge est en option : sans badge, on passe a la suivante.
  fireEvent.press(screen.getByTestId('story-home-next'));
  expect(await screen.findByText(dict.tour.h4, {}, { timeout: 3000 })).toBeTruthy();
  fireEvent.press(screen.getByText(dict.tuto.skip));
  expect(onDone).toHaveBeenCalledTimes(1);
  await waitFor(async () => expect(await tourSeen('home')).toBe(true));
});

it('ne revient pas une fois vue, et rien sur le compte', async () => {
  await resetTours();
  await markTourSeen('corti');
  const r = render(<TabTour tab="corti" onDone={() => {}} />);
  await waitFor(() => expect(screen.queryByText(dict.tour.c1)).toBeNull());
  r.unmount();
  render(<TabTour tab="account" onDone={() => {}} />);
  expect(screen.queryByTestId(/tour-/)).toBeNull();
});

it('se rejoue quand on le demande', async () => {
  await markTourSeen('corti');
  render(<TabTour tab="corti" replay={{ id: 'corti', n: 1 }} onDone={() => {}} />);
  expect(await screen.findByText(dict.tour.c1, {}, { timeout: 3000 })).toBeTruthy();
});
