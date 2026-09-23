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

  /*
   * La lumiere, nommee pour son ROLE et non pour sa couleur.
   *
   * Ces valeurs se deduisaient jusqu'ici de `mist` (le texte) et de `sun`
   * (l'action). Sur fond noir cela marchait par coincidence : le texte y est
   * presque blanc, donc « mist tres dilue » donnait bien une vitre. Sur fond
   * creme le texte devient presque noir, et chaque reflet s'inversait en
   * salissure — le verre s'enfoncait au lieu de flotter, et le lisere chaud
   * de la marque virait au trait noir.
   */
  glassFill: '#FAFAFA12',   // la vitre elle-meme
  glassSolid: '#16191FF5',  // sa version opaque, sans flou
  glassEdge: '#FAFAFA2E',   // son bord
  glassSpec: '#FAFAFA73',   // le reflet du ciel, 1 pt en haut
  glassWarm: '#FFFFFF8C',   // le lisere chaud, du cote du soleil
  control: '#FAFAFA',       // le pouce des interrupteurs
  shadowTint: '#000000',
  shadowAlpha: 0.35,
  /** Multiplicateurs : le fond clair ne supporte pas la meme dose. */
  glowAlpha: 1,
  dustAlpha: 1,
  /*
   * L'opacite des deux tons secondaires, par palette.
   *
   * Une meme opacite ne donne pas le meme contraste des deux cotes : blanc
   * a 38 % sur du presque-noir rend 3,4:1, noir a 38 % sur du creme n'en
   * rend que 2,3. Le mode clair paraissait delave pour cette seule raison —
   * ce n'etait pas la teinte, c'etait la dose. Les valeurs claires sont
   * calculees pour retomber sur les memes rapports.
   */
  textSecondary: 0.6,
  textTertiary: 0.38,
} as const;

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
