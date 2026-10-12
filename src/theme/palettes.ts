import { colors as dark } from './colors';

/**
 * Les deux jeux de couleurs.
 *
 * Le clair n'est pas le sombre inverse : sur fond blanc, un accent pastel
 * disparait. Les accents y sont donc plus profonds, et les filets plus
 * francs, pour garder le meme contraste percu.
 */
// Les valeurs du jeu sombre sont des litteraux (`as const`) : sans cette
// generalisation, aucune autre valeur ne serait assignable. Les reglages
// numeriques (doses de halo, d'ombre) gardent leur type.
export type Palette = {
  [K in keyof typeof dark]: (typeof dark)[K] extends number ? number : string;
};

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

  // Sur le creme, une carte doit etre PLUS CLAIRE que la page pour flotter.
  // Diluer le texte, comme on le fait sur le noir, la creusait.
  glassFill: '#FFFFFFB8',   // blanc 72 % : la carte se souleve
  glassSolid: '#FFFFFFF7',
  glassEdge: '#00000014',   // noir 8 % : un bord se pose, il ne cerne pas
  glassSpec: '#FFFFFFF2',   // un reflet reste plus clair que sa surface
  glassWarm: '#C98A3C59',   // le lisere de la marque, chaud sur les deux fonds
  glassTint: '#F3F1EA',     // creme : la meme feuille, sur fond clair
  control: '#FFFFFF',
  // Une ombre noire sur du creme fait une tache grise ; celle-ci est du
  // brun chaud, tres legere, comme une vraie ombre sur du papier.
  shadowTint: '#6B5E45',
  shadowAlpha: 0.1,
  glowAlpha: 0.4,
  // 0,76 et 0,52 : mesures pour rendre 7,1:1 et 3,4:1 sur le creme, soit
  // exactement ce que 0,60 et 0,38 rendent sur le noir.
  textSecondary: 0.76,
  textTertiary: 0.52,
  // Pas de poussiere lumineuse sur fond clair : la meme poussiere y devient
  // une constellation de points noirs, autrement dit de la salete.
  dustAlpha: 0,
};

export const palettes = { dark, light } as const;
export type ThemeName = 'system' | 'light' | 'dark';
