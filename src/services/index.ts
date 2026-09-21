import type { AnalyticsEvent } from './types';
import {
  mockFilteredApps, mockHomeScreen, mockShield, mockStats,
} from './mocks';
import { FAMILY_CONTROLS_ENABLED, realShield } from './shield.real';

// Point d'injection unique : on remplacera ces lignes par les vraies
// implémentations sans toucher au reste du code.
export const filteredApps = mockFilteredApps;
export const homeScreen = mockHomeScreen;
// Bascule automatiquement sur le vrai blocage quand l'entitlement est present.
export const shield = FAMILY_CONTROLS_ENABLED ? realShield : mockShield;
export const stats = mockStats;

export function track(event: AnalyticsEvent, props?: Record<string, unknown>): void {
  if (__DEV__) console.log(`[track] ${event}`, props ?? '');
}

export * from './types';

export { FAMILY_CONTROLS_ENABLED } from './shield.real';
