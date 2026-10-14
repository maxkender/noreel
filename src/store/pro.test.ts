/**
 * Le code d'acces des examinateurs : le bon code ouvre Pro, un mauvais non,
 * et l'ouverture survit a un redemarrage sans etre ecrasee par RevenueCat.
 */
const mockMemory = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (k: string) => mockMemory.get(k) ?? null),
  setItem: jest.fn(async (k: string, v: string) => { mockMemory.set(k, v); }),
}));

let mockListener: ((pro: boolean) => void) | null = null;
jest.mock('@/services/purchases', () => ({
  PURCHASES_ENABLED: true,
  initPurchases: jest.fn(async () => {}),
  customerInfo: jest.fn(async () => ({})),
  isPro: jest.fn(() => false),
  syncOwned: jest.fn(async () => false),
  restore: jest.fn(async () => false),
  onCustomerInfo: jest.fn((fn: (pro: boolean) => void) => { mockListener = fn; return () => {}; }),
}));

function load() {
  let mod: typeof import('./pro') | undefined;
  jest.isolateModules(() => { mod = require('./pro'); });
  return mod!.useProStore;
}

describe('review access code', () => {
  beforeEach(() => {
    mockMemory.clear();
    mockListener = null;
    process.env.EXPO_PUBLIC_REVIEW_CODE = 'TEST-CODE-42';
  });

  it('rejects a wrong code and keeps the app locked', async () => {
    const store = load();
    expect(await store.getState().unlockReview('nope')).toBe(false);
    expect(store.getState().pro).toBe(false);
  });

  it('opens Pro with the right code, ignoring case and spaces', async () => {
    const store = load();
    expect(await store.getState().unlockReview(' test-code-42 ')).toBe(true);
    expect(store.getState().pro).toBe(true);
  });

  it('stays open after a restart, even when RevenueCat reports no subscription', async () => {
    await load().getState().unlockReview('TEST-CODE-42');
    const store = load();
    await store.getState().start();
    expect(store.getState().pro).toBe(true);
    mockListener?.(false);
    expect(store.getState().pro).toBe(true);
  });

  it('opens nothing when no code is configured', async () => {
    process.env.EXPO_PUBLIC_REVIEW_CODE = '';
    const store = load();
    expect(await store.getState().unlockReview('')).toBe(false);
    expect(await store.getState().unlockReview('TEST-CODE-42')).toBe(false);
    expect(store.getState().pro).toBe(false);
  });
});
