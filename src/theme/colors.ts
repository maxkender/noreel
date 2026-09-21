/**
 * Noir, technique, sobre. Un seul accent froid ; le blanc porte l'action.
 * Aucune couleur chaude : c'est ce qui donnait le cote "coucher de soleil".
 */
export const colors = {
  night: '#08090B',        // fond, presque noir
  surface: '#101216',      // cartes
  surfaceHi: '#16191F',    // cartes en relief
  line: '#FFFFFF14',       // filet 8 %
  lineStrong: '#FFFFFF24',
  mist: '#FAFAFA',         // texte principal
  sun: '#FFFFFF',          // action principale (blanc plein)
  accent: '#6E8BFF',       // donnees, etats actifs
  screenGlow: '#6E8BFF',   // temps perdu
  dawn: '#3A3F4B',         // deja vecu, neutre
  haze: '#8B92A5',
  fog: '#6B7280',
  ground: '#000000',
} as const;

export const textAlpha = { primary: 1, secondary: 0.6, tertiary: 0.38 } as const;

export const withAlpha = (hex: string, alpha: number): string => {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255).toString(16).padStart(2, '0');
  return `${hex.slice(0, 7)}${a}`;
};

export const toRgb01 = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1, 7), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
