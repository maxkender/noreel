/**
 * La devise du magasin, partout — et le total facture avant la mensualite.
 *
 * Google a refuse l'app le 20 octobre 2026 : aux Philippines, l'examinateur
 * lisait « 195,83 € / mois » a cote de « Facture 2 350 ₱ par an ». La
 * mensualite etait calculee ici et toujours suivie de « € », et elle etait
 * affichee en GROS, le vrai montant en petit. Ce test rejoue son ecran.
 */
import { act, render, screen } from '@testing-library/react-native';
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

const pack = (identifier: string, price: number, priceString: string, perMonth: string) => ({
  identifier,
  product: {
    price, priceString, currencyCode: 'PHP', pricePerMonthString: perMonth,
    introPrice: { price: 0 },
  },
});

jest.mock('@/services/purchases', () => ({
  PURCHASES_ENABLED: true,
  appUserId: () => Promise.resolve(null),
  buy: jest.fn(),
  redeemCode: jest.fn(),
  currentOffering: () => Promise.resolve({
    offering: {
      availablePackages: [
        pack('$rc_annual', 2350, '₱2,350.00', '₱195.83'),
        pack('$rc_monthly', 625, '₱625.00', '₱625.00'),
      ],
    },
    fail: null,
  }),
}));

it('affiche tout en pesos, et le total annuel en premier', async () => {
  render(<Paywall onDone={() => {}} exitDelay={0} />);
  await act(async () => { await Promise.resolve(); });

  // Plus un seul euro a l'ecran quand le magasin parle en pesos.
  expect(screen.queryAllByText(/€/)).toHaveLength(0);

  // Le forfait annuel montre le montant FACTURE, la mensualite en dessous.
  expect(screen.getByText(dict.pay.perYear.replace('{p}', '₱2,350.00'))).toBeTruthy();
  expect(screen.getByText(`≈ ${dict.pay.perMonth.replace('{p}', '₱195.83')}`)).toBeTruthy();
});
