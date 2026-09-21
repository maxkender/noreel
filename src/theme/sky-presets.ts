import { toRgb01 } from './colors';

export type SkyPreset = {
  zenith: [number, number, number];
  horizon: [number, number, number];
  sun: [number, number, number];
  glow: [number, number, number];
  horizonY: number;
  sunrise: number;
  glowAmt: number;
  energy: number;
};

const SUN = toRgb01('#FFB37D');
const GLOW = toRgb01('#8FB8FF');

const p = (
  zenith: string, horizon: string,
  horizonY: number, sunrise: number, glowAmt: number, energy: number,
  sun: string = '#FFB37D'
): SkyPreset => ({
  zenith: toRgb01(zenith),
  horizon: toRgb01(horizon),
  sun: toRgb01(sun),
  glow: GLOW,
  horizonY, sunrise, glowAmt, energy,
});

/** §4.2 — valeurs de départ, à affiner à l'œil dans le playground. */
export const skyPresets = {
  introChaos: p('#05060F', '#0B0D1F', 0.46, 0,    0.9,  1),
  welcome:    p('#0B0D1F', '#2A2458', 0.46, 0.35, 0,    0.1),
  explain:    p('#0E1030', '#3A2F6B', 0.90, 0.40, 0.15, 0.15),
  lateNight:  p('#04050C', '#0B0D1F', 1.05, 0,    0.75, 0.6),
  firstLight: p('#121538', '#6B4A8A', 0.88, 0.55, 0,    0.05),
  input:      p('#0E1030', '#3A2F6B', 0.90, 0.35, 0.15, 0.2),
  lifeGrid:   p('#07081A', '#1C1B3F', 0.92, 0.20, 0.35, 0.2),
  fog:        p('#14151F', '#3B3D4F', 0.90, 0.30, 0,    0.2, '#C9B8A8'),
  rose:       p('#1A0F2E', '#7A3B6E', 0.88, 0.70, 0,    0.05),
  morning:    p('#1B2352', '#8C6AA8', 0.86, 0.85, 0,    0.05),
  homeNight:  p('#0B0D1F', '#242150', 0.84, 0.10, 0,    0.05),
  homeDawn:   p('#1E2A5E', '#E58FA0', 0.84, 0.75, 0,    0.05),
  homeDay:    p('#1F4FC2', '#6FA6F2', 0.84, 1.00, 0,    0.05, '#FFE2B8'),
  homeDusk:   p('#2A1F5C', '#F08A6C', 0.84, 0.60, 0,    0.05),
} satisfies Record<string, SkyPreset>;

export type SkyPresetName = keyof typeof skyPresets;

/** La Home suit l'heure locale (§8). */
export function presetForHour(hour: number): SkyPresetName {
  if (hour >= 5 && hour < 9) return 'homeDawn';
  if (hour >= 9 && hour < 17) return 'homeDay';
  if (hour >= 17 && hour < 21) return 'homeDusk';
  return 'homeNight';
}

export { SUN, GLOW };
