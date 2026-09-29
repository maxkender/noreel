/**
 * La comparaison ne se montre que si la realite depasse l'estimation.
 * Quand on a vu plus grand que le vrai chiffre, il n'y a rien a apprendre.
 */
import { render, screen } from '@testing-library/react-native';
import { dict } from '@/i18n';
import { Compare, shouldCompare } from './time';
import { useOnboardingStore } from '@/store/onboarding';

jest.mock('react-native-device-activity', () => ({}));
jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: { configure: jest.fn(), setLogLevel: jest.fn() },
  LOG_LEVEL: { WARN: 'WARN' },
}));

it('compare seulement quand la realite depasse l’estimation', () => {
  expect(shouldCompare(150, 300)).toBe(true);
  expect(shouldCompare(150, 150)).toBe(true);
  expect(shouldCompare(300, 150)).toBe(false);
});

it('demande d’abord le vrai chiffre, puis passe si on surestimait', () => {
  useOnboardingStore.setState({ minutesPerDay: 300, realMinutes: undefined });
  const onNext = jest.fn();
  render(<Compare onNext={onNext} />);
  expect(screen.getByText(dict.time.realTitle)).toBeTruthy();
  expect(onNext).not.toHaveBeenCalled();

  // Saisi : deux heures et demie, en dessous des cinq heures estimees.
  useOnboardingStore.setState({ realMinutes: 150 });
  const r2 = render(<Compare onNext={onNext} />);
  expect(onNext).toHaveBeenCalled();
  r2.unmount();
  useOnboardingStore.setState({ minutesPerDay: 150, realMinutes: undefined });
});

it('montre la scene quand la realite depasse', () => {
  useOnboardingStore.setState({ minutesPerDay: 150, realMinutes: 300 });
  const onNext = jest.fn();
  const r = render(<Compare onNext={onNext} />);
  expect(screen.getByText(dict.time.guessLabel)).toBeTruthy();
  expect(screen.getByText(dict.time.realLabel)).toBeTruthy();
  expect(onNext).not.toHaveBeenCalled();
  r.unmount();
  useOnboardingStore.setState({ realMinutes: undefined });
});
