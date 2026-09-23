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
  // Un fond creme, pas du blanc pur : le blanc pur sur un ecran de telephone
  // fatigue l'oeil, surtout le soir, et fait ressortir chaque bord.
  night: '#EFEDE7',        // fond
  surface: '#F8F6F1',      // cartes
  surfaceHi: '#E4E1D9',    // cartes en relief
  line: '#00000012',       // filet 7 %
  lineStrong: '#00000026',
  mist: '#1A1C21',         // texte principal
  sun: '#111318',          // action principale
  accent: '#3F57C9',       // bleu profond : lisible sur creme
  accentDeep: '#6046C4',   // violet
  accentWarm: '#B04B82',   // rose soutenu
  screenGlow: '#3F57C9',
  accentSoft: '#3F57C918',
  accentFaint: '#3F57C90A',
  danger: '#C0392F',       // le rouge sombre tient sur fond clair
  ember: '#C2611E',
  ground: '#F8F6F1',
};

export const palettes = { dark, light } as const;
export type ThemeName = 'system' | 'light' | 'dark';
