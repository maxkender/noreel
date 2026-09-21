import { Platform } from 'react-native';
import type {
  FilteredAppsService, HomeScreenService, ShieldService, StatsService, SocialApp,
} from '../types';

export type MockProfile = 'day1' | 'day30';
let profile: MockProfile = 'day30';
export const setMockProfile = (p: MockProfile) => { profile = p; };
export const getMockProfile = () => profile;

export const mockFilteredApps: FilteredAppsService = {
  async open(app: SocialApp) {
    console.log(`[mock] ouvrirait la version NoReel de ${app}`);
  },
};

export const mockHomeScreen: HomeScreenService = {
  canPinNatively: () => Platform.OS === 'android',
  async add() {
    // iOS n'expose aucune API d'épinglage : on guidera l'utilisateur (§5.6).
    return Platform.OS === 'android' ? 'added' : 'guided';
  },
};

let shieldActive = true;
export const mockShield: ShieldService = {
  async isActive() { return shieldActive; },
  async setActive(v) { shieldActive = v; },
};

/** Journée pseudo-aléatoire mais stable : le même jour donne toujours la même valeur. */
const seeded = (i: number, max: number) => {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return Math.floor((x - Math.floor(x)) * max);
};

export const mockStats: StatsService = {
  async today() {
    return profile === 'day1'
      ? { reclaimedMinutes: 0, goalMinutes: 120 }
      : { reclaimedMinutes: 102, goalMinutes: 120 };
  },
  async week() {
    return profile === 'day1'
      ? [0, 0, 0, 0, 0, 0, 0]
      : [88, 121, 64, 140, 97, 35, 102];
  },
  async year() {
    const days = Math.ceil((Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 864e5);
    return Array.from({ length: days }, (_, i) =>
      profile === 'day1' ? 0 : (i < days - 30 ? 0 : seeded(i, 150))
    );
  },
  async reelsAvoidedThisWeek() { return profile === 'day1' ? 0 : 127; },
  async streakDays() { return profile === 'day1' ? 0 : 4; },
};
