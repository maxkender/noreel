import type { AnalyticsEvent } from './types';
import {
  mockFilteredApps, mockHomeScreen, mockShield, mockStats,
} from './mocks';

// Point d'injection unique : on remplacera ces lignes par les vraies
// implémentations sans toucher au reste du code.
export const filteredApps = mockFilteredApps;
export const homeScreen = mockHomeScreen;
export const shield = mockShield;
export const stats = mockStats;

export function track(event: AnalyticsEvent, props?: Record<string, unknown>): void {
  if (__DEV__) console.log(`[track] ${event}`, props ?? '');
}

export * from './types';
