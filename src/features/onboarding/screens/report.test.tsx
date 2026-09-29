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
