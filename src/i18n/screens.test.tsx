/**
 * Les ecrans qui portent le plus de texte se MONTENT dans chaque langue.
 *
 * La parite des cles dit qu'une phrase existe ; elle ne dit pas qu'un ecran
 * la supporte. Une variable oubliee, un pluriel a deux formes mal ecrit, une
 * chaine qui n'est pas une chaine : c'est au rendu que ca tombe, et c'est ici
 * qu'on le voit avant TestFlight.
 */
import { render, screen } from '@testing-library/react-native';
import { LANGS } from '@/lib/format';
import { useLang } from '@/store/lang';
import { dictOf, interpolate } from '@/i18n';
import { Language } from '@/features/onboarding/screens/Language';
import { Paywall } from '@/features/onboarding/screens/Paywall';
import { TrialBell, TrialGift } from '@/features/onboarding/screens/Trial';
import { RateAsk } from '@/features/onboarding/screens/extra';
import { PromiseScreen } from '@/features/onboarding/screens/setup';
import { LifeYears } from '@/features/onboarding/screens/index';
import { TabTour } from '@/features/home/Tours';
import { resetTours } from '@/features/home/tourSeen';

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
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn() }),
  useFocusEffect: (fn: () => void) => fn(),
}));

const noop = () => {};

afterAll(() => { useLang.getState().set('fr'); });

describe.each(LANGS)('en %s', (lang) => {
  beforeEach(() => { useLang.getState().set(lang); });
  const d = dictOf(lang);

  it('le choix de la langue, avec le titre dans la langue', () => {
    render(<Language onNext={noop} />);
    expect(screen.getByText(d.ob.langTitle)).toBeTruthy();
  });

  it('le cadeau et la cloche', () => {
    render(<TrialGift onNext={noop} />);
    expect(screen.getByText(d.trial.giftTitle)).toBeTruthy();
    render(<TrialBell onNext={noop} />);
    expect(screen.getByText(d.trial.bellTitle)).toBeTruthy();
  });

  it('le paywall', () => {
    const r = render(<Paywall onDone={noop} />);
    expect(r.toJSON()).toBeTruthy();
    r.unmount();
  });

  it('la promesse, avec le 5 en chiffres', () => {
    render(<PromiseScreen onNext={noop} />);
    expect(d.ob.promiseSelf).toMatch(/\b5\b/);
    expect(d.ob.promiseNamed).toMatch(/\b5\b/);
  });

  it('les etoiles et les annees', () => {
    render(<RateAsk onNext={noop} />);
    const r = render(<LifeYears onNext={noop} />);
    r.unmount();
  });

  it('la visite guidee, dans la langue', async () => {
    await resetTours();
    // Seul l'accueil lance sa visite de lui-meme : celle du blocage se rejoue.
    render(<TabTour tab="block" replay={{ id: 'block', n: 1 }} onDone={noop} />);
    expect(await screen.findByText(d.tour.b1, {}, { timeout: 3000 })).toBeTruthy();
  });

  it('les phrases a variables se remplissent sans laisser d’accolade', () => {
    const sample = { n: 3, m: 2, y: 4, h: '3 h', p: 42, i: 1, a: 10, b: 20, total: 9, age: 24, name: 'Max', lived: 1, lost: 2, ahead: 3, what: 'x', duration: 'y', level: 'z', app: 'Instagram', email: 'a@b.c', who: 'Moi', from: 20, to: 21, day: 'Lundi', life: 80, waking: 16, accent: 'w', s: 's' };
    const flat = (node: unknown, p = ''): [string, string][] => {
      if (typeof node === 'string') return [[p, node]];
      if (node === null || typeof node !== 'object' || Array.isArray(node)) return [];
      return Object.entries(node as Record<string, unknown>).flatMap(([k, v]) => flat(v, p ? `${p}.${k}` : k));
    };
    // Les mots mis en valeur ({algorithme}) restent entre accolades : seules les variables connues comptent.
    const left = flat(d)
      .map(([k, v]) => [k, interpolate(v, sample)] as const)
      .filter(([, v]) => /\{(n|m|y|h|p|i|a|b|total|age|name|lived|lost|ahead|what|duration|level|app|email|who|from|to|day|life|waking|accent|s)[:}]/.test(v))
      .map(([k]) => k);
    expect(left).toEqual([]);
  });
});
