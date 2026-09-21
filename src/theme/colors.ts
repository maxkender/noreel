/**
 * « De l'écran à l'horizon ».
 * Froid = temps perdu. Chaud = temps récupéré. Cette règle ne souffre aucune exception :
 * screenGlow ne sert QUE à ce qui te vole du temps, sun QU'à ce que tu récupères.
 */
export const colors = {
  night: '#0B0D1F',
  screenGlow: '#8FB8FF',
  sun: '#FFB37D',
  dawn: '#F4A0B5',
  haze: '#9D95E8',
  mist: '#EEF0FA',
  fog: '#7E8299',
  ground: '#070814',
} as const;

/** Opacités du texte. Jamais d'autre valeur : c'est ce qui tient le contraste 4,5:1. */
export const textAlpha = { primary: 1, secondary: 0.68, tertiary: 0.44 } as const;

export const withAlpha = (hex: string, alpha: number): string => {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
};

/** #RRGGBB -> [r, g, b] en 0–1, pour les uniforms du shader. */
export const toRgb01 = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
