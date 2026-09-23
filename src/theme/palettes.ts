import { colors as dark } from './colors';

/**
 * Les deux jeux de couleurs.
 *
 * Le clair n'est pas le sombre inverse : sur fond blanc, un accent pastel
 * disparait. Les accents y sont donc plus profonds, et les filets plus
 * francs, pour garder le meme contraste percu.
 */
// Les valeurs du jeu sombre sont des litteraux (`as const`) : sans cette
// generalisation, aucune autre couleur ne serait assignable.
export type Palette = { [K in keyof typeof dark]: string };

export const light: Palette = {
  ...dark,
  night: '#F6F5F2',        // fond, presque blanc
  surface: '#FFFFFF',      // cartes
  surfaceHi: '#EFEDE8',    // cartes en relief
  line: '#0000000F',       // filet 6 %
  lineStrong: '#00000022',
  mist: '#16181D',         // texte principal
  sun: '#000000',          // action principale
  accent: '#4B63D8',       // bleu profond : lisible sur blanc
  accentDeep: '#6B4FD8',   // violet
  accentWarm: '#C2568E',   // rose soutenu
  screenGlow: '#4B63D8',
  accentSoft: '#4B63D81A',
  accentFaint: '#4B63D80D',
  ground: '#FFFFFF',
};

export const palettes = { dark, light } as const;
export type ThemeName = 'system' | 'light' | 'dark';
