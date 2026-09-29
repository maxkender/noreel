/**
 * L'estimation est ecrite AVANT que la vue d'Apple existe.
 *
 * L'extension lit le groupe partage au moment ou iOS lui demande son dessin,
 * c'est-a-dire des que la vue est montee. Ecrire apres, c'etait courir
 * contre elle — et perdre revenait a comparer le vrai chiffre a zero. Ce
 * test fixe l'ordre : d'abord l'ecriture, ensuite la vue.
 */
import { render } from '@testing-library/react-native';
import { Analysis, Compare } from './time';
import { S6, S6Years } from './index';

const mockOrder: string[] = [];

jest.mock('react-native-device-activity', () => ({}));

// Le magasin d'Apple n'existe pas dans un test : l'ecran l'importe par les
// services, et sa dependance n'est pas transpilee par Jest.
jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: { configure: jest.fn(), setLogLevel: jest.fn() },
  LOG_LEVEL: { WARN: 'WARN' },
}));

jest.mock('@/services/shield.real', () => ({
  ...jest.requireActual('@/services/shield.real'),
  authorizationStatus: () => Promise.resolve('approved'),
}));

jest.mock('@/native/screenTimeReport', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    REPORT_ENABLED: true,
    reportAvailable: () => true,
    prepareReport: (guess: number) => { mockOrder.push(`prepare:${guess}`); },
    ScreenTimeReportView: ({ context }: { context: string }) => {
      mockOrder.push(`view:${context}`);
      return React.createElement(View, { testID: `report-${context}` });
    },
  };
});

const noop = () => {};

beforeEach(() => { mockOrder.length = 0; });

it('la comparaison ecrit l’estimation, puis monte la vue', async () => {
  const r = render(<Compare onNext={noop} />);
  await r.findByTestId('report-compare');
  expect(mockOrder[0]).toBe('prepare:150');
  expect(mockOrder.indexOf('view:compare')).toBeGreaterThan(0);
});

it('l’analyse fait de meme', async () => {
  const r = render(<Analysis onNext={noop} />);
  await r.findByTestId('report-overview');
  expect(mockOrder[0]).toBe('prepare:150');
  expect(mockOrder.indexOf('view:overview')).toBeGreaterThan(0);
});

it('la part de la journee attend la fin du titre, puis monte la grille d’Apple', async () => {
  const r = render(<S6 onNext={noop} />);
  // Le titre s'ecrit d'abord : la grille n'arrive qu'apres, comme en JavaScript.
  await r.findByTestId('report-share', {}, { timeout: 6000 });
  expect(mockOrder[0]).toBe('prepare:150');
  // L'ecran garde un compte a rebours pour liberer le bouton : on le demonte,
  // sinon Jest attend un minuteur que personne ne regarde plus.
  r.unmount();
}, 8000);

it('les annees qu’il reste se dessinent chez Apple', async () => {
  const r = render(<S6Years onNext={noop} />);
  await r.findByTestId('report-years');
  expect(mockOrder[0]).toBe('prepare:150');
});
