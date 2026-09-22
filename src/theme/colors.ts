/**
 * Noir, technique, sobre. L'accent vient du logo : un iris qui va du bleu
 * glace au lavande puis au rose. Les trois teintes sont echantillonnees
 * directement dans la marque, pour que l'app et l'icone soient la meme
 * chose.
 */
export const colors = {
  night: '#08090B',        // fond, presque noir
  surface: '#101216',      // cartes
  surfaceHi: '#16191F',    // cartes en relief
  line: '#FFFFFF14',       // filet 8 %
  lineStrong: '#FFFFFF24',
  mist: '#FAFAFA',         // texte principal
  sun: '#FFFFFF',          // action principale (blanc plein)
  accent: '#A8D8FC',       // bleu glace : donnees, etats actifs
  accentDeep: '#B9C0F5',   // lavande : milieu de l'iris
  accentWarm: '#F5CFD8',   // rose : fin de l'iris, degrades seulement
  screenGlow: '#A8D8FC',   // temps perdu
  dawn: '#3A3F4B',         // deja vecu, neutre
  haze: '#8B92A5',
  fog: '#6B7280',
  accentSoft: '#B9C0F52E',   // halo haut, tres dilue
  accentFaint: '#B9C0F512',
  danger: '#FF5A5F',       // le temps perdu, uniquement ici
  ember: '#FF8A4C',        // orange : le halo des deux ecrans qui pesent
  ground: '#000000',
} as const;

export const textAlpha = { primary: 1, secondary: 0.6, tertiary: 0.38 } as const;

export const withAlpha = (hex: string, alpha: number): string => {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255).toString(16).padStart(2, '0');
  return `${hex.slice(0, 7)}${a}`;
};

/**
 * Melange deux couleurs. Sert a reconstituer la couleur REELLE du fond a un
 * endroit donne : le fond n'est pas le noir pur, c'est le noir plus le halo.
 * Un voile en noir pur se voyait donc comme une tache.
 */
export const blend = (a: string, b: string, t: number): string => {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [r1, g1, b1] = p(a);
  const [r2, g2, b2] = p(b);
  const c = (x: number, y: number) =>
    Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
  return `#${c(r1, r2)}${c(g1, g2)}${c(b1, b2)}`;
};

export const toRgb01 = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1, 7), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
